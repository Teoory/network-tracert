import React, { useState, useEffect } from 'react';
import { TopologyStorage, type TopologyExportData } from '../../utils/topologyStorage';
import { useNetworkStore } from '../../store/networkStore';

interface TopologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TopologyModal({ isOpen, onClose }: TopologyModalProps) {
  const { syncFromEngine } = useNetworkStore();
  const [activeTab, setActiveTab] = useState<'slots' | 'json' | 'export'>('slots');
  const [slotName, setSlotName] = useState('');
  const [savedSlots, setSavedSlots] = useState<string[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedSlots(TopologyStorage.getSavedSlots());
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSlot = () => {
    const name = slotName.trim() || `Topology_${new Date().toLocaleTimeString()}`;
    const ok = TopologyStorage.saveToSlot(name);
    if (ok) {
      setSavedSlots(TopologyStorage.getSavedSlots());
      setSlotName('');
      setStatusMsg({ text: `Saved to slot "${name}"`, type: 'success' });
    } else {
      setStatusMsg({ text: 'Failed to save to localStorage', type: 'error' });
    }
  };

  const handleLoadSlot = (name: string) => {
    const ok = TopologyStorage.loadFromSlot(name);
    if (ok) {
      syncFromEngine();
      setStatusMsg({ text: `Loaded topology "${name}"`, type: 'success' });
      setTimeout(onClose, 600);
    } else {
      setStatusMsg({ text: `Failed to load slot "${name}"`, type: 'error' });
    }
  };

  const handleDeleteSlot = (name: string) => {
    TopologyStorage.deleteSlot(name);
    setSavedSlots(TopologyStorage.getSavedSlots());
  };

  const handleExportJSON = () => {
    const data = TopologyStorage.exportCurrentTopology();
    const str = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const data = TopologyStorage.exportCurrentTopology();
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-topology-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput) as TopologyExportData;
      const ok = TopologyStorage.importTopology(parsed);
      if (ok) {
        syncFromEngine();
        setStatusMsg({ text: 'Topology imported successfully!', type: 'success' });
        setTimeout(onClose, 600);
      } else {
        setStatusMsg({ text: 'Invalid topology JSON structure.', type: 'error' });
      }
    } catch {
      setStatusMsg({ text: 'Invalid JSON format. Please check syntax.', type: 'error' });
    }
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
          width: 580, background: '#0f172a', border: '1px solid #334155',
          borderRadius: 14, boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💾</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc', fontWeight: 600 }}>Save / Load Topology</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Persist, backup, or import network sandbox designs</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#090d16' }}>
          {[
            { id: 'slots', label: '📁 Saved Slots', count: savedSlots.length },
            { id: 'json', label: '📥 Import JSON' },
            { id: 'export', label: '📤 Export / Download' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                flex: 1, padding: '10px 14px', background: activeTab === t.id ? '#0f172a' : 'transparent',
                border: 'none', borderBottom: activeTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === t.id ? '#60a5fa' : '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t.label} {t.count !== undefined ? `(${t.count})` : ''}
            </button>
          ))}
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 500,
            background: statusMsg.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: statusMsg.type === 'success' ? '#4ade80' : '#f87171',
            borderBottom: '1px solid #1e293b',
          }}>
            {statusMsg.type === 'success' ? '✓ ' : '✕ '}{statusMsg.text}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: 20, minHeight: 260, maxHeight: 400, overflowY: 'auto' }}>
          {activeTab === 'slots' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Enter topology slot name..."
                  value={slotName}
                  onChange={(e) => setSlotName(e.target.value)}
                  style={{
                    flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                    padding: '8px 12px', color: '#f8fafc', fontSize: 13, outline: 'none',
                  }}
                />
                <button
                  onClick={handleSaveSlot}
                  style={{
                    background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6,
                    padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Save Current
                </button>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                Saved Local Topologies:
              </div>

              {savedSlots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 12 }}>
                  No saved topologies in local storage yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {savedSlots.map((name) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#1e293b', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155',
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#f8fafc', fontWeight: 500 }}>{name}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleLoadSlot(name)}
                          style={{
                            background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)',
                            color: '#4ade80', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                          }}
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(name)}
                          style={{
                            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                            color: '#f87171', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 0 }}>Paste an exported Topology JSON string below:</p>
              <textarea
                rows={9}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"version": 1, "devices": [...], "connections": [...]}'
                style={{
                  width: '100%', background: '#090d16', border: '1px solid #334155', borderRadius: 8,
                  padding: 10, color: '#38bdf8', fontFamily: 'monospace', fontSize: 11, resize: 'vertical',
                }}
              />
              <button
                onClick={handleImportJSON}
                style={{
                  marginTop: 10, width: '100%', background: '#2563eb', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                📥 Import and Replace Canvas
              </button>
            </div>
          )}

          {activeTab === 'export' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
              <h4 style={{ margin: '0 0 6px', color: '#f8fafc' }}>Export Current Simulation</h4>
              <p style={{ fontSize: 12, color: '#94a3b8', maxWidth: 380, margin: '0 auto 16px' }}>
                Download the complete sandbox configuration including devices, connections, routing, VLANs, and firewall rules as a JSON file.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  onClick={handleExportJSON}
                  style={{
                    background: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
                    borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {copied ? '✓ Copied to Clipboard!' : '📋 Copy JSON'}
                </button>
                <button
                  onClick={handleDownloadFile}
                  style={{
                    background: '#2563eb', border: 'none', color: '#fff',
                    borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  ⬇️ Download .JSON File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
