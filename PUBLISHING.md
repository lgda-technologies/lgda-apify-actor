# Publishing the LGDA Wellness Music Actor

This file is for the operator publishing this Actor to the Apify Store.
Everything here is a Console (browser) step — no CLI is needed. Do not
run any of this without the LGDA owner: account creation needs his email
verification, and payout setup (KYC) is his.

## 0. What is already done

- Actor code, input/output/dataset schemas, Dockerfile, README, logo
  (`logo.png`), and the pay-per-event event definitions
  (`.actor/pay_per_event.json`) are in this repo and pushed to GitHub.
- The Actor was tested locally (see the build report at
  `~/workspace/apify-actor-build.md` for exactly what was and was not
  verified). The Docker image build itself happens on Apify's platform
  at publish time and was NOT built locally (no Docker on the build VM).

## 1. Create the Apify account (owner)

- Sign up at https://console.apify.com with the LGDA business email.
  Email verification is required; the owner must do this himself.
- Free plan is enough to build and publish. No card is needed to
  publish; a card/payout method is needed later for payouts (step 5).

## 2. Create the Actor from this GitHub repo

- Console → Actors → Create new Actor → choose the GitHub option
  ("Host your code on GitHub" / Git repository source).
- Point it at `https://github.com/lgda-technologies/lgda-apify-actor`,
  branch `main`. Apify installs its GitHub App (or a webhook) so every
  push to `main` triggers a fresh build automatically. No CLI, no
  `apify push` — `git push` is the deploy.
- The Actor name should be `lgda-wellness-music` (matches
  `.actor/actor.json`). The first build compiles the Dockerfile
  (Node 22 + ffmpeg) on Apify's platform — watch the build log for the
  `apt-get install ffmpeg` step.
- Run one test run from Console with input `{"track_id": "higher-ground"}`
  and confirm: the run succeeds, the dataset item looks right, and the
  MP3 is in the run's key-value store. (Test runs by the author use the
  author's own compute, not the buyer's.)

## 3. Monetization setup (pay-per-event)

Console → the Actor → Monetization (or Publication → Monetization).
Set the pricing model to **Pay per event** and add these two events
(exact definitions in `.actor/pay_per_event.json` — paste from there):

| Event | Title | Price (USD) |
| --- | --- | --- |
| `track-delivered` | Track delivered | 5.99 |
| `album-delivered` | Album delivered | 14.99 |

Then:

- **Keep** the synthetic `apify-actor-start` event at its default
  $0.00005 (it covers the first 5 seconds of compute per run).
- **Remove** the synthetic `apify-default-dataset-item` event. The
  dataset item IS the delivery record; charging for it separately would
  bill the buyer twice for one purchase.
- Set the minimum user spending limit (`minimalMaxTotalChargeUsd`) to
  **5.99** so a run cannot start without budget for at least one track.
- Do NOT turn on "Pay per event + usage" (passing platform costs to the
  buyer). The event prices already cover the tiny compute cost, and the
  toggle hurts pricing transparency and the Actor quality score.
- Payout billing info must exist before monetization can be saved
  (Apify errors `cannot-monetize-without-payout-billing-info`
  otherwise) — see step 5 first if the save fails.

Revenue share: the seller keeps **80%** of event revenue minus platform
compute costs. At $5.99/track that is $4.79 before the small compute
cost of a run (a few cents of download + transcode).

## 4. Publish to the Store

Console → the Actor → **Publication** tab. The Publish button stays
hidden until every section is complete:

- **Logo**: upload `logo.png` from this repo (the LGDA mark).
- **Description**: the README is the Store listing text; make sure the
  short description matches it.
- **Monetization**: step 3 above.
- **Sample output**: run the Actor once (step 2) and use that run's
  dataset item as the sample.
- **Schemas**: input, output, and dataset schemas ship in `.actor/`.
- **Permission level**: keep the default **limited permissions**. The
  Actor only fetches a public URL and writes to its own run storage —
  it needs nothing else. Limited permissions are REQUIRED for the Actor
  to appear in agentic discovery (the Apify MCP server's
  `search-actors` only returns free and pay-per-event Actors that pass
  the agent-safety filters, and full-permission Actors need a one-time
  human approval before an agent can call them).
- **Categories**: pick the closest fit (no music category exists; use
  the most sensible available one and rely on the README/SEO text).

Do NOT enable Standby mode: Standby Actors are excluded from direct
x402 agentic payments.

Once published, the Actor is automatically eligible for agentic
payments — no separate opt-in. Agents find it through the Apify MCP
server (`https://mcp.apify.com`) via `search-actors` /
`fetch-actor-details`, then pay per run.

## 5. Payouts (owner, later — needed before the first payout, not before publishing)

- Seller KYC + payout method in Console (PayPal or bank). Payouts are
  monthly. Minimum payout: **$20 via PayPal, $100 via other methods**.
  Until the balance reaches the minimum, earnings accrue.
- This is the owner's identity and bank/PayPal — nobody else can do it.

## 6. How agents pay (for the listing text and for support questions)

- **Apify account holders**: the run bills to their Apify balance
  (card/credits) at the event price. Works today.
- **AGI token (recommended for agents without an account)**:
  the agent buys a prepaid, spend-capped Apify API token at
  https://agi.apify.com with an x402 (USDC on Base) payment, minimum
  $1, then uses it as a normal Bearer token. A token of $6+ covers a
  $5.99 track run. Tokens last 14 days; unused balance is NOT refunded.
- **Direct x402 via mcpc**: pays USDC on Base per request with no
  account — BUT mcpc signs a fixed **$1.00** prepayment, which does
  NOT cover a $5.99 track run. Direct x402 buyers must use the AGI
  token route (above) until/unless mcpc supports larger prepayments.
  (Verified against the Apify MCP server docs, Nov 2026.)
- **Skyfire**: PAY token (minimum $5.00); a $6+ token covers a track.

## 7. After publishing — verify

- `search-actors` on https://mcp.apify.com for "LGDA" returns the Actor.
- `fetch-actor-details` shows the input schema and the $5.99/$14.99 pricing.
- One paid test run (author's own account or an AGI token) delivers
  the MP3 end to end, and the binary download works via the MCP
  `get-key-value-store-record` tool — that last step was NOT verifiable
  before publishing and is the one thing to confirm live.
