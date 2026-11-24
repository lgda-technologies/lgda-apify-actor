# LGDA Wellness Music — Buy Human-Recorded Tracks with Biometric Evidence

Buy LGDA Technologies wellness music with no account and no crypto wallet setup beyond your Apify balance: one run delivers one human-recorded track as an MP3 for **$5.99**, or a full 3-track album for **$14.99**. Every delivery includes a single-buyer license record and the track's published biometric evidence summary — heart-rate variability (RMSSD) measured by camera during real sessions while the music played.

This is the only human-recorded music in the agent-music category with published biometric evidence. Everything else agents can buy is AI-generated.

## What you get

- The real MP3 file (320 kbps), saved to your run's key-value store, ready to download.
- One dataset item per track with the download link, the license terms, and the evidence summary.
- A single-buyer license: keep and play the MP3 in sessions your agent runs for its own user.

## Pricing (pay-per-event)

| Event | Price | What it covers |
| --- | --- | --- |
| `track-delivered` | $5.99 | One track delivered as an MP3 |
| `album-delivered` | $14.99 | One full album (3 tracks) delivered as MP3s — saves $2.98 vs 3 tracks separately |

You are charged only after the file is saved and available. If the delivery fails, or your spending limit blocks the charge, the file is deleted and **nothing is charged**. Set `maxTotalChargeUsd` to at least $5.99 (track) or $14.99 (album) when you run it.

## Input

| Field | Type | Description |
| --- | --- | --- |
| `track_id` | string | Buy ONE track ($5.99). Pick from the catalog below. |
| `album_id` | string | Buy ONE album of 3 tracks ($14.99). If given, it wins over `track_id`. |

Provide `track_id` OR `album_id`. Example input: `{"track_id": "higher-ground"}`.

## Output

**Dataset** — one item per delivered track:

| Field | What it is |
| --- | --- |
| `track_id`, `title`, `album`, `artist` | What you bought |
| `price_usd`, `event_charged` | What you paid |
| `format`, `file_size_bytes` | The delivered file (mp3, 320 kbps) |
| `download_url` | API URL of the MP3 in the run's key-value store |
| `file_key`, `key_value_store_id` | Use these with the Apify MCP server `get-key-value-store-record` tool to download the file |
| `license` | Single-buyer license terms |
| `evidence` | Biometric evidence summary for the track (see below) |

**Key-value store** — the MP3 file itself, under the key `<track_id>.mp3`.

## The evidence

LGDA measures the nervous system while the music plays: a camera reads heart rate and heart-rate variability (RMSSD) during a session. The evidence numbers in each delivery are the mean RMSSD across valid recorded sessions for that track.

Honest reading: the numbers describe what was measured *during* the music. They are not proof the music caused the numbers. Tracks with no sessions yet show nulls — that is a gap in the data, not a claim.

Strongest evidence so far: Higher Ground, 520.8 ms mean RMSSD across 9 valid sessions; The Golden Child, 429.8 ms across 6.

## Catalog

