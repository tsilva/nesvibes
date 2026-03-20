import { env } from "$env/dynamic/public";

const GOOGLE_ANALYTICS_URL = "https://www.googletagmanager.com/gtag/js";

let configuredMeasurementId = null;

function getMeasurementId() {
  const measurementId = env.PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
  return measurementId ? measurementId : null;
}

function getGtag() {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args) {
      window.dataLayer.push(args);
    };

  return window.gtag;
}

function injectGoogleAnalyticsScript(measurementId) {
  if (document.querySelector(`script[data-google-analytics="${measurementId}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `${GOOGLE_ANALYTICS_URL}?id=${encodeURIComponent(measurementId)}`;
  script.dataset.googleAnalytics = measurementId;
  document.head.append(script);
}

export function initGoogleAnalytics() {
  const measurementId = getMeasurementId();

  if (!measurementId || typeof window === "undefined") {
    return false;
  }

  injectGoogleAnalyticsScript(measurementId);

  if (configuredMeasurementId === measurementId) {
    return true;
  }

  const gtag = getGtag();

  gtag("js", new Date());
  gtag("config", measurementId, {
    send_page_view: false,
    transport_type: "beacon"
  });

  configuredMeasurementId = measurementId;

  return true;
}

export function trackPageView(url) {
  const measurementId = getMeasurementId();

  if (!measurementId || typeof window === "undefined") {
    return;
  }

  const gtag = getGtag();

  gtag("event", "page_view", {
    page_title: document.title,
    page_location: url.href,
    page_path: `${url.pathname}${url.search}`,
    send_to: measurementId
  });
}
