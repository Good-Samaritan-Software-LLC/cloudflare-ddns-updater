/**
 * Cloudflare Dynamic DNS Updater
 * Copyright (C) 2024 Good Samaritan Software, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * DISCLAIMER: This software is provided 'as is', without warranty of any kind,
 * express or implied. All rights not expressly granted are reserved.
 */

import 'dotenv/config';
import { getZoneId, getRecordId, getCurrentIP, updateDNS } from './services/cloudflare.js';
import { getPublicIP, validateAndFixRecordName } from './utils/ip.js';
import { POLL_TIME_IN_MS } from './utils/constants.js';

async function main() {
    if (!process.env.CF_API_TOKEN) {
        throw new Error('CF_API_TOKEN environment variable is required');
    }

    if (!process.env.CF_RECORD_NAME && !process.env.CF_RECORD_ID) {
        throw new Error('Either CF_RECORD_NAME or CF_RECORD_ID environment variable is required');
    }

    if (!process.env.CF_ZONE_NAME && !process.env.CF_ZONE_ID) {
        throw new Error('Either CF_ZONE_NAME or CF_ZONE_ID environment variable is required');
    }

    let recordName = process.env.CF_RECORD_NAME;
    let zoneName = process.env.CF_ZONE_NAME;

    // If we have a record name and zone name, validate and fix the record name
    if (recordName && zoneName) {
        try {
            recordName = validateAndFixRecordName(recordName, zoneName);
            console.log(`Using record name: ${recordName}`);
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(error.message);
            } else {
                console.error('An unknown error occurred while validating record name');
            }
            process.exit(1);
        }
    }

    // Get zone ID either from environment or by looking up the name
    const zoneId = process.env.CF_ZONE_ID || (zoneName ? await getZoneId(zoneName) : '');
    if (!zoneId) {
        throw new Error('Could not determine zone ID');
    }

    // Get record ID either from environment or by looking up the name
    const recordId = process.env.CF_RECORD_ID || (recordName ? await getRecordId(zoneId, recordName) : '');
    if (!recordId) {
        throw new Error('Could not determine record ID');
    }

    console.log('Starting DNS update service...');
    console.log(`Polling every ${POLL_TIME_IN_MS / 1000} seconds`);

    while (true) {
        try {
            const publicIP = await getPublicIP();
            const currentIP = await getCurrentIP(zoneId, recordId);

            if (publicIP !== currentIP) {
                console.log(`IP changed from ${currentIP} to ${publicIP}`);
                await updateDNS(zoneId, recordId, publicIP);
                console.log('DNS record updated successfully');
            } else {
                console.log(`IP unchanged: ${publicIP}`);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('An unknown error occurred');
            }
        }

        await new Promise(resolve => setTimeout(resolve, POLL_TIME_IN_MS));
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
