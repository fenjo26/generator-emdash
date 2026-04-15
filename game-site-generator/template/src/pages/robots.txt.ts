import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.href.replace(/\/$/, "") ?? "https://example.com";
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /_emdash/\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain" } }
  );
};
