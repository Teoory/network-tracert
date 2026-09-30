import React, { useState } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import type { PacketProtocol } from '../../types';

type FilterType = PacketProtocol | 'ALL' | 'Dropped' | 'Blocked';

const PROTO_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  ICMP: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  TCP: { bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  UDP: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  ARP: { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  DNS: { bg: 'rgba(6,182,212,0.15)', text: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
  DHCP: { bg: 'rgba(236,72,153,0.15)', text: '#f472b6', border: 'rgba(236,72,153,0.3)' },
};

export default function PacketCapture() {
  const { packets, selectedPacketId, selectPacket } = useNetworkStore();
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allPackets = Object.values(packets).sort((a, b) => b.timestamp - a.timestamp);

  const filteredPackets = allPackets.filter((p) => {
    // Protocol / Status filter
    if (filter === 'Dropped' && p.status !== 'DROPPED') return false;
    if (filter === 'Blocked' && p.status !== 'BLOCKED') return false;
    if (filter !== 'ALL' && filter !== 'Dropped' && filter !== 'Blocked' && p.protocol !== filter) {
      return false;
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = p.id.toLowerCase().includes(q);
      const matchProto = p.protocol.toLowerCase().includes(q);
      const matchSrc = p.ip?.srcIp.toLowerCase().includes(q);
      const matchDst = p.ip?.dstIp.toLowerCase().includes(q);
      const matchStatus = p.status.toLowerCase().includes(q);
      return matchId || matchProto || matchSrc || matchDst || matchStatus;
    }

    return true;
  });

  const statusColors: Record<string, string> = {
    DELIVERED: '#10b981',
    DROPPED: '#ef4444',
    BLOCKED: '#ef4444',
    FORWARDED: '#3b82f6',
    CREATED: '#94a3b8',
    QUEUED: '#94a3b8',
    EXPIRED: '#f59e0b',
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allPackets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `packet_capture_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: '11px' }}>
      {/* Top Filter & Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          background: '#090d16',
          flexWrap: 'wrap',
        }}
      >
        {/* Filter Pills */}
        {['ALL', 'ICMP', 'ARP', 'TCP', 'UDP', 'DNS', 'DHCP', 'Dropped'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              border: filter === f ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 600,
              background: filter === f ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
              color: filter === f ? '#60a5fa' : '#94a3b8',
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}

        {/* Search Input */}
        <div style={{ position: 'relative', marginLeft: '6px' }}>
          <input
            type="text"
            placeholder="Search IP, Proto, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '3px 8px 3px 22px',
              borderRadius: '4px',
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '10px',
              width: '150px',
            }}
          />
          <span style={{ position: 'absolute', left: '6px', top: '3px', color: '#64748b', fontSize: '10px' }}>
            🔍
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Export Button */}
        {allPackets.length > 0 && (
          <button
            onClick={handleExportJSON}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Export captured packets as JSON"
          >
            <span>📥</span> Export JSON
          </button>
        )}

        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
          {filteredPackets.length} of {allPackets.length} pkts
        </span>
      </div>

      {/* Packet Table */}
      <div className="capture-table" style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0b1120', color: '#94a3b8', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Time</th>
              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Proto</th>
              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Source IP</th>
              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Dest IP</th>
              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Length</th>
              <th style={{ padding: '6px 8px', fontWeight: 600 }}>TTL</th>
              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Info</th>
            </tr>
          </thead>
          <tbody>
            {filteredPackets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: '32px 0' }}>
                  No matching packets in capture buffer. Generate traffic using Ping or Terminal.
                </td>
              </tr>
            ) : (
              filteredPackets.map((pkt) => {
                const protoStyle = PROTO_BADGES[pkt.protocol] ?? {
                  bg: 'rgba(255,255,255,0.08)',
                  text: '#e2e8f0',
                  border: 'rgba(255,255,255,0.15)',
                };
                const isSelected = selectedPacketId === pkt.id;

                let infoText = `${pkt.protocol} packet`;
                if (pkt.protocol === 'ICMP') infoText = `Echo Request/Reply`;
                else if (pkt.protocol === 'DNS' && pkt.application) infoText = `Standard query/response`;
                else if (pkt.protocol === 'DHCP') infoText = `DHCP message`;

                return (
                  <tr
                    key={pkt.id}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => selectPacket(pkt.id)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59,130,246,0.18)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {new Date(pkt.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '5px 8px' }}>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 700,
                          background: protoStyle.bg,
                          color: protoStyle.text,
                          border: `1px solid ${protoStyle.border}`,
                        }}
                      >
                        {pkt.protocol}
                      </span>
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#f8fafc' }}>
                      {pkt.ip?.srcIp ?? '—'}
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#f8fafc' }}>
                      {pkt.ip?.dstIp ?? '—'}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#94a3b8' }}>{pkt.size} B</td>
                    <td style={{ padding: '5px 8px', color: '#94a3b8' }}>{pkt.ttl}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <span
                        style={{
                          color: statusColors[pkt.status] ?? '#64748b',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        ● {pkt.status}
                      </span>
                    </td>
                    <td style={{ padding: '5px 8px', color: '#94a3b8', fontSize: '10px' }}>
                      {infoText}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
