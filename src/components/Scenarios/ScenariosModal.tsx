import React from 'react';
import { useNetworkStore } from '../../store/networkStore';
import { engine } from '../../simulation/engine/SimulationEngine';

export interface Scenario {
  id: string;
  title: string;
  category: 'Starter' | 'Routing' | 'Security' | 'Services' | 'Troubleshooting';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  badgeColor: string;
  setup: (store: ReturnType<typeof useNetworkStore.getState>) => void;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'simple-lan',
    title: 'Basic Switch LAN with DHCP',
    category: 'Starter',
    difficulty: 'Beginner',
    badgeColor: '#10b981',
    description: 'A 2-PC network connected through an L2 Switch to a Gateway Router offering DHCP service.',
    setup: (store) => {
      store.clearTopology();
      const pc1 = engine.addDevice('PC', { x: 120, y: 140 });
      const pc2 = engine.addDevice('PC', { x: 120, y: 300 });
      const sw1 = engine.addDevice('Switch', { x: 360, y: 220 });
      const rtr1 = engine.addDevice('Router', { x: 600, y: 220 });

      // Configure IP interfaces
      engine.updateDevice(pc1.id, {
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', macAddress: pc1.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['192.168.1.10'],
      });
      engine.updateDevice(pc2.id, {
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '192.168.1.11', subnetMask: '255.255.255.0', gateway: '192.168.1.1', macAddress: pc2.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['192.168.1.11'],
      });
      engine.updateDevice(rtr1.id, {
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', macAddress: rtr1.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['192.168.1.1'],
      });

      // Enable DHCP Pool
      engine.dhcp.configurePool(rtr1.id, {
        network: '192.168.1.0',
        subnetMask: '255.255.255.0',
        poolStart: '192.168.1.50',
        poolEnd: '192.168.1.100',
        gateway: '192.168.1.1',
        dns: '192.168.1.1',
        leaseTime: 86400,
      });

      // Wire connections
      engine.connectDevices(pc1.id, pc1.ports[0].id, sw1.id, sw1.ports[0].id);
      engine.connectDevices(pc2.id, pc2.ports[0].id, sw1.id, sw1.ports[1].id);
      engine.connectDevices(sw1.id, sw1.ports[2].id, rtr1.id, rtr1.ports[0].id);

      engine.arp.announce(pc1.id, '192.168.1.10');
      engine.arp.announce(pc2.id, '192.168.1.11');
      engine.arp.announce(rtr1.id, '192.168.1.1');

      store.syncWithEngine();
    },
  },
  {
    id: 'dual-subnet-routing',
    title: 'Dual Subnet Static Routing',
    category: 'Routing',
    difficulty: 'Intermediate',
    badgeColor: '#8b5cf6',
    description: 'Two separate LAN subnets (192.168.10.0/24 & 192.168.20.0/24) communicating across dual routers.',
    setup: (store) => {
      store.clearTopology();
      const pc1 = engine.addDevice('PC', { x: 100, y: 220 });
      const rtr1 = engine.addDevice('Router', { x: 320, y: 220 });
      const rtr2 = engine.addDevice('Router', { x: 560, y: 220 });
      const server = engine.addDevice('Server', { x: 780, y: 220 });

      engine.updateDevice(pc1.id, {
        name: 'Client-PC',
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '192.168.10.5', subnetMask: '255.255.255.0', gateway: '192.168.10.1', macAddress: pc1.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['192.168.10.5'],
      });

      engine.updateDevice(rtr1.id, {
        name: 'HQ-Router',
        interfaces: [
          { id: 'if0', name: 'eth0', ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', macAddress: rtr1.macAddress, status: 'UP', isDHCP: false },
          { id: 'if1', name: 'eth1', ipAddress: '10.0.0.1', subnetMask: '255.255.255.252', macAddress: '00:11:22:33:44:01', status: 'UP', isDHCP: false },
        ],
        ipAddresses: ['192.168.10.1', '10.0.0.1'],
      });

      engine.updateDevice(rtr2.id, {
        name: 'Branch-Router',
        interfaces: [
          { id: 'if0', name: 'eth0', ipAddress: '10.0.0.2', subnetMask: '255.255.255.252', macAddress: rtr2.macAddress, status: 'UP', isDHCP: false },
          { id: 'if1', name: 'eth1', ipAddress: '192.168.20.1', subnetMask: '255.255.255.0', macAddress: '00:11:22:33:44:02', status: 'UP', isDHCP: false },
        ],
        ipAddresses: ['10.0.0.2', '192.168.20.1'],
      });

      engine.updateDevice(server.id, {
        name: 'App-Server',
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '192.168.20.80', subnetMask: '255.255.255.0', gateway: '192.168.20.1', macAddress: server.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['192.168.20.80'],
      });

      // Static routes
      engine.routing.addRoute(rtr1.id, { network: '192.168.20.0', mask: '255.255.255.0', nextHop: '10.0.0.2', interface: 'eth1', metric: 1, isDefault: false, type: 'STATIC' });
      engine.routing.addRoute(rtr2.id, { network: '192.168.10.0', mask: '255.255.255.0', nextHop: '10.0.0.1', interface: 'eth0', metric: 1, isDefault: false, type: 'STATIC' });

      // Connect
      engine.connectDevices(pc1.id, pc1.ports[0].id, rtr1.id, rtr1.ports[0].id);
      engine.connectDevices(rtr1.id, rtr1.ports[1].id, rtr2.id, rtr2.ports[0].id);
      engine.connectDevices(rtr2.id, rtr2.ports[1].id, server.id, server.ports[0].id);

      engine.arp.announce(pc1.id, '192.168.10.5');
      engine.arp.announce(rtr1.id, '192.168.10.1');
      engine.arp.announce(rtr2.id, '192.168.20.1');
      engine.arp.announce(server.id, '192.168.20.80');

      store.syncWithEngine();
    },
  },
  {
    id: 'dmz-firewall-lab',
    title: 'Enterprise DMZ & Firewall Defense',
    category: 'Security',
    difficulty: 'Advanced',
    badgeColor: '#ef4444',
    description: 'Corporate LAN protected by a stateful Firewall filtering HTTP, SSH, and ICMP between External Internet and Internal Server.',
    setup: (store) => {
      store.clearTopology();
      const extUser = engine.addDevice('Laptop', { x: 80, y: 220 });
      const fw = engine.addDevice('Firewall', { x: 340, y: 220 });
      const webSrv = engine.addDevice('Server', { x: 620, y: 140 });
      const dbSrv = engine.addDevice('Server', { x: 620, y: 300 });

      engine.updateDevice(extUser.id, {
        name: 'Internet-User',
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '203.0.113.15', subnetMask: '255.255.255.0', macAddress: extUser.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['203.0.113.15'],
      });

      engine.updateDevice(fw.id, {
        name: 'Perimeter-FW',
        interfaces: [
          { id: 'if0', name: 'wan0', ipAddress: '203.0.113.1', subnetMask: '255.255.255.0', macAddress: fw.macAddress, status: 'UP', isDHCP: false },
          { id: 'if1', name: 'lan0', ipAddress: '10.10.1.1', subnetMask: '255.255.255.0', macAddress: '00:aa:bb:cc:dd:01', status: 'UP', isDHCP: false },
        ],
        ipAddresses: ['203.0.113.1', '10.10.1.1'],
      });

      engine.updateDevice(webSrv.id, {
        name: 'Public-Web-DMZ',
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '10.10.1.80', subnetMask: '255.255.255.0', gateway: '10.10.1.1', macAddress: webSrv.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['10.10.1.80'],
      });

      engine.updateDevice(dbSrv.id, {
        name: 'Secure-DB-Backend',
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '10.10.1.90', subnetMask: '255.255.255.0', gateway: '10.10.1.1', macAddress: dbSrv.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['10.10.1.90'],
      });

      // Firewall Rules
      engine.firewall.addRule(fw.id, {
        priority: 10,
        source: 'any',
        destination: '10.10.1.80',
        protocol: 'TCP',
        destinationPort: '80',
        action: 'ALLOW',
        enabled: true,
        description: 'Allow Web (HTTP:80) to DMZ',
      });
      engine.firewall.addRule(fw.id, {
        priority: 20,
        source: 'any',
        destination: '10.10.1.80',
        protocol: 'TCP',
        destinationPort: '443',
        action: 'ALLOW',
        enabled: true,
        description: 'Allow Secure Web (HTTPS:443) to DMZ',
      });
      engine.firewall.addRule(fw.id, {
        priority: 30,
        source: 'any',
        destination: '10.10.1.90',
        protocol: 'TCP',
        destinationPort: '3306',
        action: 'DENY',
        enabled: true,
        description: 'BLOCK Direct Database access from WAN',
      });

      // Connections
      engine.connectDevices(extUser.id, extUser.ports[0].id, fw.id, fw.ports[0].id);
      engine.connectDevices(fw.id, fw.ports[1].id, webSrv.id, webSrv.ports[0].id);
      engine.connectDevices(fw.id, fw.ports[2].id, dbSrv.id, dbSrv.ports[0].id);

      store.syncWithEngine();
    },
  },
  {
    id: 'dns-web-resolution',
    title: 'DNS Hostname Resolution & HTTP Web',
    category: 'Services',
    difficulty: 'Intermediate',
    badgeColor: '#38bdf8',
    description: 'PC resolves internal names via Local DNS Server and connects to Web Server.',
    setup: (store) => {
      store.clearTopology();
      const pc = engine.addDevice('PC', { x: 100, y: 220 });
      const sw = engine.addDevice('Switch', { x: 350, y: 220 });
      const dnsServer = engine.addDevice('DNSServer', { x: 580, y: 140 });
      const webServer = engine.addDevice('WebServer', { x: 580, y: 300 });

      engine.updateDevice(pc.id, {
        name: 'Workstation-01',
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '192.168.1.10', subnetMask: '255.255.255.0', dns: '192.168.1.53', macAddress: pc.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['192.168.1.10'],
      });

      engine.updateDevice(dnsServer.id, {
        name: 'DNS-Server',
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '192.168.1.53', subnetMask: '255.255.255.0', macAddress: dnsServer.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['192.168.1.53'],
      });

      engine.updateDevice(webServer.id, {
        name: 'Web-App-Server',
        interfaces: [{ id: 'if0', name: 'eth0', ipAddress: '192.168.1.80', subnetMask: '255.255.255.0', macAddress: webServer.macAddress, status: 'UP', isDHCP: false }],
        ipAddresses: ['192.168.1.80'],
      });

      // Add DNS records
      engine.dns.addRecord(dnsServer.id, { name: 'app.internal.lan', type: 'A', value: '192.168.1.80', ttl: 3600 });
      engine.dns.addRecord(dnsServer.id, { name: 'gateway.lan', type: 'A', value: '192.168.1.1', ttl: 3600 });

      // Connect
      engine.connectDevices(pc.id, pc.ports[0].id, sw.id, sw.ports[0].id);
      engine.connectDevices(dnsServer.id, dnsServer.ports[0].id, sw.id, sw.ports[1].id);
      engine.connectDevices(webServer.id, webServer.ports[0].id, sw.id, sw.ports[2].id);

      store.syncWithEngine();
    },
  },
];

interface ScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenariosModal: React.FC<ScenariosModalProps> = ({ isOpen, onClose }) => {
  const store = useNetworkStore();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🌐</span>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Pre-configured Network Scenarios & Labs
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Load realistic enterprise network topologies with one click.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {SCENARIOS.map((sc) => (
            <div
              key={sc.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.08)',
                      color: sc.badgeColor,
                      border: `1px solid ${sc.badgeColor}40`,
                      textTransform: 'uppercase',
                    }}
                  >
                    {sc.category} • {sc.difficulty}
                  </span>
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: '0 0 6px 0' }}>
                  {sc.title}
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  {sc.description}
                </p>
              </div>

              <button
                onClick={() => {
                  sc.setup(store);
                  onClose();
                }}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'opacity 0.15s',
                }}
              >
                <span>⚡</span> Load Scenario
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
