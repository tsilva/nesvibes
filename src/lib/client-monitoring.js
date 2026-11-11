const maximumStartupErrors = 50;

export function createClientMonitoring({ scope, options, loadSdk }) {
  const startupErrors = [];
  let sdk;
  let errorHandler;
  let loading;

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
      if (options) module.init(options);
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

  function handleError(input) {
    if (errorHandler) return errorHandler(input);
    return init().then((module) => {
      if (module) return errorHandler(input);
      if (!input.kind || input.kind === "unknown") scope.console.error(input.error);
    });
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
