import React, { useState } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import type { Packet } from '../../types';

// Helper to generate realistic hex dump for packets
function generateHexDump(packet: Packet): Array<{ offset: string; hex: string; ascii: string }> {
  // Construct a synthetic byte buffer representing the packet headers & payload
  const bytes: number[] = [];

  // L2 Ethernet Frame (14 bytes)
  const srcMacBytes = (packet.ethernet?.srcMac || '00:11:22:33:44:55')
    .split(':')
    .map((h) => parseInt(h, 16) || 0);
  const dstMacBytes = (packet.ethernet?.dstMac || 'ff:ff:ff:ff:ff:ff')
    .split(':')
    .map((h) => parseInt(h, 16) || 0);

  bytes.push(...dstMacBytes.slice(0, 6));
  bytes.push(...srcMacBytes.slice(0, 6));
  bytes.push(0x08, 0x00); // EtherType IPv4

  // L3 IPv4 Header (20 bytes)
  if (packet.ip) {
    bytes.push(0x45, 0x00); // Version 4, IHL 5, DSCP 0
    bytes.push((packet.size >> 8) & 0xff, packet.size & 0xff); // Total Length
    bytes.push(0x1c, 0x46); // Identification
    bytes.push(0x40, 0x00); // Flags: Don't fragment
    bytes.push(packet.ttl, packet.protocol === 'ICMP' ? 0x01 : packet.protocol === 'TCP' ? 0x06 : 0x11); // TTL & Protocol
    bytes.push(0x6b, 0xa1); // Checksum

    const srcIpBytes = packet.ip.srcIp.split('.').map(Number);
    const dstIpBytes = packet.ip.dstIp.split('.').map(Number);
    bytes.push(...srcIpBytes.slice(0, 4));
    bytes.push(...dstIpBytes.slice(0, 4));
  }

  // Payload bytes based on protocol
  const payloadStr = packet.application
    ? JSON.stringify(packet.application.data)
    : `${packet.protocol} Echo Data Payload [ID:${packet.id.slice(0, 8)}]`;

  for (let i = 0; i < Math.min(64, payloadStr.length); i++) {
    bytes.push(payloadStr.charCodeAt(i));
  }

  // Group into 16-byte rows
  const rows: Array<{ offset: string; hex: string; ascii: string }> = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const offset = i.toString(16).padStart(4, '0');
    const hex = chunk.map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = chunk
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    rows.push({
      offset,
      hex: hex.padEnd(47, ' '),
      ascii,
    });
  }

  return rows;
}

