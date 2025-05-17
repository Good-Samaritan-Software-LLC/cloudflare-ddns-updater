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
import { IP_CHECK_URL } from './constants.js';

export async function getPublicIP(): Promise<string> {
    const res = await fetch(IP_CHECK_URL);
    const body = await res.text();
    const m = body.match(/Current IP Address: ([\d.]+)/);
    if (!m) throw new Error('Could not parse public IP');
    return m[1];
}

export function validateAndFixRecordName(recordName: string, zoneName: string): string {
    if (!recordName.includes('.') || !recordName.endsWith(zoneName)) {
        const fixedName = recordName.endsWith('.') ?
            `${recordName}${zoneName}` :
            `${recordName}.${zoneName}`;

        console.warn(`\n⚠️  Warning: Record name "${recordName}" is not fully qualified.`);
        console.warn(`   Automatically appending zone name "${zoneName}" to create "${fixedName}".`);
        console.warn(`   For better clarity, use the fully qualified name in your configuration.\n`);

        return fixedName;
    }
    return recordName;
} 