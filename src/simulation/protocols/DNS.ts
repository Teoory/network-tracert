// ============================================================
// DNS Protocol — Hostname to IP resolution
// ============================================================

import type { DNSRecord } from '../../types';
import { generateId } from '../../utils/network';
import type { SimulationEngine } from '../engine/SimulationEngine';

export class DNSProtocol {
  private engine: SimulationEngine;
  // deviceId -> DNSRecord[]
  private records: Map<string, DNSRecord[]> = new Map();

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  /** Add DNS records to a DNS server device */
  addRecord(serverDeviceId: string, record: Omit<DNSRecord, 'id'>): void {
    const existing = this.records.get(serverDeviceId) ?? [];
    this.records.set(serverDeviceId, [...existing, { ...record, id: generateId('dns') }]);
  }

  addRecords(serverDeviceId: string, records: Omit<DNSRecord, 'id'>[]): void {
    records.forEach((r) => this.addRecord(serverDeviceId, r));
  }

  getRecords(serverDeviceId: string): DNSRecord[] {
    return this.records.get(serverDeviceId) ?? [];
  }

  getAllServers(): Map<string, DNSRecord[]> {
    return this.records;
  }

  /** Resolve a hostname to an IP from the given client's perspective */
  resolve(
    clientDeviceId: string,
    hostname: string
  ): { success: boolean; ip?: string; serverName?: string } {
    const client = this.engine.getDevice(clientDeviceId);
    if (!client) return { success: false };

    // Find reachable DNS server
    const server = this.findReachableDNSServer(clientDeviceId);
    if (!server) {
      this.engine.emitEvent('DNS_QUERY', `DNS Query: ${hostname} (No server reachable)`, 'WARNING', { deviceId: clientDeviceId, hostname });
      return { success: false };
    }

    this.engine.emitEvent('DNS_QUERY', `DNS Query: ${client.name} → ${server.name}: ${hostname}?`, 'INFO', {
      deviceId: clientDeviceId, hostname, serverId: server.id,
    });

    const records = this.records.get(server.id) ?? [];
    const match = records.find(
      (r) => r.name.toLowerCase() === hostname.toLowerCase() && r.type === 'A'
    );

    if (!match) {
      this.engine.emitEvent('DNS_RESPONSE', `DNS: NXDOMAIN — ${hostname} not found`, 'WARNING', { deviceId: server.id, hostname });
      return { success: false, serverName: server.name };
    }

    this.engine.emitEvent('DNS_RESPONSE', `DNS Response: ${hostname} → ${match.value}`, 'INFO', {
      deviceId: server.id, hostname, ip: match.value,
    });

    return { success: true, ip: match.value, serverName: server.name };
  }

  private findReachableDNSServer(clientDeviceId: string) {
    // Prefer configured DNS in client interface
    const client = this.engine.getDevice(clientDeviceId);
    const configuredDns = client?.interfaces[0]?.dns;

    // Find device with that IP
    if (configuredDns) {
      const dnsDevice = this.engine.getDevices().find((d) =>
        d.interfaces.some((i) => i.ipAddress === configuredDns)
      );
      if (dnsDevice && this.records.has(dnsDevice.id) && this.engine.findPath(clientDeviceId, dnsDevice.id).length > 0) {
        return dnsDevice;
      }
    }

    // Fall back to any reachable DNS server with records
    for (const [serverId] of this.records) {
      const path = this.engine.findPath(clientDeviceId, serverId);
      if (path.length > 0) return this.engine.getDevice(serverId);
    }

    return undefined;
  }
}
