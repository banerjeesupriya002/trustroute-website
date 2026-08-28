import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";
const minQualityScore = 82;

/* =========================================================
   APPROVED TRUSTROUTE CATEGORIES
   ========================================================= */

const APPROVED_CATEGORIES = [
  "Carpooling",
  "Traffic & Commuting",
  "Women's Safety",
  "Corporate Mobility",
  "Road Safety",
  "Sustainable Mobility",
  "Commuter Insights"
];

/*
 * Normalize any accidental/legacy category returned by AI.
 *
 * IMPORTANT:
 * The website must ONLY receive one of the approved
 * TrustRoute categories above.
 */
function normalizeCategory(category) {
  const value = String(category || "").trim();

  /* Already correct */
  if (APPROVED_CATEGORIES.includes(value)) {
    return value;
  }

  const lower = value.toLowerCase();

  /* Corporate / employer / workplace related */
  if (
    lower.includes("employer") ||
    lower.includes("workplace") ||
    lower.includes("corporate") ||
    lower.includes("employee") ||
    lower.includes("office mobility") ||
    lower.includes("employee mobility")
  ) {
    return "Corporate Mobility";
  }

  /* Women's safety */
  if (
    lower.includes("women") ||
    lower.includes("female commuter") ||
    lower.includes("women's")
  ) {
    return "Women's Safety";
  }

  /* Road safety */
  if (
    lower.includes("road safety") ||
    lower.includes("road-safety") ||
    lower.includes("driving safety") ||
    lower.includes("traffic safety") ||
    lower.includes("accident")
  ) {
    return "Road Safety";
  }

  /* Sustainable mobility */
  if (
    lower.includes("sustain") ||
    lower.includes("sustainable") ||
    lower.includes("carbon") ||
    lower.includes("emission") ||
    lower.includes("ev ") ||
    lower === "ev" ||
    lower.includes("electric vehicle")
  ) {
    return "Sustainable Mobility";
  }

  /* Carpooling */
  if (
    lower.includes("carpool") ||
    lower.includes("car pool") ||
    lower.includes("shared ride") ||
    lower.includes("shared rides") ||
    lower.includes("ride sharing") ||
    lower.includes("ridesharing")
  ) {
    return "Carpooling";
  }

  /* Traffic / commuting */
  if (
    lower.includes("traffic") ||
    lower.includes("congestion") ||
    lower.includes("commut") ||
    lower.includes("parking")
  ) {
    return "Traffic & Commuting";
  }

  /*
   * Safe fallback.
   *
   * Never allow an unknown category to reach the website.
   */
  return "Commuter Insights";
}


/* =========================================================
   ENVIRONMENT CHECK
   ========================================================= */

if (!apiKey) {
  throw new Error("OPENAI_API_KEY GitHub secret is required.");
}


/* =========================================================
   LOAD POSTS
   ========================================================= */

const postsPath = path.join(ROOT, "blog", "posts.json");
const posts = JSON.parse(await fs.readFile(postsPath, "utf8"));


/* =========================================================
   DATE
   ========================================================= */

function istDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

const today = istDate();


/* =========================================================
   PREVENT DUPLICATE DAILY POST
   ========================================================= */

if (posts.some(p => p.date === today)) {
  console.log(`A post for ${today} already exists.`);
  process.exit(0);
}


/* =========================================================
   RECENT ARTICLE HISTORY
   ========================================================= */

const recentHistory = posts.slice(0, 60).map(p => ({
  date: p.date,
  title: p.title,
  category: p.category,
  excerpt: p.excerpt
}));


/* =========================================================
   EDITORIAL PILLARS
   ========================================================= */

const editorialPillars = [
  "Why India needs practical carpooling and shared commuting",
  "Traffic congestion, road capacity, parking pressure and the cost of empty car seats",
  "Women's commuting confidence, identity verification, trip visibility and coordination",
  "Corporate mobility, employee transportation, parking, sustainability and commute productivity",
  "Carpooling economics: fuel, tolls, parking and household commute costs",
  "Live location, group chat and technology that improves pickup/drop coordination",
  "Road safety and responsible shared mobility",
  "EVs, emissions and the role of shared rides in sustainable mobility",
  "Public transport gaps, first/last-mile connectivity and multimodal commuting",
  "Relevant Indian mobility policy, infrastructure and urban-development changes"
];


