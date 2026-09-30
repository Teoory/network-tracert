import React, { useState, useMemo } from 'react';

function ipToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.');
}

function intToBinary(int: number): string {
  return [
    ((int >>> 24) & 255).toString(2).padStart(8, '0'),
    ((int >>> 16) & 255).toString(2).padStart(8, '0'),
    ((int >>> 8) & 255).toString(2).padStart(8, '0'),
    (int & 255).toString(2).padStart(8, '0'),
  ].join('.');
}

export const SubnetCalculator: React.FC = () => {
  const [ip, setIp] = useState('192.168.1.50');
  const [cidr, setCidr] = useState(24);

  const calc = useMemo(() => {
    try {
      const parts = ip.split('.');
      if (parts.length !== 4 || parts.some((p) => isNaN(Number(p)) || Number(p) < 0 || Number(p) > 255)) {
        return null;
      }
      const ipNum = ipToInt(ip);
      const maskNum = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
      const wildcardNum = (~maskNum) >>> 0;
      const networkNum = (ipNum & maskNum) >>> 0;
      const broadcastNum = (networkNum | wildcardNum) >>> 0;

      const totalHosts = cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.pow(2, 32 - cidr);
      const usableHosts = cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.max(0, totalHosts - 2);

      const firstHost = cidr >= 31 ? networkNum : networkNum + 1;
      const lastHost = cidr >= 31 ? broadcastNum : broadcastNum - 1;

      // IP Class
      const firstOctet = Number(parts[0]);
      let ipClass = 'A';
      if (firstOctet >= 128 && firstOctet <= 191) ipClass = 'B';
      else if (firstOctet >= 192 && firstOctet <= 223) ipClass = 'C';
      else if (firstOctet >= 224 && firstOctet <= 239) ipClass = 'D (Multicast)';
      else if (firstOctet >= 240) ipClass = 'E (Experimental)';

      const isPrivate =
        (firstOctet === 10) ||
        (firstOctet === 172 && Number(parts[1]) >= 16 && Number(parts[1]) <= 31) ||
        (firstOctet === 192 && Number(parts[1]) === 168);

      return {
        ip,
        cidr,
        netmask: intToIp(maskNum),
        wildcard: intToIp(wildcardNum),
        networkAddress: intToIp(networkNum),
        broadcastAddress: intToIp(broadcastNum),
        firstUsable: intToIp(firstHost),
        lastUsable: intToIp(lastHost),
        totalHosts,
        usableHosts,
        ipClass,
        isPrivate,
        ipBinary: intToBinary(ipNum),
        maskBinary: intToBinary(maskNum),
        networkBinary: intToBinary(networkNum),
      };
    } catch {
      return null;
    }
  }, [ip, cidr]);

  return (
    <div style={{ padding: '16px', color: '#e2e8f0', height: '100%', overflowY: 'auto', fontSize: '13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '18px' }}>🧮</span>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
          IPv4 Subnet & CIDR Calculator
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
            IP Address
          </label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          />
        </div>

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
            Prefix / CIDR (/{cidr})
          </label>
          <select
            value={cidr}
            onChange={(e) => setCidr(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '13px',
            }}
          >
            {Array.from({ length: 32 }, (_, i) => 32 - i).map((c) => (
              <option key={c} value={c}>
                /{c} ({intToIp(c === 0 ? 0 : (~0 << (32 - c)) >>> 0)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {calc ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Main details card */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Subnet Summary
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Network Address:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#a78bfa' }}>{calc.networkAddress}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Subnet Mask:</span>
                <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{calc.netmask}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Wildcard Mask:</span>
                <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{calc.wildcard}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Broadcast Address:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f43f5e' }}>{calc.broadcastAddress}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Usable Host Range:</span>
                <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{calc.firstUsable} – {calc.lastUsable}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Usable Hosts:</span>
                <span style={{ fontWeight: 600, color: '#38bdf8' }}>{calc.usableHosts.toLocaleString()} hosts</span>
              </div>
            </div>
          </div>

          {/* Classification & Binary */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Classification & Binary Representation
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>IP Class:</span>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Class {calc.ipClass}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Address Type:</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: calc.isPrivate ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                  color: calc.isPrivate ? '#34d399' : '#60a5fa',
                  border: `1px solid ${calc.isPrivate ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                }}>
                  {calc.isPrivate ? 'RFC 1918 Private' : 'Public Internet'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Binary Breakdown:</div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', background: '#020617', padding: '10px', borderRadius: '6px', lineHeight: 1.6 }}>
              <div><span style={{ color: '#94a3b8' }}>IP:   </span><span style={{ color: '#38bdf8' }}>{calc.ipBinary}</span></div>
              <div><span style={{ color: '#94a3b8' }}>Mask: </span><span style={{ color: '#a78bfa' }}>{calc.maskBinary}</span></div>
              <div><span style={{ color: '#94a3b8' }}>Net:  </span><span style={{ color: '#34d399' }}>{calc.networkBinary}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#ef4444', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
          Invalid IP Address format. Please enter a valid IPv4 address (e.g. 192.168.1.1).
        </div>
      )}
    </div>
  );
};

export default SubnetCalculator;
