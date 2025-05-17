import fetch from 'node-fetch';

const WAIT_TIME_IN_MS = 10 * 1000;

interface CloudflareResponse {
    success: boolean;
    errors?: Array<{
        code: number;
        message: string;
    }>;
}

interface CloudflareDNSRecord {
    result: {
        content: string;
    };
}

async function getPublicIP(): Promise<string> {
    const res = await fetch('http://checkip.dyndns.org/');
    const body = await res.text();
    const m = body.match(/Current IP Address: ([\d.]+)/);
    if (!m) throw new Error('Could not parse public IP');
    return m[1];
}

async function getCurrentIP(): Promise<string> {
    const url = `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/dns_records/${process.env.CF_RECORD_ID}`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    const data = await res.json() as CloudflareResponse & CloudflareDNSRecord;
    if (!data.success) {
        console.error('Cloudflare error', data.errors);
        throw new Error('Failed to get current DNS record');
    }
    return data.result.content;
}

async function updateDNS(ip: string): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/dns_records/${process.env.CF_RECORD_ID}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'A',
            name: 'charger.cfl.biz',
            content: ip,
            ttl: 1,
            proxied: false
        })
    });
    const data = await res.json() as CloudflareResponse;
    if (!data.success) {
        console.error('Cloudflare error', data.errors);
        throw new Error('Failed to update DNS');
    }
}

async function main() {
    let lastIP = '';
    while (true) {
        try {
            const publicIP = await getPublicIP();
            const currentIP = await getCurrentIP();

            if (publicIP !== currentIP) {
                await updateDNS(publicIP);
                console.log(`Updated IP from ${currentIP} to ${publicIP}`);
                lastIP = publicIP;
            } else {
                console.log(`IP ${publicIP} is already up to date`);
            }
        } catch (e) {
            console.error(e);
        }
        // wait 5 minutes
        await new Promise(r => setTimeout(r, WAIT_TIME_IN_MS));
    }
}

main().catch(console.error);
