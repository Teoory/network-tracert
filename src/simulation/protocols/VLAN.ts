// ============================================================
// VLAN Protocol — IEEE 802.1Q Virtual LAN & Trunking
// ============================================================

import type { SimulationEngine } from '../engine/SimulationEngine';

export interface VLANConfig {
  id: number;
  name: string;
  subnet?: string;
  gateway?: string;
}

export interface PortVLANConfig {
  portId: string;
  mode: 'access' | 'trunk';
  accessVlan: number;
  allowedVlans?: number[]; // For trunk mode
  nativeVlan?: number;     // For trunk mode
}

export class VLANProtocol {
  private engine: SimulationEngine;
  private switchVlans: Map<string, VLANConfig[]> = new Map(); // switchId -> VLANConfig[]
  private portVlanConfigs: Map<string, Map<string, PortVLANConfig>> = new Map(); // deviceId -> (portId -> config)

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  getVlans(switchId: string): VLANConfig[] {
    if (!this.switchVlans.has(switchId)) {
      this.switchVlans.set(switchId, [
        { id: 1, name: 'default' },
      ]);
    }
    return [...this.switchVlans.get(switchId)!];
  }

  addVlan(switchId: string, vlan: VLANConfig): void {
    const list = this.getVlans(switchId);
    if (!list.some((v) => v.id === vlan.id)) {
      list.push(vlan);
      this.switchVlans.set(switchId, list);
      this.engine.emitEvent(
        'DEVICE_UPDATED',
        `VLAN ${vlan.id} (${vlan.name}) created on switch`,
        'INFO',
        { switchId, vlan }
      );
    }
  }

  removeVlan(switchId: string, vlanId: number): void {
    if (vlanId === 1) return; // Cannot delete default VLAN
    let list = this.getVlans(switchId);
    list = list.filter((v) => v.id !== vlanId);
    this.switchVlans.set(switchId, list);
  }

  getPortConfig(deviceId: string, portId: string): PortVLANConfig {
    if (!this.portVlanConfigs.has(deviceId)) {
      this.portVlanConfigs.set(deviceId, new Map());
    }
    const devMap = this.portVlanConfigs.get(deviceId)!;
    if (!devMap.has(portId)) {
      devMap.set(portId, {
        portId,
        mode: 'access',
        accessVlan: 1,
        nativeVlan: 1,
        allowedVlans: [1],
      });
    }
    return devMap.get(portId)!;
  }

  setPortConfig(deviceId: string, portId: string, config: Partial<PortVLANConfig>): void {
    const current = this.getPortConfig(deviceId, portId);
    const updated = { ...current, ...config };
    this.portVlanConfigs.get(deviceId)!.set(portId, updated);

    this.engine.emitEvent(
      'DEVICE_UPDATED',
      `Port ${portId} VLAN mode set to ${updated.mode} (VLAN ${updated.mode === 'access' ? updated.accessVlan : 'trunk'})`,
      'INFO',
      { deviceId, portId, config: updated }
    );
  }

  canForward(
    switchId: string,
    ingressPortId: string,
    egressPortId: string,
    vlanId: number = 1
  ): boolean {
    const ingress = this.getPortConfig(switchId, ingressPortId);
    const egress = this.getPortConfig(switchId, egressPortId);

    // Determine traffic VLAN
    let packetVlan = vlanId;
    if (ingress.mode === 'access') {
      packetVlan = ingress.accessVlan;
    }

    // Check if egress port allows this VLAN
    if (egress.mode === 'access') {
      return egress.accessVlan === packetVlan;
    } else if (egress.mode === 'trunk') {
      if (egress.allowedVlans && egress.allowedVlans.length > 0) {
        return egress.allowedVlans.includes(packetVlan);
      }
      return true; // All allowed by default
    }

    return false;
  }
}
