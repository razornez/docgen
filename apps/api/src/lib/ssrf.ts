/**
 * Proteksi SSRF (Server-Side Request Forgery) untuk URL webhook.
 * Blokir IP privat, loopback, dan link-local (termasuk AWS metadata 169.254.169.254).
 */

const PRIVATE_RANGES: [number, number][] = [
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 (link-local & AWS metadata)
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0x64400000, 0x647fffff], // 100.64.0.0/10 (shared address space)
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  '[::1]',
  'ip6-localhost',
  'ip6-loopback',
]);

function ipv4ToNum(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return -1;
  return (
    (((+parts[0]! & 0xff) << 24) |
      ((+parts[1]! & 0xff) << 16) |
      ((+parts[2]! & 0xff) << 8) |
      (+parts[3]! & 0xff)) >>>
    0
  );
}

function isPrivateIpv4(host: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const num = ipv4ToNum(host);
  return PRIVATE_RANGES.some(([lo, hi]) => num >= lo && num <= hi);
}

/**
 * Lempar Error bila URL mengarah ke host internal/privat.
 * Sinkron — hanya memeriksa literal hostname/IP tanpa DNS lookup.
 */
export function assertNotSsrf(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL tidak valid');
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host) || isPrivateIpv4(host)) {
    throw new Error('Webhook URL tidak boleh mengarah ke host internal');
  }
}
