import { getLibraryData } from "$lib/server/library.js";
import { site } from "$lib/site.js";

export const prerender = true;

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function createSitemapUrl(path, { changefreq = "weekly", priority = "0.8", lastmod } = {}) {
  const loc = escapeXml(new URL(path, site.url).href);
  const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";

  return `  <url>
    <loc>${loc}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const { libraryEntries } = await getLibraryData();
  const urls = [
    createSitemapUrl("/", { priority: "1.0" }),
    ...libraryEntries.map((entry) =>
      createSitemapUrl(`/play/${encodeURIComponent(entry.id)}`, {
        lastmod: entry.releaseDate ?? undefined
      }))
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8"
    }
  });
}
