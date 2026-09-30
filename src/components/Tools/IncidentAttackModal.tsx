import React, { useState, useEffect } from 'react';
import { engine } from '../../simulation/engine/SimulationEngine';
import { useNetworkStore } from '../../store/networkStore';
import type { IncidentType } from '../../simulation/events/RandomEventEngine';
import type { SecurityAttackType } from '../../simulation/events/SecurityEventEngine';

interface IncidentAttackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IncidentAttackModal({ isOpen, onClose }: IncidentAttackModalProps) {
  const { devices, syncFromEngine } = useNetworkStore();
  const [activeTab, setActiveTab] = useState<'incidents' | 'security' | 'active'>('incidents');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const activeIncidents = engine.randomEvents.getActiveIncidents();
  const activeAttacks = engine.securityEvents.getActiveAttacks();
  const deviceList = Object.values(devices);

  useEffect(() => {
    if (deviceList.length > 0 && !selectedTargetId) {
      setSelectedTargetId(deviceList[0].id);
    }
  }, [deviceList, selectedTargetId]);

  if (!isOpen) return null;

  const handleTriggerIncident = (type: IncidentType) => {
    const inc = engine.randomEvents.triggerIncident(type, selectedTargetId || undefined);
    if (inc) {
      syncFromEngine();
      setStatusMessage({ text: `💥 Injected: ${inc.title}`, type: 'warning' });
    }
  };

  const handleLaunchAttack = (type: SecurityAttackType) => {
    if (!selectedTargetId) return;
    const attack = engine.securityEvents.launchAttack(type, selectedTargetId, selectedSourceId || undefined);
    if (attack) {
      syncFromEngine();
      setStatusMessage({ text: `🚨 Attack Started: ${attack.title}`, type: 'warning' });
    }
  };

  const handleResolveIncident = (id: string) => {
    engine.randomEvents.resolveIncident(id);
    syncFromEngine();
    setStatusMessage({ text: 'Incident resolved and state restored.', type: 'success' });
  };

  const handleMitigateAttack = (attackId: string) => {
    const firewalls = deviceList.filter((d) => d.type === 'Firewall' || d.type === 'Router');
    const fwId = firewalls[0]?.id;
    if (!fwId) {
      alert('Please add a Firewall or Router to deploy an ACL mitigation rule.');
      return;
    }
    engine.securityEvents.mitigateAttackWithFirewall(attackId, fwId);
    syncFromEngine();
    setStatusMessage({ text: 'Attack mitigated via Firewall DENY rule.', type: 'success' });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(5, 10, 20, 0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 640, background: '#0f172a', border: '1px solid #334155',
          borderRadius: 14, boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc', fontWeight: 600 }}>Fault & Cyber Attack Simulation</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Test network resilience against hardware failures and security threats</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Target selection */}
        <div style={{ padding: '10px 20px', background: '#090d16', borderBottom: '1px solid #1e293b', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Target:</span>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#f8fafc', padding: '4px 8px', fontSize: 11 }}
            >
              {deviceList.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Attacker Source:</span>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#f8fafc', padding: '4px 8px', fontSize: 11 }}
            >
              <option value="">Simulated External Internet (198.51.100.77)</option>
              {deviceList.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.interfaces[0]?.ipAddress ?? 'LAN'})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
          {[
            { id: 'incidents', label: '💥 Infrastructure Faults' },
            { id: 'security', label: '🚨 Cyber Attacks' },
            { id: 'active', label: `🛡️ Active Incidents & Response (${activeIncidents.length + activeAttacks.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                flex: 1, padding: '10px 14px', background: activeTab === t.id ? '#1e293b' : 'transparent',
                border: 'none', borderBottom: activeTab === t.id ? '2px solid #ef4444' : '2px solid transparent',
                color: activeTab === t.id ? '#f87171' : '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 500,
            background: statusMessage.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: statusMessage.type === 'success' ? '#4ade80' : '#f87171',
            borderBottom: '1px solid #1e293b',
          }}>
            {statusMessage.text}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: 18, minHeight: 280, maxHeight: 380, overflowY: 'auto' }}>
          {activeTab === 'incidents' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { type: 'PORT_FAILURE', title: '🔌 Port Physical Failure', desc: 'Forces switch/router interface DOWN due to SFP/PHY transceiver crash.' },
                { type: 'CABLE_FAILURE', title: '✂️ Cable Cut / Disconnect', desc: 'Severs physical link between nodes, forcing packet drop or reroute.' },
                { type: 'DHCP_POOL_EXHAUSTED', title: '📡 DHCP Pool Exhaustion', desc: 'Depletes subnet IP allocation pool, preventing new clients from joining.' },
                { type: 'DNS_FAILURE', title: '🌐 DNS Daemon Crash', desc: 'Halts named resolution process; domain queries fail immediately.' },
                { type: 'SERVER_OVERLOAD', title: '🔥 CPU / Resource Saturation', desc: 'Spikes target CPU to 98%, introducing 240ms latency and 35% packet loss.' },
                { type: 'NETWORK_CONGESTION', title: '🌊 Bandwidth Congestion', desc: 'Overwhelms link queue, causing jitter, buffer bloat and queue drop.' },
              ].map((item) => (
                <div
                  key={item.type}
                  style={{
                    background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                  <button
                    onClick={() => handleTriggerIncident(item.type as IncidentType)}
                    style={{
                      marginTop: 10, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                      color: '#f87171', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Trigger Incident
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { type: 'PORT_SCAN', title: '🔍 TCP SYN Port Recon Scan', desc: 'Sweeps ports 21, 22, 23, 53, 80, 443, 3306, 8080 to discover open listeners.' },
                { type: 'SSH_BRUTE_FORCE', title: '🔑 SSH Brute-Force Auth Flood', desc: 'Spams port 22 with dictionary attack credential attempts.' },
                { type: 'DDOS', title: '💥 Volumetric DDoS UDP/ICMP Flood', desc: 'Overwhelms target network pipe and spikes device CPU & latency.' },
                { type: 'ARP_SPOOFING', title: '🎭 ARP Cache Poisoning / MITM', desc: 'Injects forged gateway MAC to intercept unencrypted frames.' },
                { type: 'SUSPICIOUS_TRAFFIC', title: '🚨 Anomalous Outbound C2 Beacon', desc: 'Emits persistent high-entropy payloads to external command & control node.' },
              ].map((item) => (
                <div
                  key={item.type}
                  style={{
                    background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                  <button
                    onClick={() => handleLaunchAttack(item.type as SecurityAttackType)}
                    style={{
                      marginTop: 10, background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.5)',
                      color: '#ef4444', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Launch Attack
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'active' && (
            <div>
              {activeIncidents.length === 0 && activeAttacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13 }}>
                  ✅ All systems operational. No active hardware faults or cyber attacks.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeAttacks.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>🚨 {att.title}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          Target: {att.targetIp} | Attacker: {att.sourceIp} | Packets: {att.packetsGenerated}
                        </div>
                        <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>
                          💡 {att.mitigationRecommendation}
                        </div>
                      </div>
                      <button
                        onClick={() => handleMitigateAttack(att.id)}
                        style={{
                          background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6,
                          padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        🛡️ Deploy Firewall Rule
                      </button>
                    </div>
                  ))}

                  {activeIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      style={{
                        background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
                        borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>💥 {inc.title}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{inc.description}</div>
                        <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 4 }}>💡 {inc.mitigationHint}</div>
                      </div>
                      <button
                        onClick={() => handleResolveIncident(inc.id)}
                        style={{
                          background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6,
                          padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        🔧 Auto Repair
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
