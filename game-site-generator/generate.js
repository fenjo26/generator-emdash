#!/usr/bin/env node
/**
 * Game Site Generator
 *
 * Reads a site folder → produces a ready-to-build static Astro site.
 * No CMS runtime. No database. Just JSON data files + Astro.
 *
 * Input folder structure:
 *
 *   site-folder/
 *   ├── banner.webp / banner.jpg / banner.png
 *   ├── logo.webp   / logo.jpg   / logo.png
 *   ├── favicon.svg / favicon.png / favicon.ico
 *   ├── game-bg.webp              (optional, Game Hero background)
 *   ├── slide1.webp, slide2.webp  (optional, promo banners)
 *   └── text/
 *       ├── brend.txt     → affiliate brand (optional)
 *       ├── game.txt      → Game Hero settings (optional)
 *       ├── main.txt      → homepage content (required)
 *       ├── [page].txt    → article pages
 *       ├── authors/
 *       │   ├── [name].txt
 *       │   └── [name].webp
 *       └── service/
 *           └── [name].txt
 *
 * Usage:
 *   node generate.js --input ./testseo/battlefild6.gr --output ./sites/battlefild6.gr
 */

import {
  readFileSync, writeFileSync, copyFileSync, unlinkSync,
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
Game Site Generator — static Astro sites from txt content folders

Usage:
  node generate.js --input <site-folder> --output <output-dir>

Example:
  node generate.js --input ./testseo/battlefild6.gr --output ./sites/battlefild6.gr
`);
  process.exit(args.help ? 0 : 1);
}

const inputDir    = resolve(args.input);
const outputDir   = resolve(args.output ?? "./output");
const templateDir = join(__dirname, "template");

// ─── Parsers ─────────────────────────────────────────────────────────────────

/** Parse a .txt content file → { title, description, html } */
function parseTxtFile(filePath) {
  // Normalize CRLF → LF so regexes work on Windows-encoded files
  const raw = readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");

  const metaMatch = raw.match(/META-ТЕГИ:\s*([\s\S]*?)(?=\nтекст:|$)/i);
  const textMatch = raw.match(/текст:\s*([\s\S]*)/i);

  const metaBlock   = metaMatch ? metaMatch[1] : "";
  const html        = textMatch ? textMatch[1].trim() : "";

  // Title: prefer META-ТЕГИ Title, fall back to first <h1> in html
  const title =
    (metaBlock.match(/^Title:\s*(.+)$/im) || [])[1]?.trim()
    || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim()
    || "";

  const description = (metaBlock.match(/^Description:\s*(.+)$/im) || [])[1]?.trim() ?? "";

  return { title, description, html };
}

/** Parse brend.txt → { name, url } */
function parseBrend(filePath) {
  if (!existsSync(filePath)) return { name: "", url: "" };
  const raw = readFileSync(filePath, "utf-8").trim();
  if (!raw) return { name: "", url: "" };

  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines[0]?.startsWith("Name:")) {
    const name = (lines.find(l => l.startsWith("Name:")) || "").replace("Name:", "").trim();
    const url  = (lines.find(l => l.startsWith("Link:")) || "").replace("Link:", "").trim();
    return { name, url };
  }
  return { name: lines[0] ?? "", url: lines[1] ?? "" };
}

/**
 * Parse game.txt → game hero settings
 *
 * Game: Aviator
 * Subtitle: Fly High, Bet Smart
 * RTP: 97%
 * MaxWin: 10,000×
 * Volatility: High
 * PlayUrl: https://...    (optional — falls back to brend.url)
 * DemoUrl: https://...    (optional)
 * PlayLabel: Play Now
 * DemoLabel: Try Demo Free
 * AccentColor: #4f8ef7
 */
function parseGame(filePath) {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8").trim();
  if (!raw) return null;

  const get = (key) => {
    const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
    return m ? m[1].trim() : "";
  };

  return {
    name:        get("Game")        || get("Name"),
    subtitle:    get("Subtitle"),
    rtp:         get("RTP")         || "97%",
    maxWin:      get("MaxWin")      || "10,000×",
    volatility:  get("Volatility")  || "High",
    playUrl:     get("PlayUrl")     || get("Play"),
    demoUrl:     get("DemoUrl")     || get("Demo"),
    playLabel:   get("PlayLabel")   || "Play Now",
    demoLabel:   get("DemoLabel")   || "Try Demo Free",
    accentColor: get("AccentColor") || "#4f8ef7",
  };
}

/** Find first existing file matching one of given names */
function findAsset(dir, names) {
  for (const name of names) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Find author photo by stem, with fuzzy fallback.
 * Tries exact match first, then first-word match, then any image whose stem
 * is a prefix of the author stem (e.g. "maria.webp" for "maria-konstantinou.txt").
 */
function findAuthorPhoto(dir, stem, images) {
  const exts = [".webp", ".jpg", ".jpeg", ".png"];

  // 1. Exact match
  for (const ext of exts) {
    if (images.includes(`${stem}${ext}`)) return join(dir, `${stem}${ext}`);
  }

  // 2. First segment before hyphen/underscore (e.g. "maria" from "maria-konstantinou")
  const firstWord = stem.split(/[-_]/)[0];
  if (firstWord !== stem) {
    for (const ext of exts) {
      if (images.includes(`${firstWord}${ext}`)) return join(dir, `${firstWord}${ext}`);
    }
  }

  // 3. Any image whose stem is a prefix of the author stem
  for (const imgFile of images) {
    const imgStem = basename(imgFile, extname(imgFile));
    if (stem.startsWith(imgStem)) return join(dir, imgFile);
  }

  return null;
}

/** All .txt files in a directory (non-recursive) */
function txtFilesIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith(".txt") && !f.startsWith("."))
    .map(f => join(dir, f));
}

/** Build a data entry. Slug = filename, never from file content. */
function makeEntry(id, parsed, extra = {}) {
  return {
    id,
    data: {
      title:        parsed.title,
      seo_desc:     parsed.description,
      html_content: parsed.html,
      ...extra,
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Game Site Generator (static Astro)\n");
  console.log(`📂 Input:  ${inputDir}`);
  console.log(`📁 Output: ${outputDir}\n`);

  const textDir    = join(inputDir, "text");
  const authorDir  = join(textDir, "authors");
  const serviceDir = join(textDir, "service");

  // ── Brand ────────────────────────────────────────────────────────────────
  const brend = parseBrend(join(textDir, "brend.txt"));
  console.log(`🏷  Brand: ${brend.name || "(none)"}`);
  if (brend.url) console.log(`🔗 Affiliate: ${brend.url}`);

  // ── Game hero settings ───────────────────────────────────────────────────
  const game = parseGame(join(textDir, "game.txt"));
  if (game) console.log(`🎮 Game: ${game.name || "(unnamed)"} RTP:${game.rtp}`);

  // ── Homepage ─────────────────────────────────────────────────────────────
  const mainFile = join(textDir, "main.txt");
  if (!existsSync(mainFile)) {
    console.error("❌ main.txt not found in", textDir);
    process.exit(1);
  }
  const mainParsed = parseTxtFile(mainFile);
  const siteName   = mainParsed.title || basename(inputDir);
  console.log(`📋 Site: "${siteName}"`);

  // ── Article pages ────────────────────────────────────────────────────────
  const SKIP_TXT = new Set(["main.txt", "brend.txt", "game.txt"]);
  const pages = [makeEntry("main", mainParsed)];
  for (const f of txtFilesIn(textDir)) {
    if (SKIP_TXT.has(basename(f))) continue;
    const parsed = parseTxtFile(f);
    if (!parsed.html && !parsed.title) continue;
    pages.push(makeEntry(basename(f, ".txt"), parsed));
  }

  // ── Authors ──────────────────────────────────────────────────────────────
  const authors = [];
  // Pre-collect all image files in authorDir for fuzzy matching
  const authorImages = existsSync(authorDir)
    ? readdirSync(authorDir).filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f))
    : [];

  for (const f of txtFilesIn(authorDir)) {
    const parsed = parseTxtFile(f);
    const stem   = basename(f, ".txt");
    const photo  = findAuthorPhoto(authorDir, stem, authorImages);
    authors.push(makeEntry(stem, parsed, {
      // plain URL — no $media, no upload system needed
      photo: photo ? { src: `/authors/${basename(photo)}`, alt: parsed.title } : null,
    }));
  }

  // ── Service pages ─────────────────────────────────────────────────────────
  const servicePages = [];
  for (const f of txtFilesIn(serviceDir)) {
    const parsed = parseTxtFile(f);
    servicePages.push(makeEntry(basename(f, ".txt"), parsed));
  }

  console.log(`\n📄 Pages: ${pages.length - 1} articles, ${servicePages.length} service, ${authors.length} authors`);

  // ── Assets ────────────────────────────────────────────────────────────────
  const bannerPath  = findAsset(inputDir, ["banner.webp", "banner.jpg", "banner.png"]);
  const logoPath    = findAsset(inputDir, ["logo.webp",   "logo.jpg",   "logo.png"]);
  const faviconPath = findAsset(inputDir, ["favicon.svg", "favicon.png", "favicon.ico"]);
  const gameBgPath  = findAsset(inputDir, ["game-bg.webp", "game-bg.jpg", "game-bg.png"]);

  // ── Game hero data ────────────────────────────────────────────────────────
  const gameHero = game ? {
    enabled:      true,
    game_name:    game.name       || siteName,
    subtitle:     game.subtitle   || "",
    rtp:          game.rtp,
    max_win:      game.maxWin,
    volatility:   game.volatility,
    play_url:     game.playUrl    || brend.url || "",
    demo_url:     game.demoUrl    || brend.url || "",
    play_label:   game.playLabel,
    demo_label:   game.demoLabel,
    accent_color: game.accentColor,
    bg_url:       gameBgPath ? "/game-bg" + extname(gameBgPath) : "",
  } : {
    enabled: false,
  };

  // ── Copy template ─────────────────────────────────────────────────────────
  mkdirSync(outputDir, { recursive: true });
  if (existsSync(templateDir)) {
    console.log("\n📁 Copying template...");
    copyDir(templateDir, outputDir);
  }

  // ── Write data files (src/data/) ──────────────────────────────────────────
  console.log("🗄  Writing data files...");
  const dataDir = join(outputDir, "src", "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "pages.json"),         JSON.stringify(pages,        null, 2));
  writeFileSync(join(dataDir, "service_pages.json"), JSON.stringify(servicePages, null, 2));
  writeFileSync(join(dataDir, "authors.json"),        JSON.stringify(authors,      null, 2));
  writeFileSync(join(dataDir, "game_hero.json"),      JSON.stringify(gameHero,     null, 2));
  console.log(`✅ Data written (${pages.length} pages, ${servicePages.length} service, ${authors.length} authors)`);

  // ── Write brand.json ──────────────────────────────────────────────────────
  writeFileSync(
    join(outputDir, "src", "brand.json"),
    JSON.stringify({ name: brend.name, url: brend.url, siteName }, null, 2)
  );

  // ── Copy assets → public/ ─────────────────────────────────────────────────
  const publicDir = join(outputDir, "public");
  mkdirSync(publicDir, { recursive: true });

  if (bannerPath)  { copyFileSync(bannerPath,  join(publicDir, "banner"  + extname(bannerPath)));  console.log("🖼  banner"); }
  if (logoPath)    { copyFileSync(logoPath,    join(publicDir, "logo"    + extname(logoPath)));    console.log("🖼  logo"); }
  if (faviconPath) { copyFileSync(faviconPath, join(publicDir, "favicon" + extname(faviconPath))); console.log("🖼  favicon"); }
  if (gameBgPath)  { copyFileSync(gameBgPath,  join(publicDir, "game-bg" + extname(gameBgPath)));  console.log("🖼  game-bg"); }

  // Author photos → public/authors/
  if (existsSync(authorDir)) {
    const authPublic = join(publicDir, "authors");
    mkdirSync(authPublic, { recursive: true });
    for (const f of readdirSync(authorDir)) {
      if (/\.(webp|jpg|jpeg|png)$/i.test(f)) {
        copyFileSync(join(authorDir, f), join(authPublic, f));
        console.log(`🖼  authors/${f}`);
      }
    }
  }

  // Slide images (slide1.*, slide2.*, …) → public/slides/
  let slideCount = 0;
  for (const f of readdirSync(inputDir)) {
    if (/^slide\d+\.(webp|jpg|jpeg|png)$/i.test(f)) {
      mkdirSync(join(publicDir, "slides"), { recursive: true });
      copyFileSync(join(inputDir, f), join(publicDir, "slides", f));
      console.log(`🖼  slides/${f}`);
      slideCount++;
    }
  }

  // ── robots.txt ────────────────────────────────────────────────────────────
  const domain = basename(inputDir);
  writeFileSync(join(publicDir, "robots.txt"), [
    "User-agent: *",
    "Allow: /",
    `Sitemap: https://${domain}/sitemap.xml`,
    "",
  ].join("\n"));

  // ── Patch package.json name ───────────────────────────────────────────────
  const pkgPath = join(outputDir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    pkg.name = domain.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // ── Patch astro.config.mjs with real site URL ─────────────────────────────
  const astroCfgPath = join(outputDir, "astro.config.mjs");
  if (existsSync(astroCfgPath)) {
    let cfg = readFileSync(astroCfgPath, "utf-8");
    cfg = cfg.replace(/site:\s*"https:\/\/example\.com"/, `site: "https://${domain}"`);
    writeFileSync(astroCfgPath, cfg);
  }

  console.log(`
✨ Done! Site ready in: ${outputDir}

Next steps:
  cd ${outputDir}
  npm install
  npm run dev      ← development server

  npm run build    ← build static files → dist/
  npm run preview  ← preview the build locally

Site:    http://localhost:4321
`);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

// Skip these entries (files or dirs) when copying the template
const SKIP_ENTRIES = new Set([
  // emdash runtime — not needed for static sites
  "live.config.ts",
  "middleware.ts",
  "sitemap.xml.ts",   // replaced by sitemap.xml.js
  "robots.txt.ts",    // replaced by public/robots.txt written by generator
  // old/unused page directories from previous template versions
  "games",
  "genre",
  "platform",
  "seo",
  // build artifacts and data
  "node_modules",
  "dist",
  ".emdash",
  "data",             // src/data/ is always written fresh by generator
]);

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (SKIP_ENTRIES.has(entry)) continue;
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
