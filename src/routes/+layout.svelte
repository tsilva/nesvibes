<script>
  import { browser } from "$app/environment";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/stores";
  import { env } from "$env/dynamic/public";
  import { trackPageView } from "$lib/google-analytics.js";
  import { site } from "$lib/site.js";
  import silkscreenFontUrl from "@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2?url";
  import { onMount } from "svelte";

  const googleAnalyticsMeasurementId = env.PUBLIC_GOOGLE_ANALYTICS_ID?.trim() || null;
  const googleAnalyticsScript = googleAnalyticsMeasurementId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsMeasurementId)}"><\/script><script>window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function gtag(){window.dataLayer.push(arguments);};window.gtag("js",new Date());window.gtag("config",${JSON.stringify(googleAnalyticsMeasurementId)},{"send_page_view":false,"transport_type":"beacon"});<\/script>`
    : "";

  let analyticsReady = Boolean(googleAnalyticsMeasurementId);
  let lastTrackedUrl = null;
  let pendingUrl = null;

  $: pageTitle = $page.data.pageTitle ?? site.title;
  $: pageDescription = $page.data.pageDescription ?? site.description;
  $: canonicalUrl = new URL($page.url.pathname, site.url).href;
  $: ogImageUrl = `${site.url}${site.ogImage.path}`;
  $: jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: pageTitle,
    url: canonicalUrl,
    description: pageDescription,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    inLanguage: "en",
    isAccessibleForFree: true,
    browserRequirements: "Requires a modern browser with Canvas, AudioWorklet, and ES modules.",
    image: ogImageUrl,
    screenshot: ogImageUrl,
    sameAs: [site.githubUrl],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    },
    featureList: [
      "Instant browser play for public-domain and homebrew NES games",
      "Drag-and-drop .nes ROM loading",
      "Mobile touch controls",
      "Fullscreen gameplay",
      "Desktop debugger"
    ]
  });
  $: jsonLdScript = `<script type="application/ld+json">${jsonLd}<\/script>`;

  function queuePageView(url) {
    pendingUrl = new URL(url.href);
    flushPageView();
  }

  function flushPageView() {
    if (!analyticsReady || pendingUrl === null) {
      return;
    }

    if (pendingUrl.href === lastTrackedUrl) {
      pendingUrl = null;
      return;
    }

    trackPageView(pendingUrl);
    lastTrackedUrl = pendingUrl.href;
    pendingUrl = null;
  }

  if (browser) {
    afterNavigate(({ to }) => {
      queuePageView(to?.url ?? new URL(window.location.href));
    });
  }

  onMount(() => {
    if (analyticsReady) {
      queuePageView(new URL(window.location.href));
    }
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="theme-color" content={site.themeColor} />
  <meta name="color-scheme" content="dark" />
  <meta name="application-name" content={site.name} />
  <meta name="apple-mobile-web-app-title" content={site.name} />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="format-detection" content="telephone=no" />

  <link rel="canonical" href={canonicalUrl} />
  <link rel="preload" href={silkscreenFontUrl} as="font" type="font/woff2" crossorigin="anonymous" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="icon" type="image/x-icon" href={site.icons.faviconIco} />
  <link rel="icon" type="image/png" sizes="16x16" href={site.icons.favicon16} />
  <link rel="icon" type="image/png" sizes="32x32" href={site.icons.favicon32} />
  <link rel="apple-touch-icon" sizes="180x180" href={site.icons.appleTouch} />

  <meta property="og:site_name" content={site.name} />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content={site.locale} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={ogImageUrl} />
  <meta property="og:image:width" content={String(site.ogImage.width)} />
  <meta property="og:image:height" content={String(site.ogImage.height)} />
  <meta property="og:image:alt" content={site.ogImage.alt} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={pageDescription} />
  <meta name="twitter:image" content={ogImageUrl} />
  <meta name="twitter:image:alt" content={site.ogImage.alt} />

  <meta name="msapplication-TileColor" content={site.themeColor} />
  <meta name="msapplication-config" content="/browserconfig.xml" />

  {@html googleAnalyticsScript}
  {@html jsonLdScript}
</svelte:head>

<slot />
