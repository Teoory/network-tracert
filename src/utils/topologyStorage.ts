// ============================================================
// Topology Storage — Save / Load / Export / Import Network Topologies
// ============================================================

import type { NetworkDevice, Connection, VLAN } from '../types';
import { engine } from '../simulation/engine/SimulationEngine';

export interface TopologyExportData {
  version: number;
  name: string;
  timestamp: number;
  devices: NetworkDevice[];
  connections: Connection[];
  vlans: Record<number, VLAN>;
  firewallRules?: Record<string, unknown[]>;
  natConfigs?: Record<string, unknown>;
  dnsRecords?: Record<string, unknown[]>;
}

const STORAGE_PREFIX = 'net_sandbox_topology_';

export class TopologyStorage {
  /**
   * Export the current state of the simulation as a JSON object.
   */
  static exportCurrentTopology(name: string = 'My Network Topology'): TopologyExportData {
    const state = engine.getState();
    const devices = Object.values(state.devices);
    const connections = Object.values(state.connections);

    // Collect firewall rules per device
    const firewallRules: Record<string, unknown[]> = {};
    devices.forEach((d) => {
      const rules = engine.firewall.getRules(d.id);
      if (rules.length > 0) firewallRules[d.id] = rules;
    });

    // Collect DNS records per device
    const dnsRecords: Record<string, unknown[]> = {};
    devices.forEach((d) => {
      const recs = engine.dns.getRecords(d.id);
      if (recs.length > 0) dnsRecords[d.id] = recs;
    });

    return {
      version: 1,
      name,
      timestamp: Date.now(),
      devices,
      connections,
      vlans: state.vlans,
      firewallRules,
      dnsRecords,
    };
  }

  /**
   * Import topology data and rebuild the simulation state.
   */
  static importTopology(data: TopologyExportData): boolean {
    try {
      if (!data || !Array.isArray(data.devices) || !Array.isArray(data.connections)) {
        throw new Error('Invalid topology data format');
      }

      // Clear existing network
      const currentDevices = engine.getDevices();
      currentDevices.forEach((d) => engine.removeDevice(d.id));

      // Recreate devices
      data.devices.forEach((dev) => {
        const added = engine.addDevice(dev.type, dev.position);
        engine.updateDevice(added.id, {
          name: dev.name,
          status: dev.status ?? 'UP',
          macAddress: dev.macAddress,
          ipAddresses: dev.ipAddresses,
          interfaces: dev.interfaces,
          ports: dev.ports.map((p) => ({
            ...p,
            connectedDeviceId: undefined,
            connectedPortId: undefined,
          })),
          config: dev.config ?? {},
        });
      });

      const newDevices = engine.getDevices();

      // Re-map and connect devices by port names
      data.connections.forEach((conn) => {
        const origSrc = data.devices.find((d) => d.id === conn.sourceDeviceId);
        const origDst = data.devices.find((d) => d.id === conn.destinationDeviceId);
        if (!origSrc || !origDst) return;

        const newSrc = newDevices.find((d) => d.name === origSrc.name);
        const newDst = newDevices.find((d) => d.name === origDst.name);
        if (!newSrc || !newDst) return;

        const origSrcPort = origSrc.ports.find((p) => p.id === conn.sourcePortId);
        const origDstPort = origDst.ports.find((p) => p.id === conn.destinationPortId);

        const newSrcPort = newSrc.ports.find((p) => p.name === origSrcPort?.name) ?? engine.getAvailablePort(newSrc.id);
        const newDstPort = newDst.ports.find((p) => p.name === origDstPort?.name) ?? engine.getAvailablePort(newDst.id);

        if (newSrcPort && newDstPort) {
          engine.connectDevices(newSrc.id, newSrcPort.id, newDst.id, newDstPort.id);
        }
      });

      // Restore DNS records if present
      if (data.dnsRecords) {
        Object.entries(data.dnsRecords).forEach(([oldDevId, records]) => {
          const origDev = data.devices.find((d) => d.id === oldDevId);
          const newDev = newDevices.find((d) => d.name === origDev?.name);
          if (newDev && Array.isArray(records)) {
            records.forEach((rec) => {
              const r = rec as { name: string; type: string; value: string; ttl: number };
              engine.dns.addRecord(newDev.id, {
                name: r.name,
                type: (r.type as any) || 'A',
                value: r.value,
                ttl: r.ttl || 3600,
              });
            });
          }
        });
      }

      engine.emitEvent('DEVICE_UPDATED', `Topology "${data.name}" successfully imported and restored.`, 'INFO');
      return true;
    } catch (err) {
      console.error('Failed to import topology:', err);
      return false;
    }
  }

  /**
   * Save to LocalStorage slot.
   */
  static saveToSlot(slotName: string): boolean {
    try {
      const data = this.exportCurrentTopology(slotName);
      localStorage.setItem(STORAGE_PREFIX + slotName, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('LocalStorage save failed:', e);
      return false;
    }
  }

  /**
   * Load from LocalStorage slot.
   */
  static loadFromSlot(slotName: string): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + slotName);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as TopologyExportData;
      return this.importTopology(parsed);
    } catch (e) {
      console.error('LocalStorage load failed:', e);
      return false;
    }
  }

  /**
   * List all saved slots in LocalStorage.
   */
  static getSavedSlots(): string[] {
    const slots: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        slots.push(key.replace(STORAGE_PREFIX, ''));
      }
    }
    return slots;
  }

  /**
   * Delete saved slot.
   */
  static deleteSlot(slotName: string): void {
    localStorage.removeItem(STORAGE_PREFIX + slotName);
  }
}