/* =========================================================
   TOPIC SELECTION PROMPT
   ========================================================= */

const topicPrompt = `
You are TrustRoute's autonomous editorial strategist for India.

Today is ${today} (IST).

Select ONE high-value topic for today's TrustRoute Journal article.

MISSION

Find a genuinely useful topic that an Indian office commuter, woman commuter, HR leader, facilities leader, employer, mobility professional, or city resident would care about.

The article must teach the reader something substantial and then naturally explain why verified, coordinated carpooling is increasingly relevant.

TrustRoute should be positioned as a practical example of that solution, never as a forced advertisement.

TREND DISCOVERY

Use fresh public web research.

Look for developments from the last 7 days when a current-news angle exists, while also allowing evergreen topics when they have stronger reader value.

Consider:

${editorialPillars.map(x => `- ${x}`).join("\n")}

Examples of angles:

- traffic/congestion stories
- major bus or public-transport crowding
- parking pressure
- commuting costs
- women commuting safety
- corporate transport strategy
- empty-seat inefficiency
- carpooling benefits
- shared mobility
- EV/shared-ride interaction
- first/last-mile gaps
- road-safety developments
- new mobility policy

QUALITY RULES

- Prefer primary, government, research and credible news sources.
- Do not invent statistics, quotes, events, studies or company claims.
- Do not use a topic merely because it is trending; it must be relevant to TrustRoute's intended audience.
- Avoid topics substantially overlapping with recent articles.
- Do not select a topic that requires unsupported claims about TrustRoute.
- Prefer a topic with a strong factual backbone and a clear practical takeaway.

RECENT TRUSTROUTE ARTICLES:

${JSON.stringify(recentHistory)}

CATEGORY RULE

The category MUST be exactly ONE of these seven values:

- Carpooling
- Traffic & Commuting
- Women's Safety
- Corporate Mobility
- Road Safety
- Sustainable Mobility
- Commuter Insights

NEVER create, invent, abbreviate, modify, rename or use any other category.

For employer, workplace, employee transportation, corporate commute, office mobility or business mobility topics, use:

Corporate Mobility

Return ONLY JSON with:

{
  "title": "working title",
  "angle": "why this topic is timely/useful",
  "category": "one approved TrustRoute category",
  "reason": "why this is the best topic today",
  "source_urls": ["credible URL", "credible URL"]
}
`;


/* =========================================================
   SELECT TOPIC
   ========================================================= */

const topic = await callOpenAI({
  model,
  apiKey,
  input: topicPrompt,
  tools: [{ type: "web_search" }],
  schemaName: "trustroute_topic",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string"
      },

      angle: {
        type: "string"
      },

      category: {
        type: "string",
        enum: APPROVED_CATEGORIES
      },

      reason: {
        type: "string"
      },

      source_urls: {
        type: "array",
        items: {
          type: "string"
        }
      }
    },

    required: [
      "title",
      "angle",
      "category",
      "reason",
      "source_urls"
    ]
  }
});


/*
 * HARD SAFETY CHECK
 *
 * Even though the schema already restricts the category,
 * normalize it before sending it to the writer.
 */
topic.category = normalizeCategory(topic.category);


/* =========================================================
   WRITER PROMPT
   ========================================================= */

