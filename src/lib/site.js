export const site = {
  name: "NESVibes",
  url: "https://nesvibes.tsilva.eu",
  title: "Play NES Games Online in Your Browser | NESVibes",
  description:
    "Play Nintendo Entertainment System (NES) games online instantly in your browser with bundled homebrew and public-domain ROMs, touch controls, fullscreen play, and drag-and-drop support for your own .nes files.",
  shortDescription: "Play NES games online in your browser.",
  locale: "en_US",
  themeColor: "#e4000f",
  backgroundColor: "#252525",
  githubUrl: "https://github.com/tsilva/nesvibes",
  ogImage: {
    path: "/og-image.png",
    type: "image/png",
    width: 1200,
    height: 630,
    alt: "NESVibes social card showing a pixel-art console chip and red D-pad over a retro circuit-board background."
  },
  icons: {
    favicon16: "/favicon-16x16.png",
    favicon32: "/favicon-32x32.png",
    faviconIco: "/favicon.ico",
    appleTouch: "/apple-touch-icon.png",
    icon192: "/icon-192.png",
    icon512: "/icon-512.png"
  }
};

const BROWSER_REQUIREMENTS =
  "Requires a modern browser with Canvas, AudioWorklet, and ES modules.";
const FEATURE_LIST = [
  "Instant browser play for public-domain and licensed homebrew NES ROMs",
  "Drag-and-drop .nes ROM loading",
  "Mobile touch controls",
  "Fullscreen gameplay",
  "Desktop debugger"
];

function normalizeMetaText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(pathname = "/") {
  return new URL(pathname, site.url).href;
}

function createWebsiteSchema() {
  return {
    "@type": "WebSite",
    name: site.name,
    url: site.url
  };
}

function createPublisherSchema() {
  return {
    "@type": "Organization",
    name: site.name,
    url: site.url
  };
}

function createHomepageSchema({ canonicalUrl, description, ogImageUrl, title }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: canonicalUrl,
    description,
    isPartOf: createWebsiteSchema(),
    primaryImageOfPage: ogImageUrl,
    mainEntity: {
      "@type": "WebApplication",
      name: site.name,
      url: site.url,
      description: site.description,
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
      inLanguage: "en",
      isAccessibleForFree: true,
      browserRequirements: BROWSER_REQUIREMENTS,
      image: ogImageUrl,
      screenshot: ogImageUrl,
      sameAs: [site.githubUrl],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD"
      },
      featureList: FEATURE_LIST
    }
  };
}

function createSelectedGameSchema({ canonicalUrl, description, ogImageUrl, selectedGame, title }) {
  const mainEntity = {
    "@type": "CreativeWork",
    name: selectedGame.title,
    description: normalizeMetaText(description),
    url: canonicalUrl,
    image: ogImageUrl,
    isAccessibleForFree: true
  };

  if (selectedGame.authorCredit?.name) {
    mainEntity.creator = {
      "@type": "Person",
      name: selectedGame.authorCredit.name
    };

    if (selectedGame.authorCredit.url) {
      mainEntity.creator.url = selectedGame.authorCredit.url;
    }
  }

  if (selectedGame.licenseUrl) {
    mainEntity.license = selectedGame.licenseUrl;
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: canonicalUrl,
    description,
    isPartOf: createWebsiteSchema(),
    primaryImageOfPage: ogImageUrl,
    mainEntity,
    about: mainEntity,
    publisher: createPublisherSchema()
  };
}

export function createPageMetadata({
  pathname = "/",
  title = site.title,
  description = site.description,
  selectedGame = null
} = {}) {
  const canonicalUrl = absoluteUrl(pathname);
  const ogImageUrl = absoluteUrl(site.ogImage.path);
  const ogImageAlt = site.ogImage.alt;
  const jsonLd = selectedGame
    ? createSelectedGameSchema({
        canonicalUrl,
        description,
        ogImageUrl,
        selectedGame,
        title
      })
    : createHomepageSchema({
        canonicalUrl,
        description,
        ogImageUrl,
        title
      });

  return {
    canonicalUrl,
    title,
    description,
    ogImageUrl,
    ogImageAlt,
    jsonLd
  };
}
