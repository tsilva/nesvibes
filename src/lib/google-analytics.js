import { PUBLIC_GOOGLE_ANALYTICS_ID } from "$app/env/public";

function getMeasurementId() {
  const measurementId = PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
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
