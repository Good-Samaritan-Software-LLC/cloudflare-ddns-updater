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

import fetch from 'node-fetch';
import { CloudflareResponse, CloudflareDNSRecord, CloudflareZone, CloudflareDNSRecords } from '../types/index.js';
import { CLOUDFLARE_API_BASE, CLOUDFLARE_API_HEADERS, DNS_RECORD_TYPE, DNS_RECORD_TTL, DNS_RECORD_PROXIED } from '../utils/constants.js';

// Cache for zone and record IDs
let cachedZoneId: string | null = null;
let cachedRecordId: string | null = null;

export async function getZoneId(zoneName: string): Promise<string> {
    if (cachedZoneId) return cachedZoneId;

    if (process.env.CF_ZONE_ID) {
        cachedZoneId = process.env.CF_ZONE_ID;
        return cachedZoneId;
    }

    const url = `${CLOUDFLARE_API_BASE}/zones`;
    const res = await fetch(url, {
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

    cachedZoneId = zone.id;
    return zone.id;
}

export async function getRecordId(zoneId: string, recordName: string): Promise<string> {
    if (cachedRecordId) return cachedRecordId;

    if (process.env.CF_RECORD_ID) {
        cachedRecordId = process.env.CF_RECORD_ID;
        return cachedRecordId;
    }

    const url = `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`;
    const res = await fetch(url, {
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

    cachedRecordId = record.id;
    return record.id;
}

export async function getCurrentIP(zoneId: string, recordId: string): Promise<string> {
    const url = `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records/${recordId}`;
    const res = await fetch(url, {
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
    const res = await fetch(url, {
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