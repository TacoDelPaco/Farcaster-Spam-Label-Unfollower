/**
 * Farcaster Unfollow Script
 *
 * This script fetches a list of Farcaster FIDs from a specified Dune Analytics query
 * and unfollows them using the Neynar API.
 *
 * WARNING: This script performs irreversible actions. Use it at your own risk.
 * Always review the Dune query and the list of FIDs before confirming the unfollow action.
 */

import axios from 'axios';
import 'dotenv/config';
import pLimit from 'p-limit';
import readlineSync from 'readline-sync';

// --- CONFIGURATION ---
const DUNE_API_KEY = process.env.DUNE_API_KEY;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const FARCASTER_SIGNER_UUID = process.env.FARCASTER_SIGNER_UUID;
const TARGET_FID = process.env.TARGET_FID;

// The ID of the Dune query to execute.
// Found from the URL: https://dune.com/nhejyht/farcaster-followers-audit
const DUNE_QUERY_ID = 3533118;

const DUNE_API_URL = 'https://api.dune.com/api/v1';
const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster';

// Concurrency limit to avoid spamming the Neynar API
const limit = pLimit(5);

/**
 * A simple logger
 */
const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`\x1b[33m[WARN] ${msg}\x1b[0m`),
    error: (msg) => console.error(`\x1b[31m[ERROR] ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m[SUCCESS] ${msg}\x1b[0m`),
};

/**
 * Helper function to introduce a delay.
 * @param {number} ms - The delay in milliseconds.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches the list of FIDs to unfollow from the Dune Analytics query.
 * @returns {Promise<number[]>} A promise that resolves to an array of FIDs.
 */
async function fetchFidsToUnfollow() {
    log.info(`Executing Dune query (ID: ${DUNE_QUERY_ID}) for target FID: ${TARGET_FID}...`);

    try {
        // 1. Start query execution
        const executeResponse = await axios.post(
            `${DUNE_API_URL}/query/${DUNE_QUERY_ID}/execute`, {
                query_parameters: {
                    fid_t90e29: Number(TARGET_FID)
                },
            }, {
                headers: {
                    'X-DUNE-API-KEY': DUNE_API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        const executionId = executeResponse.data.execution_id;
        if (!executionId) {
            throw new Error('Failed to get execution ID from Dune.');
        }

        log.info(`Dune execution started with ID: ${executionId}. Waiting for results...`);

        // 2. Poll for results
        let status;
        do {
            await sleep(3000); // Wait 3 seconds between checks
            const statusResponse = await axios.get(
                `${DUNE_API_URL}/execution/${executionId}/status`, {
                    headers: { 'X-DUNE-API-KEY': DUNE_API_KEY },
                }
            );
            status = statusResponse.data;

            if (status.state === 'QUERY_STATE_FAILED') {
                throw new Error(`Dune query failed: ${status.error}`);
            }
            log.info(`Query state: ${status.state}...`);
        } while (status.state !== 'QUERY_STATE_COMPLETED');

        // 3. Fetch final results
        const resultsResponse = await axios.get(
            `${DUNE_API_URL}/execution/${executionId}/results`, {
                headers: { 'X-DUNE-API-KEY': DUNE_API_KEY },
            }
        );

        const fids = resultsResponse.data.result.rows.map(row => row.profile_id);
        log.success(`Found ${fids.length} FIDs to unfollow.`);
        return fids;

    } catch (error) {
        log.error('Error fetching data from Dune API.');
        if (error.response) {
            log.error(`Status: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            log.error(error.message);
        }
        return [];
    }
}

/**
 * Unfollows a list of Farcaster users via the Neynar API.
 * @param {number[]} fids - An array of FIDs to unfollow.
 */
async function unfollowFids(fids) {
    if (fids.length === 0) {
        log.warn('No FIDs to unfollow. Exiting.');
        return;
    }

    log.info(`Preparing to unfollow ${fids.length} users.`);

    // Batching FIDs for the Neynar API call (max 100 per request)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < fids.length; i += batchSize) {
        batches.push(fids.slice(i, i + batchSize));
    }

    log.info(`Splitting into ${batches.length} batch(es).`);

    const unfollowPromises = batches.map((batch, index) => limit(async () => {
        try {
            log.info(`Processing batch ${index + 1}/${batches.length} with ${batch.length} FIDs...`);
            const response = await axios.delete(
                `${NEYNAR_API_URL}/user/follow`, {
                    headers: {
                        'api_key': NEYNAR_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        signer_uuid: FARCASTER_SIGNER_UUID,
                        target_fids: batch,
                    },
                }
            );

            if (response.data.success) {
                log.success(`Batch ${index + 1} processed successfully.`);
            } else {
                log.warn(`Batch ${index + 1} processed with issues.`);
            }
        } catch (error) {
            log.error(`Failed to process batch ${index + 1}.`);
            if (error.response) {
                log.error(`Status: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else {
                log.error(error.message);
            }
        }
    }));

    await Promise.all(unfollowPromises);
    log.success('All unfollow operations completed.');
}

/**
 * Main function to run the script.
 */
async function main() {
    console.log('--- Farcaster Follower Audit & Unfollow Script ---');

    // Validate environment variables
    if (!DUNE_API_KEY || !NEYNAR_API_KEY || !FARCASTER_SIGNER_UUID || !TARGET_FID) {
        log.error('One or more required environment variables are missing.');
        log.error('Please check your .env file.');
        return;
    }

    const fids = await fetchFidsToUnfollow();

    if (fids && fids.length > 0) {
        console.log('\n--- FIDs to Unfollow ---');
        console.log(fids.join(', '));
        console.log('---');

        const answer = readlineSync.question(
            `\n\x1b[33m[CONFIRMATION] Do you want to unfollow these ${fids.length} users? (yes/no): \x1b[0m`
        );

        if (answer.toLowerCase() === 'yes') {
            await unfollowFids(fids);
        } else {
            log.info('Unfollow action cancelled by user.');
        }
    } else {
        log.info('No FIDs flagged for unfollowing based on the Dune query.');
    }
}

main().catch(error => {
    log.error('An unexpected error occurred:');
    log.error(error);
});