| Track | Album | Price | Evidence | Available here |
| --- | --- | --- | --- | --- |
| Midnight (`midnight`) | Black Foot Ronin Vol. Two | $5.99 | 140.5 ms mean RMSSD (4 valid sessions) | Yes |
| The Southside (`the-southside`) | Black Foot Ronin Vol. Two | $5.99 | No sessions yet | Yes |
| Innocence (`innocence`) | Black Foot Ronin Vol. Two | $5.99 | No sessions yet | Yes |
| Noir (`noir`) | Black Foot Ronin | $5.99 | No sessions yet | Yes |
| Done Told Y'all (`done-told-y-all`) | Black Foot Ronin | $5.99 | No sessions yet | Yes |
| I Did It (`i-did-it`) | Black Foot Ronin | $5.99 | No sessions yet | Yes |
| Tokyo (`tokyo`) | In The Desert | $5.99 | No sessions yet | Yes |
| Yellow Italy (`yellow-italy`) | In The Desert | $5.99 | No sessions yet | Yes |
| 31 Wings (`31-wings`) | In The Desert | $5.99 | No sessions yet | Yes |
| Grand Entrance (`grand-entrance`) | 75 Maryvale's | $5.99 | 313.1 ms mean RMSSD (3 valid sessions) | Yes |
| Stone Mountain (`stone-mountain`) | 75 Maryvale's | $5.99 | No sessions yet | Yes |
| OsoEastLakePark (`osoeastlakepark`) | 75 Maryvale's | $5.99 | No sessions yet | Yes |
| BLUE BEAMER (`blue-beamer`) | Porter Ave | $5.99 | No sessions yet | Yes |
| HIGHER GROUND (`higher-ground`) | Porter Ave | $5.99 | 520.8 ms mean RMSSD (9 valid sessions) | Yes |
| TRIPPER (`tripper`) | Porter Ave | $5.99 | No sessions yet | Yes |
| Won't Shake (`wont-shake`) | From Darkness Came Dust | $5.99 | No sessions yet | Yes |
| Out The Window (`out-the-window`) | From Darkness Came Dust | $5.99 | No sessions yet | Yes |
| The Antidote (`the-antidote`) | From Darkness Came Dust | $5.99 | No sessions yet | Yes |
| The Golden Child (`the-golden-child`) | The Golden Child | $5.99 | 429.8 ms mean RMSSD (6 valid sessions) | Yes |
| Been With Us (`been-with-us`) | The Golden Child | $5.99 | 371.7 ms mean RMSSD (1 valid session) | Yes |
| No Conversation (`no-conversation`) | The Golden Child | $5.99 | No sessions yet | Yes |
| Black Summer (`black-summer`) | Bungaloo Blue | $5.99 | 391.7 ms mean RMSSD (1 valid session) | Yes |
| Who? (`who`) | Bungaloo Blue | $5.99 | No sessions yet | Yes |
| Red Light (`red-light`) | Bungaloo Blue | $5.99 | No sessions yet | Yes |
| One Of Us (`one-of-us`) | Bungaloo Blue Vol. Two | $5.99 | No sessions yet | Yes |
| Toothpick (`toothpick`) | Bungaloo Blue Vol. Two | $5.99 | No sessions yet | Yes |
| Pay Off (`pay-off`) | Bungaloo Blue Vol. Two | $5.99 | No sessions yet | Yes |

### Albums

| Album | Tracks | Price | Available here |
| --- | --- | --- | --- |
| Black Foot Ronin Vol. Two (`black-foot-ronin-vol-two`) | 3 | $14.99 | Yes |
| Black Foot Ronin (`black-foot-ronin`) | 3 | $14.99 | Yes |
| In The Desert (`in-the-desert`) | 3 | $14.99 | Yes |
| 75 Maryvale's (`75-maryvale-s`) | 3 | $14.99 | Yes |
| Porter Ave (`porter-ave`) | 3 | $14.99 | Yes |
| From Darkness Came Dust (`from-darkness-came-dust`) | 3 | $14.99 | Yes |
| The Golden Child (`the-golden-child`) | 3 | $14.99 | Yes |
| Bungaloo Blue (`bungaloo-blue`) | 3 | $14.99 | Yes |
| Bungaloo Blue Vol. Two (`bungaloo-blue-vol-two`) | 3 | $14.99 | Yes |

All 27 tracks and all 9 albums are available through this Actor.

## License

Every purchase is a single-buyer license, not a sale of the music. LGDA Technologies keeps the masters and copyright (artist Slator Blacc). The buyer may keep and play the MP3 in sessions its agent runs for its own user. No resale, sharing, redistribution, remixing, commercial use, or model training. The dataset record from your run is the proof of license.

## Try it free first

Run a free biometric session in your browser and watch your own numbers move before you buy: https://lgda-technologies.github.io/lgda-room/

## Disclaimer

Wellness music. Not a medical device; rPPG-derived HRV values are estimates; for research and educational use only.

## Links

- LGDA node (direct x402 purchase, all 27 tracks): https://lgda-music.fly.dev
- LGDA Room (free try-it session): https://lgda-technologies.github.io/lgda-room/
- LGDA Technologies (human storefront): https://lgda-technologies.base44.app
