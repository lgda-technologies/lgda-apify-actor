// LGDA Wellness Music — Apify Actor.
// Buy human-recorded LGDA wellness music tracks (MP3) with published
// biometric evidence. One run = one track ($5.99) or one album ($14.99).
//
// How it works:
//   1. The buyer passes a track_id (or album_id).
//   2. The Actor fetches the audio from LGDA's public media hosting,
//      transcodes WAV masters to 320 kbps MP3 with ffmpeg, and saves the
//      file(s) to the run's key-value store.
//   3. Only then does it charge the pay-per-event price. If the charge
//      fails (buyer spending limit), the file is deleted and nothing is
//      delivered. Nothing is ever charged for undeliverable audio.
//   4. One dataset item per track records the download, the license,
//      and the track's biometric evidence summary.
//
// No audio files are bundled in this repo. No keys or tokens are used.

import { Actor, log } from 'apify';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
    TRACK_PRICE_USD,
    ALBUM_PRICE_USD,
    ARTIST,
    SELLER,
    NODE_URL,
    DISCLAIMER,
    getTrack,
    getAlbum,
} from './catalog.js';

const execFileAsync = promisify(execFile);

const TRACK_EVENT = 'track-delivered';
const ALBUM_EVENT = 'album-delivered';
const FETCH_TIMEOUT_MS = 120_000;
const FETCH_RETRIES = 2;

const LICENSE_TEXT =
    'Single-buyer license: LGDA Technologies keeps the masters and copyright ' +
    '(artist Slator Blacc). The buyer may keep and play the MP3 in sessions ' +
    'its agent runs for its own user. No resale, sharing, redistribution, ' +
    'remixing, commercial use, or model training. This dataset record is the ' +
    'proof of license.';

async function fetchWithRetries(url, log) {
    let lastError;
    for (let attempt = 1; attempt <= FETCH_RETRIES + 1; attempt += 1) {
        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                headers: { 'User-Agent': 'lgda-apify-actor/0.0' },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} fetching ${url}`);
            }
            return Buffer.from(await response.arrayBuffer());
        } catch (error) {
            lastError = error;
            log.warning(`Fetch attempt ${attempt} failed: ${error.message}`);
        }
    }
    throw lastError;
}

async function ffmpegAvailable(log) {
    try {
        await execFileAsync('ffmpeg', ['-version']);
        return true;
    } catch (error) {
        log.warning(`ffmpeg not available, WAV sources will be delivered as-is: ${error.message}`);
        return false;
    }
}

async function transcodeWavToMp3(wavPath, mp3Path, log) {
    await execFileAsync('ffmpeg', [
        '-y',
        '-i', wavPath,
        '-codec:a', 'libmp3lame',
        '-b:a', '320k',
        mp3Path,
    ]);
    log.info(`Transcoded ${wavPath} to 320 kbps MP3`);
}

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { track_id: trackId, album_id: albumId } = input;

// ---------------------------------------------------------------------------
// Resolve the purchase: album wins if both are given; at least one is required.
// ---------------------------------------------------------------------------
let tracks = [];
let eventName;
let priceUsd;
let purchaseLabel;

if (albumId) {
    const album = getAlbum(albumId);
    if (!album) {
        await Actor.pushData({
            error: true,
            error_code: 'album_not_found',
            error_message: `Unknown album_id: ${albumId}. See the Actor README for the catalog.`,
            album_id: albumId,
        });
        await Actor.exit();
        process.exit(0);
    }
    if (!album.available_via_actor) {
        await Actor.pushData({
            error: true,
            error_code: 'album_not_available_via_actor',
            error_message: `Album "${album.title}" is not sold through this Actor yet (its tracks have no hosted audio). Buy it through the LGDA node instead: ${NODE_URL}`,
            album_id: albumId,
            album: album.title,
        });
        await Actor.exit();
        process.exit(0);
    }
    tracks = album.track_ids.map((id) => getTrack(id));
    eventName = ALBUM_EVENT;
    priceUsd = ALBUM_PRICE_USD;
    purchaseLabel = `album "${album.title}"`;
} else if (trackId) {
    const track = getTrack(trackId);
    if (!track) {
        await Actor.pushData({
            error: true,
            error_code: 'track_not_found',
            error_message: `Unknown track_id: ${trackId}. See the Actor README for the catalog.`,
            track_id: trackId,
        });
        await Actor.exit();
        process.exit(0);
    }
    if (!track.available_via_actor) {
        await Actor.pushData({
            error: true,
            error_code: 'track_not_available_via_actor',
            error_message: `Track "${track.title}" is not sold through this Actor yet (no hosted audio). Buy it through the LGDA node instead: ${NODE_URL}`,
            track_id: trackId,
            track: track.title,
        });
        await Actor.exit();
        process.exit(0);
    }
    tracks = [track];
    eventName = TRACK_EVENT;
    priceUsd = TRACK_PRICE_USD;
    purchaseLabel = `track "${track.title}"`;
} else {
    await Actor.pushData({
        error: true,
        error_code: 'missing_input',
        error_message: 'Provide track_id (one track, $5.99) or album_id (one album of 3 tracks, $14.99).',
    });
    await Actor.exit();
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Budget pre-check: never start work the buyer cannot pay for.
// ACTOR_MAX_TOTAL_CHARGE_USD is set by the platform from the buyer's run limit.
// ---------------------------------------------------------------------------
let maxCharge = Number.NaN;
try {
    maxCharge = Actor.getChargingManager().getMaxTotalChargeUsd();
} catch {
    // ChargingManager not initialized (e.g. local run without test mode):
    // fall back to the raw env var.
    maxCharge = Number.parseFloat(process.env.ACTOR_MAX_TOTAL_CHARGE_USD ?? '');
}
if (Number.isFinite(maxCharge) && maxCharge < priceUsd) {
    await Actor.pushData({
        error: true,
        error_code: 'spending_limit_too_low',
        error_message: `This run's spending limit ($${maxCharge}) is below the price of ${purchaseLabel} ($${priceUsd}). Raise maxTotalChargeUsd and run again. Nothing was charged.`,
        price_usd: priceUsd,
        spending_limit_usd: maxCharge,
    });
    await Actor.exit();
    process.exit(0);
}

