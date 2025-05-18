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

import fetch, { RequestInit, Response } from 'node-fetch';
import { CloudflareResponse, CloudflareDNSRecord, CloudflareZone, CloudflareDNSRecords } from '../types/index.js';
import { CLOUDFLARE_API_BASE, CLOUDFLARE_API_HEADERS, DNS_RECORD_TYPE, DNS_RECORD_TTL, DNS_RECORD_PROXIED } from '../utils/constants.js';

// Cache for zone and record IDs using Maps
const zoneIdCache = new Map<string, string>();
const recordIdCache = new Map<string, string>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_REQUESTS_PER_WINDOW = 1000; // Conservative limit to stay well under Cloudflare's limit
const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

// Rate limiting state
let requestCount = 0;
let windowStart = Date.now();

async function makeRequest(url: string, options?: RequestInit): Promise<Response> {
    let retries = 0;

    while (true) {
        // Check if we need to reset the rate limit window
        const now = Date.now();
        if (now - windowStart >= RATE_LIMIT_WINDOW) {
            requestCount = 0;
            windowStart = now;
        }

        // Check if we're over the rate limit
        if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
            const waitTime = RATE_LIMIT_WINDOW - (now - windowStart);
            console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            requestCount = 0;
            windowStart = Date.now();
        }

        try {
            requestCount++;
            const response = await fetch(url, options);

            // Check for rate limit headers
            const remaining = response.headers.get('cf-ratelimit-remaining');
            const reset = response.headers.get('cf-ratelimit-reset');

            if (remaining && parseInt(remaining) < 10) {
                console.warn(`Warning: Approaching Cloudflare rate limit. ${remaining} requests remaining.`);
            }

            if (response.status === 429) { // Too Many Requests
                const retryAfter = response.headers.get('retry-after');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * Math.pow(2, retries);
                console.log(`Rate limited by Cloudflare. Waiting ${waitTime / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retries++;
                if (retries >= MAX_RETRIES) {
                    throw new Error('Max retries exceeded for rate limit');
                }
                continue;
            }

            return response;
        } catch (error) {
            if (retries >= MAX_RETRIES) {
                throw error;
            }
            retries++;
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
        }
    }
}

export async function getZoneId(zoneName: string): Promise<string> {
    // Check cache first
    const cachedZoneId = zoneIdCache.get(zoneName);
    if (cachedZoneId) return cachedZoneId;

    // Check environment variable
    if (process.env.CF_ZONE_ID) {
        zoneIdCache.set(zoneName, process.env.CF_ZONE_ID);
        return process.env.CF_ZONE_ID;
    }

    const url = `${CLOUDFLARE_API_BASE}/zones`;
    const res = await makeRequest(url, {
        headers: {
            ...CLOUDFLARE_API_HEADERS,
            Authorization: `Bearer ${process.env.CF_API_TOKEN}`
        }
    });
    const data = await res.json() as CloudflareResponse & CloudflareZone;

    if (!data.success) {
        console.error('Cloudflare error', data.errors);
        throw new Error('Failed to get zones');
    }

    const zone = data.result.find(z => z.name === zoneName);
    if (!zone) {
        throw new Error(`Zone ${zoneName} not found`);
    }

    console.warn(`\n⚠️  Warning: Zone ID looked up for "${zoneName}".`);
    console.warn(`   For better performance, set CF_ZONE_ID=${zone.id} in your configuration.\n`);

    // Cache the zone ID
    zoneIdCache.set(zoneName, zone.id);
    return zone.id;
}

export async function getRecordId(zoneId: string, recordName: string): Promise<string> {
    // Create a cache key combining zone ID and record name
    const cacheKey = `${zoneId}:${recordName}`;

    // Check cache first
    const cachedRecordId = recordIdCache.get(cacheKey);
    if (cachedRecordId) return cachedRecordId;

    // Check environment variable
    if (process.env.CF_RECORD_ID) {
        recordIdCache.set(cacheKey, process.env.CF_RECORD_ID);
        return process.env.CF_RECORD_ID;
    }

    const url = `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`;
    const res = await makeRequest(url, {
        headers: {
            ...CLOUDFLARE_API_HEADERS,
            Authorization: `Bearer ${process.env.CF_API_TOKEN}`
        }
    });
    const data = await res.json() as CloudflareResponse & CloudflareDNSRecords;

    if (!data.success) {
        console.error('Cloudflare error', data.errors);
        throw new Error('Failed to get DNS records');
    }

    const record = data.result.find(r => r.name === recordName && r.type === DNS_RECORD_TYPE);
    if (!record) {
        throw new Error(`${DNS_RECORD_TYPE} record ${recordName} not found in zone ${zoneId}`);
    }

    console.warn(`\n⚠️  Warning: Record ID looked up for "${recordName}".`);
    console.warn(`   For better performance, set CF_RECORD_ID=${record.id} in your configuration.\n`);

    // Cache the record ID
    recordIdCache.set(cacheKey, record.id);
    return record.id;
}

export async function getCurrentIP(zoneId: string, recordId: string): Promise<string> {
    const url = `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records/${recordId}`;
    const res = await makeRequest(url, {
        headers: {
            ...CLOUDFLARE_API_HEADERS,
            Authorization: `Bearer ${process.env.CF_API_TOKEN}`
        }
    });
    const data = await res.json() as CloudflareResponse & CloudflareDNSRecord;
    if (!data.success) {
        console.error('Cloudflare error', data.errors);
        throw new Error('Failed to get current DNS record');
    }
    return data.result.content;
}

export async function updateDNS(zoneId: string, recordId: string, ip: string): Promise<void> {
    const url = `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records/${recordId}`;
    const res = await makeRequest(url, {
        method: 'PUT',
        headers: {
            ...CLOUDFLARE_API_HEADERS,
            Authorization: `Bearer ${process.env.CF_API_TOKEN}`
        },
        body: JSON.stringify({
            type: DNS_RECORD_TYPE,
            name: process.env.CF_RECORD_NAME,
            content: ip,
            ttl: DNS_RECORD_TTL,
            proxied: DNS_RECORD_PROXIED
        })
    });
    const data = await res.json() as CloudflareResponse;
    if (!data.success) {
        console.error('Cloudflare error', data.errors);
        throw new Error('Failed to update DNS');
    }
}