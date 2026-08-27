# TrustRoute Daily Blog Automation

The website now includes a Blog tab and an automated daily publishing pipeline.

## One-time setup

1. Put this project in the GitHub repository that deploys the TrustRoute website.
2. In **GitHub → Settings → Secrets and variables → Actions**, create:
   - `OPENAI_API_KEY` — your OpenAI API key.
3. Ensure your hosting/deployment pipeline publishes the repository after a push.

The workflow runs daily at **09:00 IST** and can also be started manually from GitHub Actions.

## What happens automatically

- OpenAI web search researches a fresh topic from the public internet.
- The model selects a useful topic relevant to commuting, mobility, safety, sustainability or related policy.
- It drafts an original 700–1100 word article with source links.
- A dated article page is created under `blog/`.
- `blog/posts.json` is updated so the Blog page immediately lists the new article.
- `sitemap.xml` is updated with the new article.
- The workflow commits the changes back to the repository.

No daily manual drafting or posting is required after the one-time API-secret/deployment setup.

## Important

The automation is intentionally designed to **research first and write second**, rather than blindly copying news. It also keeps source links with each article so readers can verify the information.
