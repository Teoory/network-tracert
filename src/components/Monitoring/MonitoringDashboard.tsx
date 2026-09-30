import React from 'react';
import { useNetworkStore } from '../../store/networkStore';

export default function MonitoringDashboard() {
  const { devices, connections, packets, events } = useNetworkStore();

  const devList = Object.values(devices);
  const connList = Object.values(connections);
  const packetList = Object.values(packets);

  const totalPkts = packetList.length;
  const deliveredPkts = packetList.filter((p) => p.status === 'DELIVERED').length;
  const droppedPkts = packetList.filter((p) => p.status === 'DROPPED' || p.status === 'BLOCKED').length;
  const successRate = totalPkts === 0 ? 100 : Math.round((deliveredPkts / totalPkts) * 100);

  const errorEvents = events.filter(
    (e) => e.severity === 'WARNING' || e.severity === 'ERROR' || e.severity === 'CRITICAL'
  );

  return (
    <div style={{ padding: '16px', color: '#e2e8f0', height: '100%', overflowY: 'auto', fontSize: '12px' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Active Devices</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>{devList.length}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {devList.filter((d) => d.status === 'UP').length} Online • {devList.filter((d) => d.status === 'DOWN').length} Offline
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Cables & Links</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{connList.length}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {connList.filter((c) => c.status === 'UP').length} UP • {connList.filter((c) => c.status === 'DOWN').length} DOWN
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Delivery Success Rate</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: successRate >= 90 ? '#34d399' : '#f59e0b' }}>
            {successRate}%
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {deliveredPkts} delivered • {droppedPkts} dropped
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Total Captured Traffic</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#a78bfa' }}>{totalPkts} pkts</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {errorEvents.length} warnings/alerts logged
          </div>
        </div>
      </div>

      {/* Grid for Interface Table and Device List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Device Metrics Table */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📊</span> Device Resource Utilization
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
              <thead>
                <tr style={{ color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
                  <th style={{ padding: '6px 4px' }}>Device</th>
                  <th style={{ padding: '6px 4px' }}>Type</th>
                  <th style={{ padding: '6px 4px' }}>IP</th>
                  <th style={{ padding: '6px 4px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {devList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>No devices on canvas</td>
                  </tr>
                ) : (
                  devList.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '6px 4px', fontWeight: 600, color: '#f8fafc' }}>{d.name}</td>
                      <td style={{ padding: '6px 4px', color: '#94a3b8' }}>{d.type}</td>
                      <td style={{ padding: '6px 4px', fontFamily: 'monospace', color: '#38bdf8' }}>
                        {d.interfaces[0]?.ipAddress || '—'}
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <span style={{ color: d.status === 'UP' ? '#34d399' : '#ef4444', fontWeight: 600 }}>
                          ● {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cable & Link Status */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔌</span> Link & Connection Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {connList.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>No connections established</div>
            ) : (
              connList.map((c) => {
                const srcDev = devices[c.sourceDeviceId]?.name || c.sourceDeviceId;
                const dstDev = devices[c.destinationDeviceId]?.name || c.destinationDeviceId;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: '#1e293b',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>{srcDev}</span>
                      <span style={{ color: '#64748b', margin: '0 6px' }}>↔</span>
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>{dstDev}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {c.bandwidth} Mbps
                      </span>
                      <span style={{ color: c.status === 'UP' ? '#34d399' : '#ef4444', fontWeight: 600, fontSize: '10px' }}>
                        ● {c.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
