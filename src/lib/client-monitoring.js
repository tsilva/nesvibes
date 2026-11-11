const maximumStartupErrors = 50;

export function createClientMonitoring({ scope, options, loadSdk, recoverModule }) {
  const startupErrors = [];
  let sdk;
  let errorHandler;
  let loading;
  const recoveries = new WeakMap();

  function recover(error) {
    if (!recoverModule || !error || typeof error !== "object") return Promise.resolve(false);
    let pending = recoveries.get(error);
    if (!pending) {
      pending = recoverModule(error);
      recoveries.set(error, pending);
    }
    return pending;
  }

  // SvelteKit loads the root layout before its hydration error boundary. Keep
  // recovery active after the SDK takes ownership of ordinary global errors.
  if (recoverModule) scope.addEventListener("unhandledrejection", event => { void recover(event.reason); });

  async function beforeSend(event, hint) {
    const recovery = hint?.originalException && recoveries.get(hint.originalException);
    if (recovery && await recovery) {
      event = { ...event, tags: { ...event.tags, recovery: "root-module-update" },
        exception: event.exception && { ...event.exception,
          values: event.exception.values?.map(value => ({ ...value,
            mechanism: { ...value.mechanism, handled: true },
          })),
        },
      };
    }
    return options?.beforeSend ? options.beforeSend(event, hint) : event;
  }

  function capture(error, hint) {
    if (!options?.enabled) return;
    if (sdk) {
      sdk.captureException(error, hint);
      return;
    }
    if (startupErrors.length < maximumStartupErrors &&
        !startupErrors.some((entry) => entry.error === error)) {
      startupErrors.push({ error, hint });
    }
  }

  function captureWindowError(event) {
    if (!event.error && !event.message) return;
    capture(event.error ?? event.message, {
      mechanism: { type: "auto.browser.global_handlers.onerror", handled: false },
    });
  }

  function captureRejection(event) {
    capture(event.reason, {
      mechanism: { type: "auto.browser.global_handlers.onunhandledrejection", handled: false },
    });
  }

  if (options?.enabled) {
    scope.addEventListener("error", captureWindowError);
    scope.addEventListener("unhandledrejection", captureRejection);
  }

  function init() {
    if (sdk) return Promise.resolve(sdk);
    loading ??= Promise.resolve().then(loadSdk).then((module) => {
      if (options) module.init(recoverModule ? { ...options, beforeSend } : options);
      errorHandler = module.handleErrorWithSentry();
      sdk = module;
      scope.removeEventListener("error", captureWindowError);
      scope.removeEventListener("unhandledrejection", captureRejection);
      for (const entry of startupErrors.splice(0)) {
        sdk.captureException(entry.error, entry.hint);
      }
      return sdk;
    }).catch(() => {
      loading = undefined;
      scope.console.warn("Could not initialize Sentry browser monitoring.");
      return null;
    });
    return loading;
  }

  function reportError(input) {
    if (errorHandler) return errorHandler(input);
    return init().then((module) => {
      if (module) return errorHandler(input);
      if (!input.kind || input.kind === "unknown") scope.console.error(input.error);
    });
  }

  function handleError(input) {
    if (!recoverModule) return reportError(input);
    return recover(input.error).then(recovered => recovered
      ? { message: "Loading the latest version…" }
      : reportError(input));
  }

  scope.__sentryTest = () => {
    const error = new Error(`Sentry smoke test [${new Date().toISOString()}]`);
    if (options?.enabled) {
      capture(error);
    } else {
      scope.console.warn("Sentry is disabled; throwing without capture.");
    }
    throw error;
  };

  return { init, handleError };
}
