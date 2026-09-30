import React, { useState } from 'react';
import { useNetworkStore, type BottomTab } from './store/networkStore';
import { engine } from './simulation/engine/SimulationEngine';
import NetworkCanvas from './components/NetworkCanvas/NetworkCanvas';
import DevicePanel from './components/DevicePanel/DevicePanel';
import DeviceInspector from './components/Inspector/DeviceInspector';
import PacketInspector from './components/PacketInspector/PacketInspector';
import EventLog from './components/EventLog/EventLog';
import PacketCapture from './components/PacketCapture/PacketCapture';
import Terminal from './components/Terminal/Terminal';
import SubnetCalculator from './components/Tools/SubnetCalculator';
import MonitoringDashboard from './components/Monitoring/MonitoringDashboard';
import { ScenariosModal } from './components/Scenarios/ScenariosModal';
import { TopologyModal } from './components/Tools/TopologyModal';
import { IncidentAttackModal } from './components/Tools/IncidentAttackModal';
import { NextEventControl } from './components/Tools/NextEventControl';

// ---- Quick Demo Helper -----------------------------------
function buildDemo(type: 'basic' | 'dhcp' | 'full') {
  const store = useNetworkStore.getState();

  if (type === 'basic') {
    // PC → Switch → Router
    store.clearTopology();
    const pc = store.addDevice('PC', { x: 200, y: 120 });
    const sw = store.addDevice('Switch', { x: 420, y: 220 });
    const router = store.addDevice('Router', { x: 650, y: 220 });

    engine.updateDevice(pc.id, {
      interfaces: [{ ...pc.interfaces[0], ipAddress: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', dns: '192.168.1.10', isDHCP: false }],
      ipAddresses: ['192.168.1.10'],
    });
    engine.updateDevice(router.id, {
      interfaces: [{ ...router.interfaces[0], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', isDHCP: false }],
      ipAddresses: ['192.168.1.1'],
    });

    const pcPort = engine.getAvailablePort(pc.id);
    const swPort1 = engine.getAvailablePort(sw.id);
    if (pcPort && swPort1) engine.connectDevices(pc.id, pcPort.id, sw.id, swPort1.id);

    const swPort2 = engine.getAvailablePort(sw.id);
    const routerPort = engine.getAvailablePort(router.id);
    if (swPort2 && routerPort) engine.connectDevices(sw.id, swPort2.id, router.id, routerPort.id);

    engine.arp.announce(pc.id, '192.168.1.10');
    engine.arp.announce(router.id, '192.168.1.1');
    engine.routing.buildConnectedRoutes(router.id);

    setTimeout(() => {
      engine.packets.sendPing(pc.id, router.id);
      store.syncFromEngine();
    }, 150);

  } else if (type === 'dhcp') {
    // PC + Switch + DHCP Server
    store.clearTopology();
    const pc1 = store.addDevice('PC', { x: 180, y: 100 });
    const pc2 = store.addDevice('PC', { x: 180, y: 280 });
    const sw = store.addDevice('Switch', { x: 420, y: 200 });
    const dhcp = store.addDevice('DHCPServer', { x: 650, y: 200 });

    engine.updateDevice(dhcp.id, {
      interfaces: [{ ...dhcp.interfaces[0], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', isDHCP: false }],
      ipAddresses: ['192.168.1.1'],
    });
    engine.arp.announce(dhcp.id, '192.168.1.1');

    engine.dhcp.configurePool(dhcp.id, {
      network: '192.168.1.0', poolStart: '192.168.1.100', poolEnd: '192.168.1.200',
      subnetMask: '255.255.255.0', gateway: '192.168.1.1', dns: '192.168.1.1', leaseTime: 28800,
    });

    [pc1, pc2].forEach((pc) => {
      const pcPort = engine.getAvailablePort(pc.id);
      const swPort = engine.getAvailablePort(sw.id);
      if (pcPort && swPort) engine.connectDevices(pc.id, pcPort.id, sw.id, swPort.id);
    });
    const swPort = engine.getAvailablePort(sw.id);
    const dhcpPort = engine.getAvailablePort(dhcp.id);
    if (swPort && dhcpPort) engine.connectDevices(sw.id, swPort.id, dhcp.id, dhcpPort.id);

    setTimeout(() => {
      engine.dhcp.requestIP(pc1.id);
      engine.dhcp.requestIP(pc2.id);
      store.syncFromEngine();
    }, 150);

  } else if (type === 'full') {
    // Full topology: PC → Switch → Router → DNS/Web
    store.clearTopology();
    const pc = store.addDevice('PC', { x: 120, y: 120 });
    const sw = store.addDevice('Switch', { x: 340, y: 220 });
    const router = store.addDevice('Router', { x: 560, y: 120 });
    const dns = store.addDevice('DNSServer', { x: 760, y: 120 });
    const web = store.addDevice('WebServer', { x: 760, y: 280 });
    const fw = store.addDevice('Firewall', { x: 560, y: 280 });

    engine.updateDevice(pc.id, { interfaces: [{ ...pc.interfaces[0], ipAddress: '10.0.1.10', subnetMask: '255.255.255.0', gateway: '10.0.1.1', dns: '10.0.2.10', isDHCP: false }], ipAddresses: ['10.0.1.10'] });
    engine.updateDevice(router.id, { interfaces: [{ ...router.interfaces[0], ipAddress: '10.0.1.1', subnetMask: '255.255.255.0', isDHCP: false }], ipAddresses: ['10.0.1.1'] });
    engine.updateDevice(dns.id, { interfaces: [{ ...dns.interfaces[0], ipAddress: '10.0.2.10', subnetMask: '255.255.255.0', isDHCP: false }], ipAddresses: ['10.0.2.10'] });
    engine.updateDevice(web.id, { interfaces: [{ ...web.interfaces[0], ipAddress: '10.0.2.20', subnetMask: '255.255.255.0', isDHCP: false }], ipAddresses: ['10.0.2.20'] });
    engine.updateDevice(fw.id, { interfaces: [{ ...fw.interfaces[0], ipAddress: '10.0.1.254', subnetMask: '255.255.255.0', isDHCP: false }], ipAddresses: ['10.0.1.254'] });

    const pPort = engine.getAvailablePort(pc.id);
    const swP1 = engine.getAvailablePort(sw.id);
    if (pPort && swP1) engine.connectDevices(pc.id, pPort.id, sw.id, swP1.id);

    const swP2 = engine.getAvailablePort(sw.id);
    const rPort1 = engine.getAvailablePort(router.id);
    if (swP2 && rPort1) engine.connectDevices(sw.id, swP2.id, router.id, rPort1.id);

    const rPort2 = engine.getAvailablePort(router.id);
    const dPort = engine.getAvailablePort(dns.id);
    if (rPort2 && dPort) engine.connectDevices(router.id, rPort2.id, dns.id, dPort.id);

    const swP3 = engine.getAvailablePort(sw.id);
    const fPort1 = engine.getAvailablePort(fw.id);
    if (swP3 && fPort1) engine.connectDevices(sw.id, swP3.id, fw.id, fPort1.id);

    const fPort2 = engine.getAvailablePort(fw.id);
    const wPort = engine.getAvailablePort(web.id);
    if (fPort2 && wPort) engine.connectDevices(fw.id, fPort2.id, web.id, wPort.id);

    engine.dns.addRecord(dns.id, { name: 'app.lan', type: 'A', value: '10.0.2.20', ttl: 3600 });
    engine.dns.addRecord(dns.id, { name: 'router.lan', type: 'A', value: '10.0.1.1', ttl: 3600 });

    engine.arp.announce(pc.id, '10.0.1.10');
    engine.arp.announce(router.id, '10.0.1.1');
    engine.arp.announce(dns.id, '10.0.2.10');
    engine.arp.announce(web.id, '10.0.2.20');
    engine.arp.announce(fw.id, '10.0.1.254');

    engine.routing.buildConnectedRoutes(router.id);

    setTimeout(() => {
      engine.packets.sendPing(pc.id, router.id);
      store.syncFromEngine();
    }, 150);
  }

  store.syncFromEngine();
}

// ---- Toolbar ---------------------------------------------
function Toolbar({
  onOpenScenarios,
  onOpenTopology,
  onOpenIncidents,
}: {
  onOpenScenarios: () => void;
  onOpenTopology: () => void;
  onOpenIncidents: () => void;
}) {
  const { devices, clearTopology } = useNetworkStore();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const deviceCount = Object.keys(devices).length;

  return (
    <div className="app-toolbar">
      <div className="toolbar-brand">
        <div className="toolbar-brand-logo">🌐</div>
        Network Sandbox Simulator
      </div>
      <div className="toolbar-separator" />

      {/* Scenarios & Labs Button */}
      <button
        className="toolbar-btn"
        onClick={onOpenScenarios}
        style={{
          background: 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.3)',
          color: '#60a5fa',
          fontWeight: 600,
        }}
        title="Open Pre-configured Scenarios & Labs"
      >
        📚 Labs & Scenarios
      </button>

      {/* Save / Load Button */}
      <button
        className="toolbar-btn"
        onClick={onOpenTopology}
        title="Save, Load, Export or Import Topology"
      >
        💾 Save / Load
      </button>

      {/* Incidents & Security Attack Simulator */}
      <button
        className="toolbar-btn"
        onClick={onOpenIncidents}
        style={{
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171',
          fontWeight: 600,
        }}
        title="Inject Hardware Failures & Cyber Attack Simulations"
      >
        ⚡ Faults & Attacks
      </button>

      {/* Demo Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          className="toolbar-btn primary"
          onClick={() => setShowDemoMenu((v) => !v)}
          title="Load a quick topology"
        >
          ⚡ Quick Demo ▾
        </button>
        {showDemoMenu && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 9999,
              background: '#0f172a', border: '1px solid #334155',
              borderRadius: 8, padding: 4, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
            onMouseLeave={() => setShowDemoMenu(false)}
          >
            {([
              { key: 'basic', label: '💻 Basic (PC→Switch→Router)', desc: 'Simple topology with ping' },
              { key: 'dhcp', label: '📡 DHCP Demo', desc: 'Auto IP assignment' },
              { key: 'full', label: '🌐 Full Network', desc: 'Router, DNS, Web, Firewall' },
            ] as const).map((d) => (
              <div
                key={d.key}
                onClick={() => { buildDemo(d.key); setShowDemoMenu(false); }}
                style={{
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: '#f8fafc' }}>{d.label}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{d.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deviceCount > 0 && (
        <button
          className="toolbar-btn"
          onClick={() => {
            if (window.confirm('Clear all devices and connections?')) {
              clearTopology();
            }
          }}
          style={{ color: '#ef4444' }}
          title="Clear canvas"
        >
          🗑️ Clear
        </button>
      )}

      <div className="toolbar-separator" />

      {/* Step Next Event Control Button */}
      <NextEventControl />

      <div className="toolbar-separator" />
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {deviceCount} device{deviceCount !== 1 ? 's' : ''}
      </span>
      <div className="toolbar-spacer" />
    </div>
  );
}

// ---- Bottom Panel ----------------------------------------
function BottomPanel() {
  const { bottomTab, setBottomTab } = useNetworkStore();
  const events = useNetworkStore((s) => s.events);
  const packets = useNetworkStore((s) => s.packets);

  const tabs: Array<{ id: BottomTab; label: string; icon: string; badge?: number }> = [
    { id: 'events', label: 'Events', icon: '📋', badge: events.filter((e) => e.severity === 'WARNING' || e.severity === 'ERROR' || e.severity === 'CRITICAL').length },
    { id: 'capture', label: 'Packet Capture', icon: '📡', badge: Object.keys(packets).length },
    { id: 'terminal', label: 'Terminal', icon: '⌨️' },
    { id: 'tools', label: 'Subnet Calc', icon: '🧮' },
    { id: 'monitoring', label: 'Monitoring', icon: '📊' },
  ];

  return (
    <div className="bottom-panel">
      <div className="bottom-tabs">
        {tabs.map((tab) => (
          <div key={tab.id} className={`bottom-tab ${bottomTab === tab.id ? 'active' : ''}`} onClick={() => setBottomTab(tab.id)}>
            {tab.icon} {tab.label}
            {tab.badge && tab.badge > 0 ? (
              <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 10, fontSize: 9, padding: '0 5px', fontWeight: 700 }}>
                {tab.badge}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="bottom-content">
        {bottomTab === 'events' && <EventLog />}
        {bottomTab === 'capture' && <PacketCapture />}
        {bottomTab === 'terminal' && <Terminal />}
        {bottomTab === 'tools' && <SubnetCalculator />}
        {bottomTab === 'monitoring' && <MonitoringDashboard />}
      </div>
    </div>
  );
}

// ---- Right Panel -----------------------------------------
function RightPanel() {
  const { activePanel } = useNetworkStore();
  const title = activePanel === 'packet' ? '📦 Packet Inspector' : '🔍 Inspector';
  return (
    <div className="inspector-panel">
      <div className="inspector-header">{title}</div>
      {activePanel === 'packet' ? <PacketInspector /> : <DeviceInspector />}
    </div>
  );
}

// ---- Main App --------------------------------------------
export default function App() {
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [topologyOpen, setTopologyOpen] = useState(false);
  const [incidentsOpen, setIncidentsOpen] = useState(false);

  return (
    <div className="app-layout">
      <Toolbar
        onOpenScenarios={() => setScenariosOpen(true)}
        onOpenTopology={() => setTopologyOpen(true)}
        onOpenIncidents={() => setIncidentsOpen(true)}
      />
      <div className="app-main">
        <DevicePanel />
        <div className="canvas-area">
          <NetworkCanvas />
          <BottomPanel />
        </div>
        <RightPanel />
      </div>
      <ScenariosModal isOpen={scenariosOpen} onClose={() => setScenariosOpen(false)} />
      <TopologyModal isOpen={topologyOpen} onClose={() => setTopologyOpen(false)} />
      <IncidentAttackModal isOpen={incidentsOpen} onClose={() => setIncidentsOpen(false)} />
    </div>
  );
}
