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

interface DNSRecord {
    recordName: string;
    zoneName: string;
    zoneId: string;
    recordId: string;
}

async function initializeDNSRecords(): Promise<DNSRecord[]> {
    if (!process.env.CF_API_TOKEN) {
        throw new Error('CF_API_TOKEN environment variable is required');
    }

    if (!process.env.CF_RECORD_NAMES) {
        throw new Error('CF_RECORD_NAMES environment variable is required (comma-separated list of record names)');
    }

    const recordNames = process.env.CF_RECORD_NAMES.split(',').map(name => name.trim());
    const dnsRecords: DNSRecord[] = [];

    for (const recordName of recordNames) {
        // For root records (e.g., nomnotes.app), use the entire domain as both record and zone name
        // For subdomains (e.g., sub.example.com), extract the zone name from the last two parts
        const parts = recordName.split('.');
        if (parts.length < 2) {
            throw new Error(`Invalid record name format: ${recordName}`);
        }

        // If it's a root record (e.g., nomnotes.app), use the entire domain as zone name
        // If it's a subdomain (e.g., sub.example.com), use the last two parts
        const zoneName = parts.length === 2 ? recordName : parts.slice(-2).join('.');

        try {
            const validatedRecordName = validateAndFixRecordName(recordName, zoneName);
            console.log(`Using record name: ${validatedRecordName}`);

            const zoneId = await getZoneId(zoneName);
            if (!zoneId) {
                throw new Error(`Could not find zone ID for ${zoneName}`);
            }

            const recordId = await getRecordId(zoneId, validatedRecordName);
            if (!recordId) {
                throw new Error(`Could not find record ID for ${validatedRecordName}`);
            }

            dnsRecords.push({
                recordName: validatedRecordName,
                zoneName,
                zoneId,
                recordId
            });
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`Error initializing record ${recordName}:`, error.message);
            } else {
                console.error(`An unknown error occurred while initializing record ${recordName}`);
            }
            process.exit(1);
        }
    }

    return dnsRecords;
}

async function updateDNSRecords(dnsRecords: DNSRecord[], publicIP: string) {
    const updatePromises = dnsRecords.map(async (record) => {
        try {
            const currentIP = await getCurrentIP(record.zoneId, record.recordId);

            if (publicIP !== currentIP) {
                console.log(`IP changed for ${record.recordName} from ${currentIP} to ${publicIP}`);
                await updateDNS(record.zoneId, record.recordId, publicIP);
                console.log(`DNS record ${record.recordName} updated successfully`);
            } else {
                console.log(`IP unchanged for ${record.recordName}: ${publicIP}`);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`Error updating ${record.recordName}:`, error.message);
            } else {
                console.error(`An unknown error occurred while updating ${record.recordName}`);
            }
        }
    });

    await Promise.all(updatePromises);
}

async function main() {
    const dnsRecords = await initializeDNSRecords();

    console.log('Starting DNS update service...');
    console.log(`Polling every ${POLL_TIME_IN_MS / 1000} seconds`);
    console.log(`Monitoring ${dnsRecords.length} DNS records`);

    while (true) {
        try {
            const publicIP = await getPublicIP();
            await updateDNSRecords(dnsRecords, publicIP);
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
