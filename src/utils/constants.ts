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

export const POLL_TIME_IN_MS = process.env.POLL_TIME_IN_MS ? parseInt(process.env.POLL_TIME_IN_MS) : 5 * 60 * 1000;
export const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';
export const CLOUDFLARE_API_HEADERS = {
    'Content-Type': 'application/json'
};
export const IP_CHECK_URL = 'http://checkip.dyndns.org/';
export const DNS_RECORD_TYPE = 'A';
export const DNS_RECORD_TTL = 1;
export const DNS_RECORD_PROXIED = false; 