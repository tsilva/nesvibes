import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://e89641f444a8cc812adbd006e4de56ca@o4511061698478080.ingest.de.sentry.io/4511077618024528',

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});