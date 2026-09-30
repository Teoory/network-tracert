import React, { useState } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import type { NetworkDevice, NetworkInterface } from '../../types';
import { engine } from '../../simulation/engine/SimulationEngine';

// ---- Interface IP Editor ---------------------------------
function InterfaceEditor({ iface, device }: { iface: NetworkInterface; device: NetworkDevice }) {
  const updateDevice = useNetworkStore((s) => s.updateDevice);
  const [editing, setEditing] = useState(false);
  const [ip, setIp] = useState(iface.ipAddress ?? '');
  const [mask, setMask] = useState(iface.subnetMask ?? '255.255.255.0');
  const [gateway, setGateway] = useState(iface.gateway ?? '');
  const [dns, setDns] = useState(iface.dns ?? '');
  const [isDHCP, setIsDHCP] = useState(iface.isDHCP);

  const save = () => {
    const updatedInterfaces = device.interfaces.map((i) =>
      i.id === iface.id
        ? { ...i, ipAddress: ip || undefined, subnetMask: mask || undefined, gateway: gateway || undefined, dns: dns || undefined, isDHCP }
        : i
    );
    updateDevice(device.id, { interfaces: updatedInterfaces, ipAddresses: ip ? [ip] : [] });
    if (ip) engine.arp.announce(device.id, ip);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div style={{ cursor: 'pointer', padding: '3px 0' }} onClick={() => setEditing(true)}>
        <div className="prop-row"><span className="prop-label">IP Address</span><span className="prop-value">{iface.ipAddress ?? '—'}</span></div>
        <div className="prop-row"><span className="prop-label">Subnet Mask</span><span className="prop-value">{iface.subnetMask ?? '—'}</span></div>
        <div className="prop-row"><span className="prop-label">Gateway</span><span className="prop-value">{iface.gateway ?? '—'}</span></div>
        <div className="prop-row"><span className="prop-label">DNS</span><span className="prop-value">{iface.dns ?? '—'}</span></div>
        <div className="prop-row"><span className="prop-label">Mode</span><span className="prop-value">{iface.isDHCP ? 'DHCP' : 'Static'}</span></div>
        <div style={{ fontSize: 10, color: 'var(--accent-blue)', marginTop: 4 }}>✏️ Click to edit</div>
      </div>
    );
  }

  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <input type="checkbox" checked={isDHCP} onChange={(e) => setIsDHCP(e.target.checked)} /> DHCP
      </label>
      {!isDHCP && (<>
        <div className="input-group">
          <label className="input-label">IP Address</label>
          <input className="input-field" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.10" />
        </div>
        <div className="input-group">
          <label className="input-label">Subnet Mask</label>
          <input className="input-field" value={mask} onChange={(e) => setMask(e.target.value)} placeholder="255.255.255.0" />
        </div>
        <div className="input-group">
          <label className="input-label">Gateway</label>
          <input className="input-field" value={gateway} onChange={(e) => setGateway(e.target.value)} placeholder="192.168.1.1" />
        </div>
        <div className="input-group">
          <label className="input-label">DNS</label>
          <input className="input-field" value={dns} onChange={(e) => setDns(e.target.value)} placeholder="192.168.1.53" />
        </div>
      </>)}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button onClick={save} className="toolbar-btn primary" style={{ fontSize: 11, padding: '4px 10px' }}>Save</button>
        <button onClick={() => setEditing(false)} className="toolbar-btn" style={{ fontSize: 11, padding: '4px 10px' }}>Cancel</button>
      </div>
    </div>
  );
}

