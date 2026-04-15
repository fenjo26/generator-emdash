#!/usr/bin/env node
/**
 * EmDash Game Site Generator
 *
 * Reads a site folder with this structure:
 *
 *   site-folder/
 *   ├── banner.webp / banner.jpg / banner.png
 *   ├── logo.webp   / logo.jpg   / logo.png
 *   ├── favicon.svg / favicon.png / favicon.ico
 *   └── text/
 *       ├── brend.txt          → brand name + affiliate link
 *       ├── main.txt           → homepage (slug: main)
 *       ├── [article].txt      → article pages
 *       ├── authors/
 *       │   ├── [name].txt     → author bio page
 *       │   └── [name].webp    → author photo
 *       ├── service/
 *       │   └── [name].txt     → service pages (about-us, contacts, etc.)
 *       └── seo/               → SKIPPED (keyword research only)
 *
 * Each .txt format:
 *   META-ТЕГИ:
 *   Title: ...
 *   Description: ...
 *   Slug: page-slug
 *
 *   текст:
 *   <html content>
 *
 * Usage:
 *   node generate.js --input ./testseo/battlefild6.gr --output ./sites/battlefild6.gr
 *   node generate.js --input ./testseo/conter-strike2.gr --output ./sites/conter-strike2.gr
 */

import {
  readFileSync, writeFileSync, copyFileSync,
  mkdirSync, existsSync, readdirSync, statSync,
} from "node:fs";
import { resolve, join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI args ────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    input:  { type: "string",  short: "i" },
    output: { type: "string",  short: "o" },
    help:   { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

if (args.help || !args.input) {
  console.log(`
EmDash Game Site Generator

Usage:
  node generate.js --input <site-folder> --output <output-dir>

Example:
  node generate.js --input ./testseo/battlefild6.gr --output ./sites/battlefild6.gr
`);
  process.exit(args.help ? 0 : 1);
}

const inputDir  = resolve(args.input);
const outputDir = resolve(args.output ?? "./output");
const templateDir = join(__dirname, "template");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a .txt content file → { title, description, slug, html } */
function parseTxtFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");

  const metaMatch = raw.match(/META-ТЕГИ:\s*([\s\S]*?)(?=\nтекст:|$)/i);
  const textMatch = raw.match(/текст:\s*([\s\S]*)/i);

  const metaBlock = metaMatch ? metaMatch[1] : "";
  const html      = textMatch ? textMatch[1].trim() : "";

  const title       = (metaBlock.match(/^Title:\s*(.+)$/im)       || [])[1]?.trim() ?? "";
  const description = (metaBlock.match(/^Description:\s*(.+)$/im) || [])[1]?.trim() ?? "";
  const slug        = (metaBlock.match(/^Slug:\s*(.+)$/im)        || [])[1]?.trim() ?? "";

  return { title, description, slug, html };
}

/** Parse brend.txt → { name, url } */
function parseBrend(filePath) {
  if (!existsSync(filePath)) return { name: "", url: "" };
  const raw = readFileSync(filePath, "utf-8").trim();
  if (!raw) return { name: "", url: "" };

  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

  // Format 1: "Name: xxx / Link: xxx"
  if (lines[0]?.startsWith("Name:")) {
    const name = (lines.find(l => l.startsWith("Name:")) || "").replace("Name:", "").trim();
    const url  = (lines.find(l => l.startsWith("Link:")) || "").replace("Link:", "").trim();
    return { name, url };
  }
  // Format 2: plain two lines "Name\nURL"
  return { name: lines[0] ?? "", url: lines[1] ?? "" };
}

/** Find first existing file matching one of given names */
function findAsset(dir, names) {
  for (const name of names) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Find all .txt files in a dir (non-recursive) */
function txtFilesIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith(".txt") && !f.startsWith("."))
    .map(f => join(dir, f));
}

