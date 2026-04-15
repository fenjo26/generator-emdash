import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.href.replace(/\/$/, "") ?? "https://example.com";

  const [{ entries: pages }, { entries: servicePages }, { entries: authors }] = await Promise.all([
    getEmDashCollection("pages"),
    getEmDashCollection("service_pages"),
    getEmDashCollection("authors"),
  ]);

  type SitemapEntry = { loc: string; priority: number; changefreq: string };
  const urls: SitemapEntry[] = [
    { loc: baseUrl + "/", priority: 1.0, changefreq: "daily" },
  ];

  for (const page of pages) {
    if (page.id === "main") continue; // homepage already added
    urls.push({ loc: `${baseUrl}/${page.id}`, priority: 0.8, changefreq: "monthly" });
  }

  for (const sp of servicePages) {
    urls.push({ loc: `${baseUrl}/${sp.id}`, priority: 0.5, changefreq: "yearly" });
  }

  for (const author of authors) {
    urls.push({ loc: `${baseUrl}/authors/${author.id}`, priority: 0.4, changefreq: "yearly" });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
};