// ---- DHCP Pool Config ------------------------------------
function DHCPConfig({ device }: { device: NetworkDevice }) {
  const { syncFromEngine } = useNetworkStore();
  const [poolStart, setPoolStart] = useState('192.168.1.100');
  const [poolEnd, setPoolEnd] = useState('192.168.1.200');
  const [network, setNetwork] = useState('192.168.1.0');
  const [mask, setMask] = useState('255.255.255.0');
  const [gateway, setGateway] = useState('192.168.1.1');
  const [dns, setDns] = useState('192.168.1.1');
  const [leaseTime, setLeaseTime] = useState('28800');

  const existing = engine.dhcp.getPool(device.id);

  const apply = () => {
    engine.dhcp.configurePool(device.id, {
      network, poolStart, poolEnd, subnetMask: mask, gateway, dns, leaseTime: parseInt(leaseTime, 10),
    });
    syncFromEngine();
  };

  return (
    <div>
      {existing && (
        <div style={{ marginBottom: 8, padding: '6px 8px', background: 'rgba(16,185,129,0.1)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>✅ DHCP Pool Active</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{existing.poolStart} – {existing.poolEnd}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{existing.leases.length} leases active</div>
        </div>
      )}
      <div className="input-group">
        <label className="input-label">Network</label>
        <input className="input-field" value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="192.168.1.0" />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label">Pool Start</label>
          <input className="input-field" value={poolStart} onChange={(e) => setPoolStart(e.target.value)} />
        </div>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label">Pool End</label>
          <input className="input-field" value={poolEnd} onChange={(e) => setPoolEnd(e.target.value)} />
        </div>
      </div>
      <div className="input-group">
        <label className="input-label">Gateway</label>
        <input className="input-field" value={gateway} onChange={(e) => setGateway(e.target.value)} />
      </div>
      <div className="input-group">
        <label className="input-label">DNS</label>
        <input className="input-field" value={dns} onChange={(e) => setDns(e.target.value)} />
      </div>
      <button onClick={apply} className="toolbar-btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 11 }}>
        Apply DHCP Pool
      </button>
    </div>
  );
}

// ---- DNS Records Config -----------------------------------
function DNSConfig({ device }: { device: NetworkDevice }) {
  const { syncFromEngine } = useNetworkStore();
  const [hostname, setHostname] = useState('');
  const [ip, setIp] = useState('');
  const records = engine.dns.getRecords(device.id);

  const addRecord = () => {
    if (!hostname || !ip) return;
    engine.dns.addRecord(device.id, { name: hostname, type: 'A', value: ip, ttl: 3600 });
    setHostname(''); setIp('');
    syncFromEngine();
  };

  return (
    <div>
      <div className="port-list" style={{ marginBottom: 8, maxHeight: 80, overflowY: 'auto' }}>
        {records.length === 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 0' }}>No DNS records</div>}
        {records.map((r) => (
          <div key={r.id} className="port-entry" style={{ fontSize: 10 }}>
            <span style={{ color: 'var(--accent-cyan)', flex: 1 }}>{r.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>A</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input-field" value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="web.local" style={{ flex: 2 }} />
        <input className="input-field" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.10" style={{ flex: 2 }} />
        <button onClick={addRecord} className="toolbar-btn primary" style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}>+</button>
      </div>
    </div>
  );
}

// ---- Routing Table Config ---------------------------------
function RoutingConfig({ device }: { device: NetworkDevice }) {
  const { syncFromEngine } = useNetworkStore();
  const [network, setNetwork] = useState('');
  const [mask, setMask] = useState('');
  const [nextHop, setNextHop] = useState('');
  const routes = engine.routing.getTable(device.id);

  const addRoute = () => {
    if (!network) return;
    const isDefault = network === '0.0.0.0' || network.toLowerCase() === 'default';
    engine.routing.addRoute(device.id, {
      network: isDefault ? '0.0.0.0' : network,
      mask: isDefault ? '0.0.0.0' : (mask || '255.255.255.0'),
      nextHop: nextHop || undefined,
      metric: 1, isDefault, type: isDefault ? 'DEFAULT' : 'STATIC',
    });
    setNetwork(''); setMask(''); setNextHop('');
    syncFromEngine();
  };

  const buildConnected = () => {
    engine.routing.buildConnectedRoutes(device.id);
    syncFromEngine();
  };

  return (
    <div>
      <div style={{ maxHeight: 80, overflowY: 'auto', marginBottom: 6 }}>
        {routes.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No routes</div>
        ) : routes.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 6, fontSize: 10, padding: '2px 0', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: r.isDefault ? '#f59e0b' : 'var(--accent-cyan)', flex: 1 }}>
              {r.isDefault ? 'DEFAULT' : `${r.network}/${r.mask}`}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>{r.nextHop ?? 'connected'}</span>
            <span style={{ color: r.type === 'CONNECTED' ? '#10b981' : '#8b5cf6', fontSize: 9 }}>{r.type}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <input className="input-field" value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="Network / default" style={{ flex: 2, minWidth: 80 }} />
        <input className="input-field" value={mask} onChange={(e) => setMask(e.target.value)} placeholder="Mask" style={{ flex: 2, minWidth: 60 }} />
        <input className="input-field" value={nextHop} onChange={(e) => setNextHop(e.target.value)} placeholder="Next Hop IP" style={{ flex: 2, minWidth: 80 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button onClick={addRoute} className="toolbar-btn primary" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>+ Add Route</button>
        <button onClick={buildConnected} className="toolbar-btn" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>Build Connected</button>
      </div>
    </div>
  );
}

// ---- Firewall Rules Config --------------------------------
function FirewallConfig({ device }: { device: NetworkDevice }) {
  const { syncFromEngine } = useNetworkStore();
  const [src, setSrc] = useState('ANY');
  const [dst, setDst] = useState('ANY');
  const [proto, setProto] = useState('ANY');
  const [dstPort, setDstPort] = useState('');
  const [action, setAction] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const rules = engine.firewall.getRules(device.id);

  const addRule = () => {
    const priority = rules.length + 1;
    engine.firewall.addRule(device.id, {
      priority, source: src, destination: dst, protocol: proto,
      destinationPort: dstPort || undefined, action,
      enabled: true, description: `Rule #${priority}: ${src} → ${dst} ${proto} ${action}`,
    });
    syncFromEngine();
  };

  return (
    <div>
      <div style={{ maxHeight: 90, overflowY: 'auto', marginBottom: 6 }}>
        {rules.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No rules — default: ALLOW all</div>
        ) : rules.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', gap: 6, fontSize: 10, padding: '3px 4px', borderRadius: 4, borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', width: 18, textAlign: 'right' }}>{r.priority}</span>
            <span style={{ color: 'var(--text-secondary)', flex: 1, fontFamily: 'var(--font-mono)' }}>{r.source}→{r.destination}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{r.protocol}{r.destinationPort ? ':' + r.destinationPort : ''}</span>
            <span style={{
              fontWeight: 700, fontSize: 9,
              color: r.action === 'ALLOW' ? '#10b981' : '#ef4444',
              background: r.action === 'ALLOW' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              padding: '1px 4px', borderRadius: 3,
            }}>{r.action}</span>
            <button
              onClick={() => { engine.firewall.removeRule(device.id, r.id); syncFromEngine(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '0 2px' }}
            >✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <input className="input-field" value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Src (ANY)" style={{ flex: 1, minWidth: 60 }} />
        <input className="input-field" value={dst} onChange={(e) => setDst(e.target.value)} placeholder="Dst (ANY)" style={{ flex: 1, minWidth: 60 }} />
        <select
          value={proto} onChange={(e) => setProto(e.target.value)}
          style={{ background: 'var(--bg-base)', border: '1px solid var(--border-normal)', borderRadius: 6, color: 'var(--text-primary)', padding: '4px 6px', fontSize: 11 }}
        >
          {['ANY', 'TCP', 'UDP', 'ICMP'].map((p) => <option key={p}>{p}</option>)}
        </select>
        <input className="input-field" value={dstPort} onChange={(e) => setDstPort(e.target.value)} placeholder="Port" style={{ width: 50 }} />
        <select
          value={action} onChange={(e) => setAction(e.target.value as 'ALLOW' | 'DENY')}
          style={{ background: action === 'DENY' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${action === 'DENY' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 6, color: action === 'DENY' ? '#ef4444' : '#10b981', padding: '4px 6px', fontSize: 11 }}
        >
          <option>ALLOW</option>
          <option>DENY</option>
        </select>
      </div>
      <button onClick={addRule} className="toolbar-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 6, fontSize: 11 }}>+ Add Rule</button>
    </div>
  );
}

// ---- Main Inspector Component ----------------------------
const DEVICE_ICONS: Record<string, string> = {
  Switch: '🔀', Router: '🌐', Firewall: '🛡️', PC: '💻', Laptop: '💻',
  Mobile: '📱', AccessPoint: '📡', LoadBalancer: '⚖️',
  DHCPServer: '🖥️', DNSServer: '🖥️', WebServer: '🖥️', Server: '🖥️',
};

type InspectorTab = 'info' | 'network' | 'ports' | 'config';

export default function DeviceInspector() {
  const { selectedDeviceId, devices, removeDevice } = useNetworkStore();
  const device = selectedDeviceId ? devices[selectedDeviceId] : null;
  const [tab, setTab] = useState<InspectorTab>('info');

  if (!device) {
    return (
      <div className="empty-state">
        <div className="empty-icon">💻</div>
        <div className="empty-text">Select a device on the canvas to inspect it.</div>
      </div>
    );
  }

  const tabs: Array<{ id: InspectorTab; label: string }> = [
    { id: 'info', label: 'Info' },
    { id: 'network', label: 'Network' },
    { id: 'ports', label: 'Ports' },
    { id: 'config', label: 'Config' },
  ];

  const isRouter = device.type === 'Router';
  const isFirewall = device.type === 'Firewall';
  const isDHCPServer = device.type === 'DHCPServer';
  const isDNSServer = device.type === 'DNSServer';

  const handlePingNeighbor = () => {
    const neighbors = engine.getNeighbors(device.id);
    if (neighbors.length === 0) { alert('No connected neighbors to ping.'); return; }
    engine.packets.sendPing(device.id, neighbors[0]);
    useNetworkStore.getState().syncFromEngine();
  };

  const handleDHCPRequest = () => {
    const lease = engine.dhcp.requestIP(device.id);
    if (!lease) { alert('DHCP request failed: No server found or pool exhausted.'); }
    useNetworkStore.getState().syncFromEngine();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Device header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 26 }}>{DEVICE_ICONS[device.type] ?? '📦'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{device.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <span className={`status-chip ${device.status}`}>{device.status}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>{device.type}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '4px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 500,
                background: tab === t.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: tab === t.id ? '#60a5fa' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="inspector-content" style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'info' && (
          <>
            <div className="section-title">Identity</div>
            <div className="prop-row"><span className="prop-label">Type</span><span className="prop-value">{device.type}</span></div>
            <div className="prop-row"><span className="prop-label">ID</span><span className="prop-value" style={{ fontSize: 9 }}>{device.id}</span></div>
            <div className="prop-row"><span className="prop-label">MAC</span><span className="prop-value" style={{ fontSize: 10 }}>{device.macAddress}</span></div>
            <div className="prop-row"><span className="prop-label">Status</span><span className="prop-value">{device.status}</span></div>

            <div className="section-title" style={{ marginTop: 10 }}>Metrics</div>
            <div className="metric-bar-wrap">
              <div className="metric-bar-header"><span>CPU</span><span>{device.metrics.cpu.toFixed(0)}%</span></div>
              <div className="metric-bar"><div className="metric-bar-fill cpu" style={{ width: `${device.metrics.cpu}%` }} /></div>
            </div>
            <div className="metric-bar-wrap">
              <div className="metric-bar-header"><span>RAM</span><span>{device.metrics.ram.toFixed(0)}%</span></div>
              <div className="metric-bar"><div className="metric-bar-fill ram" style={{ width: `${device.metrics.ram}%` }} /></div>
            </div>
            <div className="prop-row"><span className="prop-label">Latency</span><span className="prop-value">{device.metrics.latency.toFixed(1)} ms</span></div>
            <div className="prop-row"><span className="prop-label">Throughput</span><span className="prop-value">{device.metrics.throughput.toFixed(1)} Mbps</span></div>

            <div className="section-title" style={{ marginTop: 10 }}>Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={handlePingNeighbor} className="toolbar-btn" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}>🏓 Ping Neighbor</button>
              {device.interfaces[0]?.isDHCP && (
                <button onClick={handleDHCPRequest} className="toolbar-btn" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}>📡 DHCP Request</button>
              )}
              <button onClick={() => removeDevice(device.id)} className="toolbar-btn danger" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}>🗑️ Remove Device</button>
            </div>
          </>
        )}

        {tab === 'network' && (
          <>
            <div className="section-title">Network Interface</div>
            {device.interfaces.map((iface) => (
              <InterfaceEditor key={iface.id} iface={iface} device={device} />
            ))}
          </>
        )}

        {tab === 'ports' && (
          <>
            <div className="section-title">Ports ({device.ports.length})</div>
            <div className="port-list">
              {device.ports.map((port) => {
                const connDev = port.connectedDeviceId ? devices[port.connectedDeviceId] : null;
                return (
                  <div key={port.id} className="port-entry">
                    <div className={`port-dot ${port.status}`} />
                    <span className="port-name">{port.name}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{port.speed >= 1000 ? `${port.speed / 1000}G` : `${port.speed}M`}</span>
                    <span className="port-conn">{connDev ? `→ ${connDev.name}` : 'Free'}</span>
                  </div>
                );
              })}
            </div>
            {/* MAC Table for switches */}
            {device.type === 'Switch' && (() => {
              const macTable = engine.getMACTable(device.id);
              return macTable.size > 0 ? (
                <>
                  <div className="section-title" style={{ marginTop: 10 }}>MAC Table</div>
                  {Array.from(macTable.entries()).map(([mac, portId]) => (
                    <div key={mac} className="prop-row" style={{ fontSize: 10 }}>
                      <span className="prop-label" style={{ fontFamily: 'var(--font-mono)' }}>{mac}</span>
                      <span className="prop-value">{device.ports.find((p) => p.id === portId)?.name ?? portId}</span>
                    </div>
                  ))}
                </>
              ) : null;
            })()}
          </>
        )}

        {tab === 'config' && (
          <>
            {isDHCPServer && (
              <>
                <div className="section-title">DHCP Pool</div>
                <DHCPConfig device={device} />
              </>
            )}
            {isDNSServer && (
              <>
                <div className="section-title">DNS Records</div>
                <DNSConfig device={device} />
              </>
            )}
            {isRouter && (
              <>
                <div className="section-title">Routing Table</div>
                <RoutingConfig device={device} />
              </>
            )}
            {isFirewall && (
              <>
                <div className="section-title">Firewall Rules</div>
                <FirewallConfig device={device} />
              </>
            )}
            {!isDHCPServer && !isDNSServer && !isRouter && !isFirewall && (
              <div className="empty-state" style={{ height: 'auto', padding: '20px 0' }}>
                <div className="empty-icon" style={{ fontSize: 24 }}>⚙️</div>
                <div className="empty-text">No advanced configuration for this device type.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
