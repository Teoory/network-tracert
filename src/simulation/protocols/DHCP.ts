// ============================================================
// DHCP Protocol — Automatic IP address allocation
// ============================================================

import type { DHCPPool, DHCPLease } from '../../types';
import { incrementIP, ipToInt, now } from '../../utils/network';
import type { SimulationEngine } from '../engine/SimulationEngine';

export class DHCPProtocol {
  private engine: SimulationEngine;
  // deviceId -> DHCPPool
  private pools: Map<string, DHCPPool> = new Map();

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  /** Configure a DHCP server device with a pool */
  configurePool(serverDeviceId: string, pool: Omit<DHCPPool, 'leases'>): void {
    this.pools.set(serverDeviceId, { ...pool, leases: [] });
    this.engine.emitEvent(
      'DHCP_DISCOVER',
      `DHCP Pool configured on ${this.engine.getDevice(serverDeviceId)?.name}: ${pool.network}`,
      'INFO',
      { deviceId: serverDeviceId, pool }
    );
  }

  getPool(serverDeviceId: string): DHCPPool | undefined {
    return this.pools.get(serverDeviceId);
  }

  getAllPools(): Map<string, DHCPPool> {
    return this.pools;
  }

  /** Client requests an IP from any reachable DHCP server.
   *  Returns assigned lease or null on failure. */
  requestIP(clientDeviceId: string): DHCPLease | null {
    const client = this.engine.getDevice(clientDeviceId);
    if (!client) return null;

    // Find reachable DHCP server
    const server = this.findReachableDHCPServer(clientDeviceId);
    if (!server) {
      this.engine.emitEvent('DHCP_DISCOVER', `DHCP Discover from ${client.name}: No server found`, 'WARNING', { deviceId: clientDeviceId });
      return null;
    }

    const pool = this.pools.get(server.id)!;

    // DHCP DISCOVER
    this.engine.emitEvent('DHCP_DISCOVER', `DHCP Discover: ${client.name} → ${server.name}`, 'INFO', { deviceId: clientDeviceId });

    // Find next available IP
    const ip = this.allocateIP(pool, clientDeviceId);
    if (!ip) {
      this.engine.emitEvent('DHCP_POOL_EXHAUSTED', `DHCP Pool exhausted on ${server.name}`, 'ERROR', { deviceId: server.id });
      return null;
    }

    // DHCP OFFER
    this.engine.emitEvent('DHCP_OFFER', `DHCP Offer: ${server.name} → ${client.name}: ${ip}`, 'INFO', { deviceId: server.id, offeredIp: ip });

    // DHCP REQUEST
    this.engine.emitEvent('DHCP_REQUEST', `DHCP Request: ${client.name} requesting ${ip}`, 'INFO', { deviceId: clientDeviceId });

    const lease: DHCPLease = {
      ip,
      mac: client.macAddress,
      deviceId: clientDeviceId,
      startTime: now(),
      leaseTime: pool.leaseTime,
      gateway: pool.gateway,
      dns: pool.dns,
      subnetMask: pool.subnetMask,
    };

    pool.leases.push(lease);

    // DHCP ACK
    this.engine.emitEvent('DHCP_ACK', `DHCP ACK: ${client.name} received ${ip} (lease ${pool.leaseTime}s)`, 'INFO', {
      deviceId: clientDeviceId, ip, gateway: pool.gateway, dns: pool.dns,
    });

    // Apply IP to client interface
    const updatedInterfaces = client.interfaces.map((iface, idx) =>
      idx === 0
        ? { ...iface, ipAddress: ip, subnetMask: pool.subnetMask, gateway: pool.gateway, dns: pool.dns, isDHCP: true }
        : iface
    );
    this.engine.updateDevice(clientDeviceId, {
      interfaces: updatedInterfaces,
      ipAddresses: [ip],
    });
    this.engine.arp.announce(clientDeviceId, ip);

    return lease;
  }

  private allocateIP(pool: DHCPPool, clientDeviceId: string): string | null {
    // Check if client already has a lease
    const existing = pool.leases.find((l) => l.deviceId === clientDeviceId);
    if (existing) return existing.ip;

    // Find next free IP
    const start = ipToInt(pool.poolStart);
    const end = ipToInt(pool.poolEnd);
    const usedIPs = new Set(pool.leases.map((l) => l.ip));

    for (let n = start; n <= end; n++) {
      const ip = [
        (n >>> 24) & 0xff,
        (n >>> 16) & 0xff,
        (n >>> 8) & 0xff,
        n & 0xff,
      ].join('.');
      if (!usedIPs.has(ip)) return ip;
    }
    return null;
  }

  private findReachableDHCPServer(clientDeviceId: string): ReturnType<SimulationEngine['getDevice']> {
    const path = (targetId: string): boolean => {
      return this.engine.findPath(clientDeviceId, targetId).length > 0;
    };

    for (const [serverId] of this.pools) {
      if (path(serverId)) return this.engine.getDevice(serverId);
    }
    return undefined;
  }

  releaseIP(clientDeviceId: string): void {
    for (const pool of this.pools.values()) {
      const idx = pool.leases.findIndex((l) => l.deviceId === clientDeviceId);
      if (idx !== -1) {
        const ip = pool.leases[idx].ip;
        pool.leases.splice(idx, 1);
        this.engine.emitEvent('DEVICE_DISCONNECTED', `DHCP Released: ${ip}`, 'INFO', { deviceId: clientDeviceId, ip });
      }
    }
  }
}