export default function PacketInspector() {
  const { selectedPacketId, packets } = useNetworkStore();
  const [activeTab, setActiveTab] = useState<'layers' | 'hexdump' | 'route'>('layers');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    frame: true,
    eth: true,
    ip: true,
    transport: true,
    app: true,
  });

  const packet = selectedPacketId ? packets[selectedPacketId] : null;

  if (!packet) {
    return (
      <div className="empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
          No Packet Selected
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Click any row in the Packet Capture table to inspect detailed OSI headers and hex bytes.
        </div>
      </div>
    );
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const statusColors: Record<string, string> = {
    DELIVERED: '#10b981',
    DROPPED: '#ef4444',
    EXPIRED: '#f59e0b',
    BLOCKED: '#ef4444',
    FORWARDED: '#3b82f6',
    CREATED: '#94a3b8',
    QUEUED: '#94a3b8',
  };

  const hexRows = generateHexDump(packet);

  return (
    <div className="inspector-content animate-fade-in" style={{ padding: '12px', fontSize: '12px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
            {packet.id}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Captured at {new Date(packet.timestamp).toLocaleTimeString()}
          </div>
        </div>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 700,
            background: `${statusColors[packet.status] ?? '#64748b'}20`,
            color: statusColors[packet.status] ?? '#64748b',
            border: `1px solid ${statusColors[packet.status] ?? '#64748b'}40`,
          }}
        >
          ● {packet.status}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-normal)', marginBottom: '12px', gap: '4px' }}>
        {[
          { id: 'layers', label: 'OSI Layers', icon: '🥞' },
          { id: 'hexdump', label: 'Hex Dump', icon: '🔢' },
          { id: 'route', label: `Hops (${packet.route.length})`, icon: '🗺️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '6px 10px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: activeTab === tab.id ? '#60a5fa' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px 4px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OSI LAYERS (Wireshark-like tree) */}
      {activeTab === 'layers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Layer 1 / Frame */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
            <div
              onClick={() => toggleSection('frame')}
              style={{
                padding: '6px 10px',
                background: '#1e293b',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#f8fafc',
              }}
            >
              <span>{openSections['frame'] ? '▼' : '▶'} Frame 1: {packet.size} bytes on wire</span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>L1 Physical</span>
            </div>
            {openSections['frame'] && (
              <div style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6, color: '#cbd5e1' }}>
                <div>Arrival Time: {new Date(packet.timestamp).toISOString()}</div>
                <div>Frame Number: 1 | Frame Length: {packet.size} bytes ({packet.size * 8} bits)</div>
                <div>Capture Length: {packet.size} bytes</div>
                <div>Protocols in frame: eth:ethertype:ip:{packet.protocol.toLowerCase()}</div>
              </div>
            )}
          </div>

          {/* Layer 2 / Ethernet II */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
            <div
              onClick={() => toggleSection('eth')}
              style={{
                padding: '6px 10px',
                background: '#1e293b',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#f8fafc',
              }}
            >
              <span>{openSections['eth'] ? '▼' : '▶'} Ethernet II, Src: {packet.ethernet?.srcMac || '00:11:22:33:44:55'}, Dst: {packet.ethernet?.dstMac || 'ff:ff:ff:ff:ff:ff'}</span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>L2 Data Link</span>
            </div>
            {openSections['eth'] && (
              <div style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6, color: '#cbd5e1' }}>
                <div>Destination: {packet.ethernet?.dstMac || 'Broadcast (ff:ff:ff:ff:ff:ff)'}</div>
                <div>Source: {packet.ethernet?.srcMac || '00:11:22:33:44:55'}</div>
                <div>Type: IPv4 (0x0800)</div>
              </div>
            )}
          </div>

          {/* Layer 3 / IPv4 */}
          {packet.ip && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                onClick={() => toggleSection('ip')}
                style={{
                  padding: '6px 10px',
                  background: '#1e293b',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#f8fafc',
                }}
              >
                <span>{openSections['ip'] ? '▼' : '▶'} Internet Protocol Version 4, Src: {packet.ip.srcIp}, Dst: {packet.ip.dstIp}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>L3 Network</span>
              </div>
              {openSections['ip'] && (
                <div style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6, color: '#cbd5e1' }}>
                  <div>0100 .... = Version: 4</div>
                  <div>.... 0101 = Header Length: 20 bytes (5)</div>
                  <div>Total Length: {packet.size}</div>
                  <div>Time to Live (TTL): {packet.ttl}</div>
                  <div>Protocol: {packet.protocol} ({packet.protocol === 'ICMP' ? 1 : packet.protocol === 'TCP' ? 6 : 17})</div>
                  <div>Header Checksum: 0x6ba1 [correct]</div>
                  <div>Source Address: <span style={{ color: '#38bdf8' }}>{packet.ip.srcIp}</span></div>
                  <div>Destination Address: <span style={{ color: '#38bdf8' }}>{packet.ip.dstIp}</span></div>
                </div>
              )}
            </div>
          )}

          {/* Layer 4 / Transport / ICMP */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
            <div
              onClick={() => toggleSection('transport')}
              style={{
                padding: '6px 10px',
                background: '#1e293b',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#f8fafc',
              }}
            >
              <span>{openSections['transport'] ? '▼' : '▶'} {packet.protocol} Header</span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>L4 Transport</span>
            </div>
            {openSections['transport'] && (
              <div style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6, color: '#cbd5e1' }}>
                {packet.protocol === 'ICMP' && (
                  <>
                    <div>Type: 8 (Echo (ping) request)</div>
                    <div>Code: 0</div>
                    <div>Checksum: 0x4d5b [correct]</div>
                    <div>Identifier (BE): 0x0001 (1)</div>
                    <div>Sequence Number (BE): 0x0001 (1)</div>
                    <div>Data: 32 bytes of ping payload</div>
                  </>
                )}
                {packet.protocol === 'TCP' && (
                  <>
                    <div>Source Port: {packet.transport?.srcPort || 49152}</div>
                    <div>Destination Port: {packet.transport?.dstPort || 80}</div>
                    <div>Flags: [SYN, ACK]</div>
                    <div>Window Size: 64240</div>
                  </>
                )}
                {packet.protocol === 'UDP' && (
                  <>
                    <div>Source Port: {packet.transport?.srcPort || 5353}</div>
                    <div>Destination Port: {packet.transport?.dstPort || 53}</div>
                    <div>Length: {packet.size - 20}</div>
                  </>
                )}
                {packet.protocol !== 'ICMP' && packet.protocol !== 'TCP' && packet.protocol !== 'UDP' && (
                  <div>{packet.protocol} Protocol Payload ({packet.size} bytes)</div>
                )}
              </div>
            )}
          </div>

          {/* Application Payload if present */}
          {packet.application && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                onClick={() => toggleSection('app')}
                style={{
                  padding: '6px 10px',
                  background: '#1e293b',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#f8fafc',
                }}
              >
                <span>{openSections['app'] ? '▼' : '▶'} Application: {packet.application.protocol}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>L7 Application</span>
              </div>
              {openSections['app'] && (
                <div style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6, color: '#34d399' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(packet.application.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {packet.dropReason && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '8px 12px' }}>
              <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '2px' }}>⛔ Packet Drop Reason:</div>
              <div style={{ color: '#fca5a5', fontFamily: 'monospace' }}>{packet.dropReason}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HEX DUMP (Classic Wireshark format) */}
      {activeTab === 'hexdump' && (
        <div
          style={{
            background: '#020617',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '11px',
            lineHeight: 1.5,
            overflowX: 'auto',
          }}
        >
          <div style={{ color: '#64748b', borderBottom: '1px solid #1e293b', paddingBottom: '4px', marginBottom: '6px', display: 'flex', gap: '16px' }}>
            <span>Offset</span>
            <span>00 01 02 03 04 05 06 07  08 09 0a 0b 0c 0d 0e 0f</span>
            <span>ASCII</span>
          </div>
          {hexRows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px' }}>
              <span style={{ color: '#64748b' }}>{row.offset}</span>
              <span style={{ color: '#38bdf8' }}>{row.hex}</span>
              <span style={{ color: '#a78bfa' }}>{row.ascii}</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: HOP-BY-HOP ROUTE */}
      {activeTab === 'route' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {packet.route.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
              No route hops recorded.
            </div>
          ) : (
            packet.route.map((hop, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background:
                      hop.action === 'DELIVERED'
                        ? 'rgba(16,185,129,0.2)'
                        : hop.action === 'DROPPED'
                        ? 'rgba(239,68,68,0.2)'
                        : 'rgba(59,130,246,0.2)',
                    color:
                      hop.action === 'DELIVERED'
                        ? '#10b981'
                        : hop.action === 'DROPPED'
                        ? '#ef4444'
                        : '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>{hop.deviceName}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    Action: <span style={{ fontWeight: 600, color: hop.action === 'DELIVERED' ? '#34d399' : '#60a5fa' }}>{hop.action}</span> • {new Date(hop.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
