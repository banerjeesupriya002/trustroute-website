import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const today = new Date().toISOString().slice(0, 10);
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY GitHub secret is required.");

const postsPath = path.join(ROOT, "blog", "posts.json");
const posts = JSON.parse(await fs.readFile(postsPath, "utf8"));
if (posts.some(p => p.date === today)) {
  console.log(`A post for ${today} already exists.`);
  process.exit(0);
}

const prompt = `
You are the autonomous editorial desk for TrustRoute, an India-focused verified carpooling platform.

Today is ${today}. Research the public web and select ONE genuinely useful, timely topic related to:
- daily commuting and traffic in India
- carpooling / shared mobility
- workplace mobility
- road safety
- EVs and sustainable transport
- mobility technology or relevant policy

Do not write an advertisement. The article should teach something useful first and naturally connect to TrustRoute only where relevant.
Use fresh web research. Prefer primary sources, government sources, reputable research, and established news outlets. Do not copy wording from sources.
If a topic is dominated by rumours or cannot be verified, choose another.
Return ONLY valid JSON matching the requested schema.
The article must include source links with the source title and URL. Cite factual claims inline in the article using HTML links like <a href="URL" rel="nofollow noopener" target="_blank">Source</a>.
Write 700-1100 words in clear Indian English.
`;

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-5.6-luna",
    tools: [{ type: "web_search" }],
    include: ["web_search_call.action.sources"],
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "trustroute_blog_post",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            excerpt: { type: "string" },
            body_html: { type: "string" },
            sources: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  url: { type: "string" }
                },
                required: ["title", "url"]
              }
            }
          },
          required: ["title", "category", "excerpt", "body_html", "sources"]
        }
      }
    }
  })
});

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();
const raw = data.output_text;
if (!raw) throw new Error("OpenAI returned no output_text.");
const post = JSON.parse(raw);

function slugify(s) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 90);
}
const slug = `${slugify(post.title)}-${today}`;

const articleHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(post.title)} — TrustRoute</title>
<meta name="description" content="${escapeHtml(post.excerpt)}">
<link rel="canonical" href="https://trustroute.app/blog/${slug}.html">
<link rel="icon" href="../assets/favicon-32.png">
<link rel="stylesheet" href="../blog-article.css">
</head>
<body>
<header class="article-nav">
  <a href="../index.html" class="brand"><img src="../assets/logo.png" alt="">Trust<b>Route</b></a>
  <a href="../blog.html">← All insights</a>
</header>
<main class="article">
  <div class="eyebrow">${escapeHtml(post.category)} · ${today}</div>
  <h1>${escapeHtml(post.title)}</h1>
  <p class="dek">${escapeHtml(post.excerpt)}</p>
  <article>${post.body_html}</article>
  <div class="sources"><strong>Sources</strong><ul>${post.sources.map(s => `<li><a href="${safeUrl(s.url)}" rel="nofollow noopener" target="_blank">${escapeHtml(s.title)}</a></li>`).join("")}</ul></div>
  <div class="back"><a href="../blog.html">← Back to TrustRoute Journal</a></div>
</main>
</body>
</html>`;

await fs.mkdir(path.join(ROOT, "blog"), { recursive: true });
await fs.writeFile(path.join(ROOT, "blog", `${slug}.html`), articleHtml, "utf8");

posts.unshift({
  date: today,
  title: post.title,
  slug,
  category: post.category,
  excerpt: post.excerpt,
  sources: post.sources
});
await fs.writeFile(postsPath, JSON.stringify(posts.slice(0, 60), null, 2), "utf8");

await updateSitemap(posts);

console.log(`Published ${slug}.html`);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function safeUrl(value) {
  try {
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol)) throw new Error("bad protocol");
    return u.href.replace(/"/g, "%22");
  } catch {
    return "#";
  }
}
async function updateSitemap(allPosts) {
  const urls = [
    ["https://trustroute.app/index.html", "1.0"],
    ["https://trustroute.app/blog.html", "0.9"],
    ["https://trustroute.app/investors.html", "0.7"],
    ["https://trustroute.app/privacy.html", "0.3"],
    ["https://trustroute.app/terms.html", "0.3"],
    ...allPosts.map(p => [`https://trustroute.app/blog/${p.slug}.html`, "0.7"])
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, priority]) => `  <url><loc>${escapeXml(loc)}</loc><priority>${priority}</priority></url>`).join("\n")}
</urlset>
`;
  await fs.writeFile(path.join(ROOT, "sitemap.xml"), xml, "utf8");
}
function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, c => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;"
  }[c]));
}
