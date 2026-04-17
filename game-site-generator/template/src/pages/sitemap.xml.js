import pagesData from "../data/pages.json";
import servicePagesData from "../data/service_pages.json";
import authorsData from "../data/authors.json";

export async function GET({ site }) {
  const origin = site?.toString().replace(/\/$/, "") ?? "";

  const urls = [
    `${origin}/`,
    ...pagesData
      .filter(p => p.id !== "main")
      .map(p => `${origin}/${p.id}/`),
    ...servicePagesData.map(p => `${origin}/${p.id}/`),
    ...authorsData.map(a => `${origin}/authors/${a.id}/`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
