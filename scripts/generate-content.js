#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const PUBLIC_DATA = path.join(ROOT, "public", "data");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function parseMetaTxt(txt) {
  const [headRaw, ...rest] = txt.split(/\n---\n/);
  const head = {};
  for (const line of headRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    head[key] = value;
  }
  const body = rest.length ? rest.join("\n---\n").trim() : "";
  return { ...head, description: body };
}

async function readDirIfExists(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function collectProjects() {
  const base = path.join(CONTENT, "projects");
  const items = await readDirIfExists(base);
  const out = [];

  for (const dirent of items) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    const pdir = path.join(base, slug);
    const metaPath = path.join(pdir, "meta.txt");
    let metaTxt = "";
    try {
      metaTxt = await fs.readFile(metaPath, "utf8");
    } catch {
      console.warn(`There is no meta.txt in ${slug}, skipping..`);
      continue;
    }
    const meta = parseMetaTxt(metaTxt);

    const coverCandidates = ["cover.png", "cover.jpg", "cover.jpeg", "cover.webp"];
    let cover = null;
    for (const c of coverCandidates) {
      try {
        await fs.access(path.join(pdir, c));
        cover = `/content/projects/${slug}/${c}`;
        break;
      } catch {}
    }

    const gdir = path.join(pdir, "gallery");
    const gallery = [];
    for (const g of await readDirIfExists(gdir)) {
      if (g.isFile()) {
        gallery.push(`/content/projects/${slug}/gallery/${g.name}`);
      }
    }

    out.push({
      slug,
      title: meta.title ?? slug,
      date: meta.date ?? null,
      tags: (meta.tags ?? "").split(",").map(s => s.trim()).filter(Boolean),
      status: meta.status ?? "active",
      links: meta.links ?? null,
      cover,
      gallery,
      description: meta.description ?? "",
      path: `/content/projects/${slug}/`
    });
  }

  out.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title, "pl");
  });

  return out;
}

async function collectNews() {
  const base = path.join(CONTENT, "news");
  const items = await readDirIfExists(base);
  const out = [];

  for (const dirent of items) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    const ndir = path.join(base, slug);
    const metaPath = path.join(ndir, "meta.txt");
    let metaTxt = "";
    try {
      metaTxt = await fs.readFile(metaPath, "utf8");
    } catch {
      console.warn(`There is no meta.txt in /${slug}, skipping...`);
      continue;
    }
    const meta = parseMetaTxt(metaTxt);

    const coverCandidates = ["cover.png", "cover.jpg", "cover.jpeg", "cover.webp"];
    let cover = null;
    for (const c of coverCandidates) {
      try {
        await fs.access(path.join(ndir, c));
        cover = `/content/news/${slug}/${c}`;
        break;
      } catch {}
    }

    out.push({
      slug,
      title: meta.title ?? slug,
      date: meta.date ?? null,
      author: meta.author ?? "Skylink",
      cover,
      description: meta.description ?? "",
      path: `/content/news/${slug}/`
    });
  }

  out.sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : a.slug.localeCompare(b.slug)));
  return out;
}

async function collectTeam() {
  const base = path.join(CONTENT, "team");
  const items = await readDirIfExists(base);
  const out = [];

  for (const dirent of items) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    const tdir = path.join(base, slug);
    const metaPath = path.join(tdir, "meta.txt");
    let metaTxt = "";
    try {
      metaTxt = await fs.readFile(metaPath, "utf8");
    } catch {
      console.warn(`There is no meta.txt in ${slug}, skipping..`);
      continue;
    }
    const meta = parseMetaTxt(metaTxt);

    const photoCandidates = ["photo.png", "photo.jpg", "photo.jpeg", "photo.webp"];
    let photo = null;
    for (const c of photoCandidates) {
      try {
        await fs.access(path.join(tdir, c));
        photo = `/content/team/${slug}/${c}`;
        break;
      } catch {}
    }

    out.push({
      slug,
      name: meta.name ?? slug,
      role: meta.role ?? "",
      email: meta.email ?? "",
      links: meta.links ?? "",
      photo,
      bio: meta.description ?? ""
    });
  }

    const rolePriority = {
    president: 3,
    leader: 2,
    head: 1
    };

    out.sort((a, b) => {
    const aRole = a.role?.toLowerCase() ?? "";
    const bRole = b.role?.toLowerCase() ?? "";

    const aScore = Object.entries(rolePriority).find(([key]) => aRole.includes(key))?.[1] ?? 0;
    const bScore = Object.entries(rolePriority).find(([key]) => bRole.includes(key))?.[1] ?? 0;

    if (aScore !== bScore) return bScore - aScore;
    return a.name.localeCompare(b.name, "pl");
    });

  return out;
}

async function collectStats() {
  const f = path.join(CONTENT, "stats", "stats.txt");
  try {
    const txt = await fs.readFile(f, "utf8");
    const map = {};
    for (const line of txt.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const valueRaw = line.slice(idx + 1).trim();
      const num = Number(valueRaw);
      map[key] = Number.isFinite(num) ? num : valueRaw;
    }
    return map;
  } catch {
    return {};
  }
}

async function main() {
  await ensureDir(PUBLIC_DATA);

  const [projects, news, team, stats] = await Promise.all([
    collectProjects(),
    collectNews(),
    collectTeam(),
    collectStats()
  ]);

  await fs.writeFile(path.join(PUBLIC_DATA, "projects.json"), JSON.stringify(projects, null, 2), "utf8");
  await fs.writeFile(path.join(PUBLIC_DATA, "news.json"), JSON.stringify(news, null, 2), "utf8");
  await fs.writeFile(path.join(PUBLIC_DATA, "team.json"), JSON.stringify(team, null, 2), "utf8");
  await fs.writeFile(path.join(PUBLIC_DATA, "stats.json"), JSON.stringify(stats, null, 2), "utf8");

  console.log("Generated /public/data/*.json");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
