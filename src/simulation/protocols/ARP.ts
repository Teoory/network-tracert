import type { SimulationEngine } from '../engine/SimulationEngine';

export interface ARPResult {
  success: boolean;
  mac?: string;
}

export class ARPProtocol {
  private engine: SimulationEngine;

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  resolve(fromDeviceId: string, targetIp: string): ARPResult {
    const cache = this.engine.getARPCache(fromDeviceId);
    if (cache.has(targetIp)) return { success: true, mac: cache.get(targetIp)! };

    const target = this.engine.getDevices().find((d) =>
      d.interfaces.some((iface) => iface.ipAddress === targetIp)
    );

    if (!target) {
      this.engine.emitEvent('ARP_REQUEST', `ARP Request: Who has ${targetIp}? (No reply)`, 'WARNING', { fromDeviceId, targetIp });
      return { success: false };
    }

    this.engine.emitEvent('ARP_REQUEST', `ARP Request: Who has ${targetIp}? Tell ${this.engine.getDevice(fromDeviceId)?.name}`, 'INFO', { fromDeviceId, targetIp });
    const mac = target.macAddress;
    cache.set(targetIp, mac);
    this.engine.emitEvent('ARP_REPLY', `ARP Reply: ${targetIp} is at ${mac}`, 'INFO', { fromDeviceId, targetIp, mac, responderId: target.id });
    return { success: true, mac };
  }

  announce(deviceId: string, ip: string): void {
    const device = this.engine.getDevice(deviceId);
    if (!device) return;
    for (const neighborId of this.engine.getNeighbors(deviceId)) {
      const cache = this.engine.getARPCache(neighborId);
      cache.set(ip, device.macAddress);
    }
  }
}