const writerPrompt = `
You are the senior writer for TrustRoute Journal, an India-focused mobility publication.

Today: ${today} IST

Selected topic:
${topic.title}

Editorial angle:
${topic.angle}

Category:
${topic.category}

The category has already been selected from TrustRoute's approved category list.

Preserve it exactly.

Do not rename it.
Do not invent another category.

Why selected:
${topic.reason}

Candidate sources:
${JSON.stringify(topic.source_urls)}

Write a genuinely useful, original article for Indian readers.

Research the topic again on the public web before writing.

Use fresh sources and verify every factual claim.

ARTICLE GOAL

The reader should finish thinking:

"I understand this commuting problem better, and I understand why a verified, coordinated carpool network is a practical part of the answer."

TRUSTROUTE POSITIONING

Mention TrustRoute naturally, usually after the problem and evidence have been explained.

Explain relevant product ideas accurately when applicable:

- Aadhaar/eKYC verification
- employer trust signals
- driver/vehicle checks
- fixed fares
- group chat
- live location
- reliability information
- women-only ride matching
- direct rider-to-owner payment

Do not claim TrustRoute guarantees safety, eliminates traffic, is the safest service, has partnerships, users, cities, statistics or outcomes unless explicitly supported by the provided site context or a source.

STYLE

- 900-1400 words.
- Clear Indian English.
- Strong opening.
- Useful subheadings.
- Practical examples.
- No generic AI openings such as "In today's fast-paced world".
- No keyword stuffing.
- No fake quotes.
- No fabricated first-hand experiences.
- No sensationalism.
- Do not simply rewrite one news article.
- Synthesize multiple sources and add analysis.
- If the topic is news-driven, clearly distinguish confirmed facts from interpretation.
- Use HTML only in body_html.
- Include inline source links for important factual claims using:
  <a href="URL" rel="nofollow noopener" target="_blank">Source</a>
- Finish with a useful takeaway and a restrained TrustRoute connection.
- Do not finish with a hard sales pitch.

CATEGORY

The final category must remain exactly:

${topic.category}

Return ONLY the requested JSON.
`;


/* =========================================================
   WRITE ARTICLE
   ========================================================= */

const draft = await callOpenAI({
  model,
  apiKey,
  input: writerPrompt,
  tools: [{ type: "web_search" }],
  schemaName: "trustroute_blog_draft",
  schema: blogSchema()
});


/* =========================================================
   FINAL EDITOR PROMPT
   ========================================================= */

const editorPrompt = `
You are the final fact-checking editor for TrustRoute Journal.

Review the proposed article below.

Research the public web again and independently verify the important factual claims.

Reject or repair:

- unsupported claims
- outdated numbers
- weak sources
- duplicated ideas
- generic AI phrasing
- excessive promotion
- statements that overpromise TrustRoute's capabilities

A GOOD ARTICLE MUST:

1. Be useful even if the reader never uses TrustRoute.
2. Add analysis instead of merely summarizing sources.
3. Use credible and relevant sources.
4. Avoid fabricated statistics, quotes, partnerships, customer stories or safety guarantees.
5. Explain why the issue matters to Indian commuters/corporates/women where relevant.
6. Connect TrustRoute naturally and accurately.
7. Avoid substantial overlap with these recent titles:

${JSON.stringify(recentHistory.slice(0, 30))}

CATEGORY RULE

The article category MUST be exactly ONE of:

- Carpooling
- Traffic & Commuting
- Women's Safety
- Corporate Mobility
- Road Safety
- Sustainable Mobility
- Commuter Insights

NEVER create or return:

- Employer Mobility
- Workplace Mobility
- Employee Mobility
- Office Mobility
- Shared Mobility
- Urban Mobility
- any other category

If the article concerns employers, workplaces, employee transportation, corporate commute or business mobility, the correct category is:

Corporate Mobility

If any key claim cannot be verified, rewrite it conservatively or remove it.

If the topic itself has become unsuitable or unverifiable, set publish=false.

ARTICLE:

${JSON.stringify(draft)}

Return the corrected final article in the same schema plus:

- quality_score: integer 0-100
- publish: boolean
- editor_notes: short string
`;


/* =========================================================
   FINAL EDITOR
   ========================================================= */

const edited = await callOpenAI({
  model,
  apiKey,
  input: editorPrompt,
  tools: [{ type: "web_search" }],
  schemaName: "trustroute_blog_editor",
  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      title: {
        type: "string"
      },

      category: {
        type: "string",
        enum: APPROVED_CATEGORIES
      },

      excerpt: {
        type: "string"
      },

      body_html: {
        type: "string"
      },

      sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,

          properties: {
            title: {
              type: "string"
            },

            url: {
              type: "string"
            }
          },

          required: [
            "title",
            "url"
          ]
        }
      },

      quality_score: {
        type: "integer",
        minimum: 0,
        maximum: 100
      },

      publish: {
        type: "boolean"
      },

      editor_notes: {
        type: "string"
      }
    },

    required: [
      "title",
      "category",
      "excerpt",
      "body_html",
      "sources",
      "quality_score",
      "publish",
      "editor_notes"
    ]
  }
});


