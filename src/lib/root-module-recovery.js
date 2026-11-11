const recoveryKey = "nesvibes.root-module-recovery";

// Node zero is the root layout. A document that has already hydrated has this
// module cached, so this recovery cannot reload a running emulator on preload.
export function createRootModuleRecovery({ scope, version, checkForUpdate }) {
  let pending;
  let attempted = false;

  function isRootModuleFailure(error) {
    if (error?.name !== "TypeError") return false;
    const match = /^Failed to fetch dynamically imported module: (https?:\/\/\S+)$/.exec(error.message);
    if (!match) return false;
    try {
      const url = new URL(match[1]);
      return url.origin === scope.location.origin &&
        /^\/_app\/immutable\/nodes\/0\.[A-Za-z0-9_-]+\.js$/.test(url.pathname);
    } catch { return false; }
  }

  async function recover() {
    let timer;
    try {
      // Durable across a failed reload; blocked storage means no automatic retry.
      if (!version || scope.sessionStorage.getItem(recoveryKey) === version) return false;
      const updated = await Promise.race([
        Promise.resolve().then(checkForUpdate),
        new Promise(resolve => { timer = scope.setTimeout(() => resolve(false), 2000); }),
      ]);
      if (updated !== true) return false;
      scope.sessionStorage.setItem(recoveryKey, version);
      attempted = true;
      scope.location.reload();
      return true;
    } catch { return false; }
    finally { if (timer !== undefined) scope.clearTimeout(timer); }
  }

  return function recoverRootModule(error) {
    if (attempted || !isRootModuleFailure(error)) return Promise.resolve(false);
    pending ??= recover().finally(() => { pending = undefined; });
    return pending;
  };
}
