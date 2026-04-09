export const site = {
  name: "NESVibes",
  url: "https://nesvibes.tsilva.eu",
  title: "Play NES Games Online in Your Browser | NESVibes",
  description:
    "Play NES games online instantly in your browser with bundled homebrew and public-domain titles, drag-and-drop ROM support, touch controls, and fullscreen retro play.",
  shortDescription: "Play NES games online instantly.",
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
const NES_PLATFORM = "Nintendo Entertainment System";

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

function createWebApplicationSchema({ description, ogImageUrl }) {
  return {
    "@type": "WebApplication",
    name: site.name,
    url: site.url,
    description,
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
  };
}

function createHomepageSchema({ canonicalUrl, description, ogImageUrl, title, libraryEntries }) {
  const playableEntries = libraryEntries.filter((entry) => entry.supported);
  const featuredEntries = playableEntries.slice(0, 8).map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.title,
    url: absoluteUrl(entry.playPath)
  }));

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: canonicalUrl,
    description,
    isPartOf: createWebsiteSchema(),
    primaryImageOfPage: ogImageUrl,
    about: createWebApplicationSchema({ description, ogImageUrl }),
    mainEntity: {
      "@type": "ItemList",
      name: "Playable NES library",
      description: "Playable browser NES library with bundled homebrew and public-domain games.",
      numberOfItems: playableEntries.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: featuredEntries
    },
    publisher: createPublisherSchema()
  };
}

function createSelectedGameEntity({ canonicalUrl, description, ogImageUrl, selectedGame }) {
  const mainEntity = {
    "@type": "VideoGame",
    name: selectedGame.title,
    description: normalizeMetaText(description),
    url: canonicalUrl,
    image: ogImageUrl,
    isAccessibleForFree: true,
    gamePlatform: NES_PLATFORM,
    genre: selectedGame.sourceKind === "licensed" ? "Homebrew" : "Public-domain homebrew"
  };

  if (selectedGame.authorCredit?.name) {
    mainEntity.author = {
      "@type": "Person",
      name: selectedGame.authorCredit.name
    };

    if (selectedGame.authorCredit.url) {
      mainEntity.author.url = selectedGame.authorCredit.url;
    }
  }

  if (selectedGame.releaseDate) {
    mainEntity.datePublished = selectedGame.releaseDate;
  }

  if (selectedGame.licenseUrl) {
    mainEntity.license = selectedGame.licenseUrl;
  }

  const relatedUrls = [
    selectedGame.originalPageUrl,
    selectedGame.sourceUrl,
    selectedGame.licenseUrl
  ].filter(Boolean);

  if (relatedUrls.length > 0) {
    mainEntity.sameAs = relatedUrls;
  }

  return mainEntity;
}

function createSelectedGameSchema({ canonicalUrl, description, ogImageUrl, selectedGame, title }) {
  const mainEntity = createSelectedGameEntity({
    canonicalUrl,
    description,
    ogImageUrl,
    selectedGame
  });

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
    publisher: createPublisherSchema(),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: site.name,
          item: site.url
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title,
          item: canonicalUrl
        }
      ]
    }
  };
}

export function getManifestData() {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: site.backgroundColor,
    theme_color: site.themeColor,
    categories: ["games", "entertainment"],
    icons: [
      {
        src: site.icons.icon192,
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: site.icons.icon512,
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}

export function getRobotsLines() {
  const siteUrl = new URL(site.url);

  return [
    "User-agent: *",
    "Allow: /",
    `Host: ${siteUrl.host}`,
    `Sitemap: ${new URL("/sitemap.xml", site.url).href}`
  ];
}

export function createPageMetadata({
  pathname = "/",
  title = site.title,
  description = site.description,
  selectedGame = null,
  libraryEntries = []
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
        title,
        libraryEntries
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