/*
 * FINAL HARD CATEGORY ENFORCEMENT
 *
 * This is the last protection before anything is written
 * to posts.json or published to the website.
 */
edited.category = normalizeCategory(edited.category);


/* =========================================================
   EDITORIAL QUALITY GATE
   ========================================================= */

if (!edited.publish || edited.quality_score < minQualityScore) {
  throw new Error(
    `Editorial gate blocked publication. score=${edited.quality_score}; publish=${edited.publish}; notes=${edited.editor_notes}`
  );
}


const post = edited;


/* =========================================================
   SLUG
   ========================================================= */

const slug = `${slugify(post.title)}-${today}`;


/* =========================================================
   ARTICLE PATH
   ========================================================= */

const articlePath = path.join(
  ROOT,
  "blog",
  `${slug}.html`
);


/* =========================================================
   ARTICLE HTML
   ========================================================= */

const articleHtml = `<!doctype html>
<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>${escapeHtml(post.title)} — TrustRoute</title>

<meta
  name="description"
  content="${escapeHtml(post.excerpt)}"
>

<link
  rel="canonical"
  href="https://trustroute.app/blog/${slug}.html"
>

<link
  rel="icon"
  href="../assets/favicon-32.png"
>

<link
  rel="stylesheet"
  href="../blog-article.css"
>

<meta
  property="og:title"
  content="${escapeHtml(post.title)} — TrustRoute"
>

<meta
  property="og:description"
  content="${escapeHtml(post.excerpt)}"
>

<meta
  property="og:type"
  content="article"
>

<meta
  property="og:url"
  content="https://trustroute.app/blog/${slug}.html"
>

<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  description: post.excerpt,
  datePublished: today,
  dateModified: today,
  mainEntityOfPage:
    `https://trustroute.app/blog/${slug}.html`,
  publisher: {
    "@type": "Organization",
    name: "TrustRoute",
    url: "https://trustroute.app/"
  }
})}</script>

</head>

<body>

<header class="article-nav">

  <a
    href="../index.html"
    class="brand"
  >
    <img
      src="../assets/logo.png"
      alt=""
    >
    Trust<b>Route</b>
  </a>

  <a href="../blog.html">
    ← All insights
  </a>

</header>


<main class="article">

  <div class="eyebrow">
    ${escapeHtml(post.category)} · ${today}
  </div>

  <h1>
    ${escapeHtml(post.title)}
  </h1>

  <p class="dek">
    ${escapeHtml(post.excerpt)}
  </p>

  <article>
    ${post.body_html}
  </article>


  <div class="sources">

    <strong>Sources</strong>

    <ul>

      ${post.sources
        .map(
          s =>
            `<li>
              <a
                href="${safeUrl(s.url)}"
                rel="nofollow noopener"
                target="_blank"
              >
                ${escapeHtml(s.title)}
              </a>
            </li>`
        )
        .join("")}

    </ul>

  </div>


  <div class="back">

    <a href="../blog.html">
      ← Back to TrustRoute Journal
    </a>

  </div>

</main>

</body>