const canTranscode = await ffmpegAvailable(log);
const kvStore = await Actor.openKeyValueStore();
const storeId = kvStore.id;
const runId = process.env.APIFY_ACTOR_RUN_ID ?? `local-${randomUUID()}`;
const savedKeys = [];
const prepared = [];

try {
    for (const track of tracks) {
        log.info(`Fetching ${track.title} (${track.track_id})...`);
        const sourceBuffer = await fetchWithRetries(track.audio_url, log);
        const workDir = tmpdir();
        const baseName = `${track.track_id}-${randomUUID()}`;
        const sourceExt = track.source_format === 'wav' ? 'wav' : 'mp3';
        const sourcePath = join(workDir, `${baseName}.${sourceExt}`);
        await writeFile(sourcePath, sourceBuffer);

        let fileBuffer = sourceBuffer;
        let format = sourceExt;
        if (sourceExt === 'wav' && canTranscode) {
            const mp3Path = join(workDir, `${baseName}.mp3`);
            try {
                await transcodeWavToMp3(sourcePath, mp3Path, log);
                fileBuffer = await readFile(mp3Path);
                format = 'mp3';
                await unlink(mp3Path).catch(() => {});
            } catch (error) {
                // Graceful fallback: deliver the WAV master as-is rather than failing.
                log.warning(`Transcode failed for ${track.track_id}, delivering WAV as-is: ${error.message}`);
                format = 'wav';
            }
        }
        await unlink(sourcePath).catch(() => {});

        const key = `${track.track_id}.${format}`;
        await kvStore.setValue(key, fileBuffer, {
            contentType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        });
        savedKeys.push(key);
        prepared.push({ track, key, format, fileSizeBytes: fileBuffer.length });
        log.info(`Saved ${key} (${fileBuffer.length} bytes) to key-value store`);
    }
} catch (error) {
    // Fetch/transcode failure: clean up anything saved, charge nothing.
    for (const key of savedKeys) {
        await kvStore.setValue(key, null).catch(() => {});
    }
    await Actor.pushData({
        error: true,
        error_code: 'delivery_failed',
        error_message: `Could not prepare ${purchaseLabel}: ${error.message}. Nothing was charged.`,
        price_usd: priceUsd,
    });
    await Actor.exit();
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Charge only after the files are saved and available. If the charge does not
// go through (spending limit), delete the files and deliver nothing.
// ---------------------------------------------------------------------------
const chargeResult = await Actor.charge({
    eventName,
    idempotencyKey: `${runId}:${eventName}`,
});

if (!chargeResult || chargeResult.chargedCount < 1) {
    for (const key of savedKeys) {
        await kvStore.setValue(key, null).catch(() => {});
    }
    await Actor.pushData({
        error: true,
        error_code: 'charge_failed',
        error_message: `The $${priceUsd} charge for ${purchaseLabel} did not go through (buyer spending limit). The files were removed and nothing was delivered. Raise maxTotalChargeUsd and run again.`,
        price_usd: priceUsd,
        event: eventName,
    });
    await Actor.exit();
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Deliver: one dataset item per track with the download, the license, and the
// track's biometric evidence summary.
// ---------------------------------------------------------------------------
log.info(`Charged ${eventName} ($${priceUsd}) — delivering ${prepared.length} track${prepared.length === 1 ? '' : 's'}`);
for (const { track, key, format, fileSizeBytes } of prepared) {
    const item = {
        track_id: track.track_id,
        title: track.title,
        album_id: track.album_id,
        album: track.album,
        artist: ARTIST,
        seller: SELLER,
        price_usd: priceUsd,
        event_charged: eventName,
        purchase: eventName === ALBUM_EVENT ? 'album' : 'track',
        format,
        file_size_bytes: fileSizeBytes,
        file_key: key,
        key_value_store_id: storeId,
        download_url: `https://api.apify.com/v2/key-value-stores/${storeId}/records/${key}`,
        download_via_mcp: 'Use the Apify MCP server get-key-value-store-record tool with this key_value_store_id and file_key.',
        license: LICENSE_TEXT,
        evidence: {
            valid_sessions: track.evidence.valid_sessions,
            mean_rmssd_ms: track.evidence.mean_rmssd_ms,
            mean_heart_rate_bpm: track.evidence.mean_heart_rate_bpm,
            note: 'Mean heart-rate-variability (RMSSD) measured by camera during biometric sessions while this track played. Values describe the sessions, not proof the music caused them.',
        },
        disclaimer: DISCLAIMER,
        try_it_free: 'https://lgda-technologies.github.io/lgda-room/',
        node: NODE_URL,
    };
    await Actor.pushData(item);
    log.info(`Delivered ${track.title} (${format}, ${fileSizeBytes} bytes)`);
}

await Actor.exit();
