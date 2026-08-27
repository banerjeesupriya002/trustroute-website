# TrustRoute Autonomous Blog System

The website keeps its existing design and Blog tab. This workflow automates the editorial and publishing process without changing the front-end.

## What happens every day

**08:30 IST:** GitHub Actions starts the pipeline.

1. Searches the live public web for timely mobility/commuting stories and useful evergreen questions.
2. Scores candidate topics for freshness, reader value, evidence quality, TrustRoute relevance and duplication risk.
3. Reviews the previous 60 TrustRoute articles so it does not keep rewriting the same idea.
4. Writes a 900–1400 word original article using fresh research.
5. A second editorial pass independently fact-checks the draft and researches the web again.
6. The article is blocked if the editorial score is below 82/100 or key claims cannot be verified.
7. The final article gets SEO metadata, canonical URL, Open Graph metadata and Article structured data.
8. The new HTML page is added under `blog/`.
9. `blog/posts.json` is updated.
10. `sitemap.xml` is updated.
11. GitHub commits and pushes the new post, causing the normal hosting deployment to publish it.

## Editorial strategy

The system rotates across:

- Indian traffic and congestion
- Carpooling and shared mobility
- Commuting economics and empty-seat inefficiency
- Women’s commuting confidence and coordination
- Corporate/employee mobility
- Parking and road-capacity pressure
- Public-transport and first/last-mile gaps
- EVs and sustainable mobility
- Mobility technology
- Indian mobility policy/infrastructure

The goal is **people-first usefulness**, not publishing filler for SEO. Google says automatically generated content should add value and warns against scaled, unoriginal pages created primarily to manipulate rankings. This workflow therefore uses trend selection, source verification, duplication checks and a quality gate before publishing.

## One-time setup

### Required

In the GitHub repository that deploys TrustRoute:

**Settings → Secrets and variables → Actions**

Create:

- `OPENAI_API_KEY` — your OpenAI API key.

The workflow defaults to `gpt-5.6-terra`, which is designed to balance intelligence and cost and supports web search and structured outputs. You can override it with the repository variable `OPENAI_MODEL` if desired.

### Optional Slack failure alert

Create this repository secret:

- `SLACK_WEBHOOK_URL`

If the workflow fails, it sends one alert to that Slack webhook. If you do not configure it, the failure remains visible in GitHub Actions and follows your normal GitHub notification settings.

### Hosting requirement

Your normal deployment must publish repository changes after `git push`. No daily manual action is required.

## When will the first post appear?

Once `OPENAI_API_KEY` is configured and this workflow is committed to the live repository, the next scheduled run is **08:30 IST**. If that run succeeds, the article is committed and pushed automatically immediately afterward.

You can also use **Actions → Daily TrustRoute Blog → Run workflow** once to test it immediately; after that, daily runs are automatic.

## Why 08:30 IST?

For an India-focused commuter audience, morning is the most logical publication window because readers are checking commute, traffic and workplace information before the working day. Published research has found strong India engagement around the morning window, including about 09:00 IST, while more recent India-specific professional-social data also points to weekday morning engagement around 08:00–10:00 IST. 08:30 IST is therefore the starting point; later, the schedule can be changed based on TrustRoute's own analytics.

## Important trust rules

The system must never invent:

- user numbers
- city launches
- corporate partnerships
- safety guarantees
- customer stories
- quotes
- traffic statistics
- research findings
- TrustRoute capabilities

It must explain problems first and introduce TrustRoute naturally as a relevant solution. It must not turn every article into an advertisement.
