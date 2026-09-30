// ============================================================
// Network Utility Functions
// ============================================================

let _idCounter = 0;

export function generateId(prefix = 'id'): string {
  _idCounter += 1;
  return `${prefix}-${Date.now()}-${_idCounter}`;
}

export function generateMac(): string {
  const hex = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

/** Convert dotted-decimal IP to 32-bit integer */
export function ipToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/** Convert 32-bit integer to dotted-decimal IP */
export function intToIp(n: number): string {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.');
}

/** Return true if two IPs are in the same subnet */
export function isSameSubnet(
  ip1: string,
  ip2: string,
  mask: string
): boolean {
  const m = ipToInt(mask);
  return (ipToInt(ip1) & m) === (ipToInt(ip2) & m);
}

/** Return network address */
export function getNetworkAddress(ip: string, mask: string): string {
  return intToIp(ipToInt(ip) & ipToInt(mask));
}

/** Return broadcast address */
export function getBroadcastAddress(ip: string, mask: string): string {
  return intToIp((ipToInt(ip) & ipToInt(mask)) | (~ipToInt(mask) >>> 0));
}

/** Convert CIDR prefix to subnet mask (e.g. 24 → "255.255.255.0") */
export function cidrToMask(prefix: number): string {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return intToIp(mask);
}

/** Parse "192.168.1.0/24" into { network, mask } */
export function parseCIDR(cidr: string): { network: string; mask: string } {
  const [network, prefix] = cidr.split('/');
  return { network, mask: cidrToMask(parseInt(prefix, 10)) };
}

/** Check if IP is valid IPv4 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

/** Increment an IP address by 1 */
export function incrementIP(ip: string): string {
  return intToIp(ipToInt(ip) + 1);
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/** Format Mbps to human-readable string */
export function formatBandwidth(mbps: number): string {
  if (mbps < 1) return `${(mbps * 1000).toFixed(0)} Kbps`;
  if (mbps < 1000) return `${mbps.toFixed(1)} Mbps`;
  return `${(mbps / 1000).toFixed(2)} Gbps`;
}

/** Get current simulation timestamp */
export function now(): number {
  return Date.now();
}
