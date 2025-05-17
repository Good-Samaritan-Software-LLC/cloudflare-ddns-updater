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

export interface CloudflareResponse {
    success: boolean;
    errors?: Array<{
        code: number;
        message: string;
    }>;
}

export interface CloudflareDNSRecord {
    result: {
        content: string;
    };
}

export interface CloudflareZone {
    result: Array<{
        id: string;
        name: string;
    }>;
}

export interface CloudflareDNSRecords {
    result: Array<{
        id: string;
        name: string;
        type: string;
    }>;
} 