</html>`;


/* =========================================================
   ENSURE BLOG DIRECTORY
   ========================================================= */

await fs.mkdir(
  path.join(ROOT, "blog"),
  {
    recursive: true
  }
);


/* =========================================================
   WRITE ARTICLE
   ========================================================= */

await fs.writeFile(
  articlePath,
  articleHtml,
  "utf8"
);


/* =========================================================
   UPDATE POSTS.JSON
   ========================================================= */

posts.unshift({
  date: today,
  title: post.title,
  slug,
  category: post.category,
  excerpt: post.excerpt,
  sources: post.sources
});


await fs.writeFile(
  postsPath,
  JSON.stringify(posts.slice(0, 60), null, 2),
  "utf8"
);


/* =========================================================
   UPDATE SITEMAP
   ========================================================= */

await updateSitemap(posts);


/* =========================================================
   SUCCESS LOG
   ========================================================= */

console.log(
  JSON.stringify({
    published: true,
    title: post.title,
    slug,
    category: post.category,
    quality_score: edited.quality_score,
    date: today
  })
);


/* =========================================================
   OPENAI
   ========================================================= */

async function callOpenAI({
  model,
  apiKey,
  input,
  tools,
  schemaName,
  schema
}) {

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        model,

        reasoning: {
          effort: "medium"
        },

        tools,

        input,

        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema
          }
        }
      })
    }
  );


  if (!response.ok) {
    throw new Error(
      `OpenAI API error: ${await response.text()}`
    );
  }


  const data = await response.json();


  /*
   * IMPORTANT FIX
   *
   * Do NOT rely only on:
   *
   * data.output_text
   *
   * With Responses API + web_search +
   * structured JSON output, the response text
   * can be nested inside:
   *
   * data.output[].content[]
   *
   * Therefore we extract the text robustly.
   */

  const text = extractResponseText(data);


  if (!text) {

    const outputTypes =
      Array.isArray(data.output)
        ? data.output
            .map(item => item?.type || "unknown")
            .join(", ")
        : "none";

    throw new Error(
      `OpenAI returned no text content. output_types=${outputTypes}`
    );
  }


  try {

    return JSON.parse(text);

  } catch (err) {

    throw new Error(
      `OpenAI returned non-JSON text: ${text.slice(0, 500)}`
    );
  }
}


/* =========================================================
   RESPONSE TEXT EXTRACTION
   ========================================================= */

function extractResponseText(data) {

  /*
   * First support the convenient top-level field
   * if OpenAI provides it.
   */

  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {

    return data.output_text.trim();
  }


  /*
   * Otherwise inspect the Responses API output.
   */

  const parts = [];


  for (const item of data?.output || []) {

    for (const content of item?.content || []) {

      if (
        typeof content?.text === "string" &&
        content.text.trim()
      ) {

        parts.push(content.text.trim());
      }
    }
  }


  return parts.join("\n").trim();
}


/* =========================================================
   BLOG SCHEMA
   ========================================================= */

function blogSchema() {

  return {

    type: "object",

    additionalProperties: false,

    properties: {

      title: {
        type: "string"
      },

      category: {
        type: "string",
        enum: APPROVED_CATEGORIES
      },

      excerpt: {
        type: "string"
      },

      body_html: {
        type: "string"
      },

      sources: {

        type: "array",

        items: {

          type: "object",

          additionalProperties: false,

          properties: {

            title: {
              type: "string"
            },

            url: {
              type: "string"
            }

          },

          required: [
            "title",
            "url"
          ]
        }
      }
    },

    required: [
      "title",
      "category",
      "excerpt",
      "body_html",
      "sources"
    ]
  };
}


/* =========================================================
   SLUG
   ========================================================= */

function slugify(s) {

  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[c]
    );
}


/* =========================================================
   SAFE URL
   ========================================================= */

function safeUrl(value) {

  try {

    const u = new URL(value);

    if (
      !["https:", "http:"].includes(u.protocol)
    ) {

      throw new Error("bad protocol");
    }

    return u.href.replace(/"/g, "%22");

  } catch {

    return "#";
  }
}


/* =========================================================
   XML ESCAPE
   ========================================================= */

function escapeXml(value) {

  return String(value).replace(
    /[<>&'"]/g,
    c =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;"
      })[c]
  );
}


/* =========================================================
   SITEMAP
   ========================================================= */

async function updateSitemap(allPosts) {

  const urls = [

    [
      "https://trustroute.app/",
      "1.0"
    ],

    [
      "https://trustroute.app/blog.html",
      "0.9"
    ],

    [
      "https://trustroute.app/investors.html",
      "0.7"
    ],

    [
      "https://trustroute.app/privacy.html",
      "0.3"
    ],

    [
      "https://trustroute.app/terms.html",
      "0.3"
    ],

    ...allPosts.map(
      p => [
        `https://trustroute.app/blog/${p.slug}.html`,
        "0.7"
      ]
    )

  ];


  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ([loc, priority]) =>
      `  <url><loc>${escapeXml(loc)}</loc><priority>${priority}</priority></url>`
  )
  .join("\n")}
</urlset>
`;


  await fs.writeFile(
    path.join(ROOT, "sitemap.xml"),
    xml,
    "utf8"
  );
}