/** Build a seed content entry from a parsed txt file */
function makeEntry(id, parsed, extra = {}) {
  return {
    id,
    slug: parsed.slug || id,
    status: "published",
    data: {
      title:       parsed.title,
      seo_desc:    parsed.description,
      html_content: parsed.html,
      ...extra,
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎮 EmDash Game Site Generator\n");
  console.log(`📂 Input:  ${inputDir}`);
  console.log(`📁 Output: ${outputDir}\n`);

  const textDir    = join(inputDir, "text");
  const authorDir  = join(textDir, "authors");
  const serviceDir = join(textDir, "service");
  const seoDir     = join(textDir, "seo");   // skip content, only keyword data

  // ── Brand info ──────────────────────────────────────────────────────────
  const brend = parseBrend(join(textDir, "brend.txt"));
  console.log(`🏷  Brand: ${brend.name || "(none)"}`);
  if (brend.url) console.log(`🔗 Affiliate: ${brend.url}`);

  // ── Homepage ─────────────────────────────────────────────────────────────
  const mainFile = join(textDir, "main.txt");
  if (!existsSync(mainFile)) {
    console.error("❌ main.txt not found in", textDir);
    process.exit(1);
  }
  const mainParsed = parseTxtFile(mainFile);
  const siteName   = mainParsed.title || basename(inputDir);
  console.log(`📋 Site: "${siteName}"`);

  // ── Article pages (root text/ dir, skip main.txt and brend.txt and seo/) ─
  const articleEntries = [];
  for (const f of txtFilesIn(textDir)) {
    const name = basename(f);
    if (name === "main.txt" || name === "brend.txt") continue;
    const parsed = parseTxtFile(f);
    if (!parsed.html && !parsed.title) continue;
    const id = parsed.slug || basename(f, ".txt");
    articleEntries.push(makeEntry(id, parsed));
  }

  // ── Author pages ──────────────────────────────────────────────────────────
  const authorEntries = [];
  for (const f of txtFilesIn(authorDir)) {
    const parsed = parseTxtFile(f);
    const id = parsed.slug || basename(f, ".txt");
    // find matching photo
    const stem = basename(f, ".txt");
    const photo = findAsset(authorDir, [`${stem}.webp`, `${stem}.jpg`, `${stem}.png`]);
    authorEntries.push({
      ...makeEntry(id, parsed),
      data: {
        ...makeEntry(id, parsed).data,
        photo: photo ? { $media: { file: photo, alt: parsed.title } } : null,
      },
    });
  }

  // ── Service pages ─────────────────────────────────────────────────────────
  const serviceEntries = [];
  for (const f of txtFilesIn(serviceDir)) {
    const parsed = parseTxtFile(f);
    const id = parsed.slug || basename(f, ".txt");
    serviceEntries.push(makeEntry(id, parsed));
  }

  console.log(`\n📄 Pages: ${articleEntries.length} articles, ${serviceEntries.length} service, ${authorEntries.length} authors`);

  // ── Assets ────────────────────────────────────────────────────────────────
  const bannerPath  = findAsset(inputDir, ["banner.webp", "banner.jpg", "banner.png"]);
  const logoPath    = findAsset(inputDir, ["logo.webp",   "logo.jpg",   "logo.png"]);
  const faviconPath = findAsset(inputDir, ["favicon.svg", "favicon.png", "favicon.ico"]);

  // ── Build seed.json ───────────────────────────────────────────────────────
  console.log("\n🌱 Building seed.json...");

  const seed = {
    $schema: "https://emdashcms.com/seed.schema.json",
    version: "1",
    meta: {
      name: siteName,
      description: `Game guide site: ${siteName}`,
      author: "game-site-generator",
    },

    settings: {
      title: siteName,
      tagline: mainParsed.description || "",
      // Store brand info in settings custom fields
      ...(brend.name ? { brandName: brend.name } : {}),
      ...(brend.url  ? { brandUrl:  brend.url  } : {}),
    },

    collections: [
      {
        slug: "pages",
        label: "Pages",
        labelSingular: "Page",
        supports: ["drafts", "revisions", "seo"],
        urlPattern: "/{slug}",
        fields: [
          { slug: "title",        label: "Title",       type: "string", required: true, searchable: true },
          { slug: "seo_desc",     label: "SEO Description", type: "text" },
          { slug: "html_content", label: "HTML Content", type: "text",  searchable: true },
        ],
      },
      {
        slug: "service_pages",
        label: "Service Pages",
        labelSingular: "Service Page",
        supports: ["drafts"],
        urlPattern: "/{slug}",
        fields: [
          { slug: "title",        label: "Title",       type: "string", required: true },
          { slug: "seo_desc",     label: "SEO Description", type: "text" },
          { slug: "html_content", label: "HTML Content", type: "text" },
        ],
      },
      {
        slug: "authors",
        label: "Authors",
        labelSingular: "Author",
        supports: ["drafts"],
        urlPattern: "/authors/{slug}",
        fields: [
          { slug: "title",        label: "Name",        type: "string", required: true },
          { slug: "seo_desc",     label: "SEO Description", type: "text" },
          { slug: "html_content", label: "Bio HTML",    type: "text" },
          { slug: "photo",        label: "Photo",       type: "image" },
        ],
      },
    ],

    menus: [
      {
        name: "primary",
        label: "Primary Navigation",
        items: [
          { type: "custom", label: "Αρχική", url: "/" },
          ...articleEntries.slice(0, 4).map(e => ({
            type: "custom",
            label: e.data.title?.split(/[\|:]/)[0]?.trim().slice(0, 30) ?? e.slug,
            url: `/${e.slug}`,
          })),
        ],
      },
    ],

    content: {
      pages: [
        // homepage as first page
        makeEntry("main", mainParsed),
        ...articleEntries,
      ],
      service_pages: serviceEntries,
      authors: authorEntries,
    },
  };

  // ── Write output ───────────────────────────────────────────────────────────
  mkdirSync(outputDir, { recursive: true });

  const seedDir = join(outputDir, ".emdash");
  mkdirSync(seedDir, { recursive: true });
  writeFileSync(join(seedDir, "seed.json"), JSON.stringify(seed, null, 2));
  console.log(`✅ Seed written (${seed.content.pages.length} pages, ${serviceEntries.length} service, ${authorEntries.length} authors)`);

  // Copy template
  if (existsSync(templateDir)) {
    console.log("📁 Copying template...");
    copyDir(templateDir, outputDir);
  }

  // Copy assets into public/
  const publicDir = join(outputDir, "public");
  mkdirSync(publicDir, { recursive: true });
  if (bannerPath)  { copyFileSync(bannerPath,  join(publicDir, "banner"  + extname(bannerPath)));  console.log("🖼  Copied banner"); }
  if (logoPath)    { copyFileSync(logoPath,    join(publicDir, "logo"    + extname(logoPath)));    console.log("🖼  Copied logo"); }
  if (faviconPath) { copyFileSync(faviconPath, join(publicDir, "favicon" + extname(faviconPath))); console.log("🖼  Copied favicon"); }

  // Copy author photos into public/authors/
  if (existsSync(authorDir)) {
    const authPublic = join(publicDir, "authors");
    mkdirSync(authPublic, { recursive: true });
    for (const f of readdirSync(authorDir)) {
      if (/\.(webp|jpg|jpeg|png)$/i.test(f)) {
        copyFileSync(join(authorDir, f), join(authPublic, f));
      }
    }
  }

  // Patch package.json name
  const pkgPath = join(outputDir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    pkg.name = basename(inputDir).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // Write brand config for template to read
  writeFileSync(
    join(outputDir, "src", "brand.json"),
    JSON.stringify({ name: brend.name, url: brend.url, siteName }, null, 2)
  );

  console.log(`
✨ Done! Site ready in: ${outputDir}

Next steps:
  cd ${outputDir}
  npm install
  npm run bootstrap
  npm run dev

Admin:   http://localhost:4321/_emdash/admin
Site:    http://localhost:4321
`);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

// Files handled natively by emdash 0.5.0 — skip from template copy
const SKIP_FILES = new Set(["sitemap.xml.ts", "robots.txt.ts"]);

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (["node_modules", "dist", ".emdash"].includes(entry)) continue;
    if (SKIP_FILES.has(entry)) continue;
    const srcPath  = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
