<script>
  import { browser } from "$app/environment";
  import { afterNavigate } from "$app/navigation";
  import { initGoogleAnalytics, trackPageView } from "$lib/google-analytics.js";
  import { site } from "$lib/site.js";
  import silkscreenFontUrl from "@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2?url";
  import { onMount } from "svelte";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: site.name,
    url: site.url,
    description: site.description,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    inLanguage: "en",
    isAccessibleForFree: true,
    browserRequirements: "Requires a modern browser with Canvas, AudioWorklet, and ES modules.",
    image: `${site.url}${site.ogImage.path}`,
    screenshot: `${site.url}${site.ogImage.path}`,
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
  const jsonLdScript = `<script type="application/ld+json">${jsonLd}<\/script>`;

  let analyticsReady = false;
  let lastTrackedUrl = null;
  let pendingUrl = null;

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
    const startAnalytics = () => {
      analyticsReady = initGoogleAnalytics();

      if (!analyticsReady) {
        return;
      }

      queuePageView(new URL(window.location.href));
    };

    if ("requestIdleCallback" in window) {
      const idleCallbackId = window.requestIdleCallback(startAnalytics, {
        timeout: 2000
      });

      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = window.setTimeout(startAnalytics, 0);

    return () => window.clearTimeout(timeoutId);
  });
</script>

<svelte:head>
  <title>{site.title}</title>
  <meta name="description" content={site.description} />
  <meta name="keywords" content={site.keywords.join(", ")} />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="theme-color" content={site.themeColor} />
  <meta name="application-name" content={site.name} />
  <meta name="apple-mobile-web-app-title" content={site.name} />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="format-detection" content="telephone=no" />

  <link rel="canonical" href={site.url} />
  <link rel="preload" href={silkscreenFontUrl} as="font" type="font/woff2" crossorigin="anonymous" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="icon" type="image/x-icon" href={site.icons.faviconIco} />
  <link rel="icon" type="image/png" sizes="16x16" href={site.icons.favicon16} />
  <link rel="icon" type="image/png" sizes="32x32" href={site.icons.favicon32} />
  <link rel="apple-touch-icon" sizes="180x180" href={site.icons.appleTouch} />

  <meta property="og:site_name" content={site.name} />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content={site.locale} />
  <meta property="og:title" content={site.title} />
  <meta property="og:description" content={site.description} />
  <meta property="og:url" content={site.url} />
  <meta property="og:image" content={`${site.url}${site.ogImage.path}`} />
  <meta property="og:image:width" content={String(site.ogImage.width)} />
  <meta property="og:image:height" content={String(site.ogImage.height)} />
  <meta property="og:image:alt" content={site.ogImage.alt} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={site.title} />
  <meta name="twitter:description" content={site.description} />
  <meta name="twitter:image" content={`${site.url}${site.ogImage.path}`} />
  <meta name="twitter:image:alt" content={site.ogImage.alt} />

  <meta name="msapplication-TileColor" content={site.themeColor} />
  <meta name="msapplication-config" content="/browserconfig.xml" />

  {@html jsonLdScript}
</svelte:head>

<slot />
