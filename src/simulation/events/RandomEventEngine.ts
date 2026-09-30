// ============================================================
// Random Event Engine — Simulates Real-World Network Incidents
// ============================================================

import type { SimulationEngine } from '../engine/SimulationEngine';

export type IncidentType =
  | 'PORT_FAILURE'
  | 'CABLE_FAILURE'
  | 'DHCP_POOL_EXHAUSTED'
  | 'DNS_FAILURE'
  | 'SERVER_OVERLOAD'
  | 'NETWORK_CONGESTION';

export interface ActiveIncident {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  targetDeviceId?: string;
  targetPortId?: string;
  targetConnectionId?: string;
  startTime: number;
  resolved: boolean;
  mitigationHint: string;
}

export class RandomEventEngine {
  private engine: SimulationEngine;
  private activeIncidents: Map<string, ActiveIncident> = new Map();

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  getActiveIncidents(): ActiveIncident[] {
    return Array.from(this.activeIncidents.values()).filter((i) => !i.resolved);
  }

  getAllIncidents(): ActiveIncident[] {
    return Array.from(this.activeIncidents.values());
  }

  triggerIncident(type: IncidentType, targetId?: string): ActiveIncident | null {
    const devices = this.engine.getDevices();
    const connections = this.engine.getConnections();

    if (devices.length === 0) return null;

    const incidentId = `inc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    let incident: ActiveIncident | null = null;

    switch (type) {
      case 'PORT_FAILURE': {
        const dev = targetId
          ? this.engine.getDevice(targetId)
          : devices.find((d) => d.ports.some((p) => p.status === 'UP'));
        if (!dev) return null;
        const upPort = dev.ports.find((p) => p.status === 'UP');
        if (!upPort) return null;

        this.engine.setPortDown(dev.id, upPort.id);
        incident = {
          id: incidentId,
          type,
          title: `Hardware Port Failure on ${dev.name}`,
          description: `Port ${upPort.name} on device ${dev.name} failed due to hardware/transceiver fault. Link is DOWN.`,
          targetDeviceId: dev.id,
          targetPortId: upPort.id,
          startTime: Date.now(),
          resolved: false,
          mitigationHint: `Open ${dev.name} in Inspector or Terminal and set Port ${upPort.name} to UP or reconnect cable.`,
        };
        this.engine.emitEvent('PORT_FAILURE', incident.description, 'ERROR', {
          incidentId,
          deviceId: dev.id,
          portId: upPort.id,
        });
        break;
      }

      case 'CABLE_FAILURE': {
        const conn = targetId
          ? this.engine.getConnection(targetId)
          : connections.find((c) => c.status === 'UP');
        if (!conn) return null;

        const src = this.engine.getDevice(conn.sourceDeviceId);
        const dst = this.engine.getDevice(conn.destinationDeviceId);
        this.engine.removeConnection(conn.id);

        incident = {
          id: incidentId,
          type,
          title: `Cable Disconnected / Physical Cut`,
          description: `Physical connection between ${src?.name ?? 'Device'} and ${dst?.name ?? 'Device'} was severed.`,
          targetConnectionId: conn.id,
          startTime: Date.now(),
          resolved: false,
          mitigationHint: `Reconnect ${src?.name ?? 'Device'} to ${dst?.name ?? 'Device'} on the canvas.`,
        };
        this.engine.emitEvent('CABLE_FAILURE', incident.description, 'CRITICAL', {
          incidentId,
          sourceDeviceId: conn.sourceDeviceId,
          destinationDeviceId: conn.destinationDeviceId,
        });
        break;
      }

      case 'DHCP_POOL_EXHAUSTED': {
        const dhcpServer = targetId
          ? this.engine.getDevice(targetId)
          : devices.find((d) => d.type === 'DHCPServer' || d.type === 'Router');
        if (!dhcpServer) return null;

        incident = {
          id: incidentId,
          type,
          title: `DHCP Address Pool Exhaustion on ${dhcpServer.name}`,
          description: `All available IP leases in the subnet have been assigned. New clients cannot obtain dynamic IP addresses.`,
          targetDeviceId: dhcpServer.id,
          startTime: Date.now(),
          resolved: false,
          mitigationHint: `Expand DHCP pool range in ${dhcpServer.name} inspector or configure static IP addresses.`,
        };
        this.engine.emitEvent('DHCP_POOL_EXHAUSTED', incident.description, 'ERROR', {
          incidentId,
          deviceId: dhcpServer.id,
        });
        break;
      }

      case 'DNS_FAILURE': {
        const dnsServer = targetId
          ? this.engine.getDevice(targetId)
          : devices.find((d) => d.type === 'DNSServer');
        if (!dnsServer) return null;

        this.engine.updateDevice(dnsServer.id, { status: 'DOWN' });
        incident = {
          id: incidentId,
          type,
          title: `DNS Daemon Service Crash on ${dnsServer.name}`,
          description: `Named DNS resolution service stopped responding. Hostname lookups across the network will fail.`,
          targetDeviceId: dnsServer.id,
          startTime: Date.now(),
          resolved: false,
          mitigationHint: `Restart DNS service on ${dnsServer.name} (set status to UP in Inspector).`,
        };
        this.engine.emitEvent('DNS_FAILURE', incident.description, 'CRITICAL', {
          incidentId,
          deviceId: dnsServer.id,
        });
        break;
      }

      case 'SERVER_OVERLOAD': {
        const server = targetId
          ? this.engine.getDevice(targetId)
          : devices.find((d) => d.type.includes('Server') || d.type === 'Router');
        if (!server) return null;

        this.engine.updateDevice(server.id, {
          status: 'OVERLOADED',
          metrics: {
            ...server.metrics,
            cpu: 98,
            ram: 94,
            latency: 240,
            packetLoss: 35,
          },
        });

        incident = {
          id: incidentId,
          type,
          title: `Resource Exhaustion on ${server.name}`,
          description: `CPU usage spiked to 98% and memory pressure is causing 35% packet drop and 240ms latency.`,
          targetDeviceId: server.id,
          startTime: Date.now(),
          resolved: false,
          mitigationHint: `Scale backend capacity or balance incoming traffic using a Load Balancer or Firewall rate limiting.`,
        };
        this.engine.emitEvent('SERVER_OVERLOAD', incident.description, 'WARNING', {
          incidentId,
          deviceId: server.id,
        });
        break;
      }

      case 'NETWORK_CONGESTION': {
        const conn = connections[0];
        if (!conn) return null;

        incident = {
          id: incidentId,
          type,
          title: `High Link Congestion & Buffer Bloat`,
          description: `Network link bandwidth saturated. Queue latency increased to 120ms with intermittent frame drops.`,
          targetConnectionId: conn.id,
          startTime: Date.now(),
          resolved: false,
          mitigationHint: `Upgrade link bandwidth in Inspector or optimize payload traffic.`,
        };
        this.engine.emitEvent('NETWORK_CONGESTION', incident.description, 'WARNING', {
          incidentId,
          connectionId: conn.id,
        });
        break;
      }
    }

    if (incident) {
      this.activeIncidents.set(incident.id, incident);
    }

    return incident;
  }

  resolveIncident(incidentId: string): boolean {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident || incident.resolved) return false;

    incident.resolved = true;

    // Restore affected state
    if (incident.targetDeviceId) {
      const dev = this.engine.getDevice(incident.targetDeviceId);
      if (dev) {
        if (dev.status === 'OVERLOADED' || dev.status === 'DOWN') {
          this.engine.updateDevice(dev.id, {
            status: 'UP',
            metrics: {
              ...dev.metrics,
              cpu: 15,
              ram: 25,
              latency: 1,
              packetLoss: 0,
            },
          });
        }
        if (incident.targetPortId) {
          this.engine.setPortUp(dev.id, incident.targetPortId);
        }
      }
    }

    this.engine.emitEvent(
      'DEVICE_UPDATED',
      `✅ Incident Resolved: ${incident.title}`,
      'INFO',
      { incidentId, resolved: true }
    );

    return true;
  }
}
