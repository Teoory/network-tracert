// ============================================================
// Firewall Protocol — Stateless packet filtering
// ============================================================

import type { FirewallRule, FirewallAction, Packet } from '../../types';
import { generateId } from '../../utils/network';
import type { SimulationEngine } from '../engine/SimulationEngine';

export class FirewallProtocol {
  private engine: SimulationEngine;
  // deviceId -> FirewallRule[]
  private rules: Map<string, FirewallRule[]> = new Map();

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  getRules(deviceId: string): FirewallRule[] {
    return (this.rules.get(deviceId) ?? []).sort((a, b) => a.priority - b.priority);
  }

  addRule(deviceId: string, rule: Omit<FirewallRule, 'id'>): FirewallRule {
    const newRule: FirewallRule = { ...rule, id: generateId('fw') };
    const existing = this.rules.get(deviceId) ?? [];
    this.rules.set(deviceId, [...existing, newRule]);
    return newRule;
  }

  removeRule(deviceId: string, ruleId: string): void {
    const rules = this.rules.get(deviceId) ?? [];
    this.rules.set(deviceId, rules.filter((r) => r.id !== ruleId));
  }

  updateRule(deviceId: string, ruleId: string, updates: Partial<FirewallRule>): void {
    const rules = this.rules.get(deviceId) ?? [];
    this.rules.set(
      deviceId,
      rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r))
    );
  }

  /** Evaluate a packet against firewall rules on a device.
   *  Returns ALLOW or DENY. Default policy: ALLOW. */
  evaluate(
    firewallDeviceId: string,
    packet: Packet,
    direction: 'INBOUND' | 'OUTBOUND' = 'INBOUND'
  ): { action: FirewallAction; matchedRule?: FirewallRule } {
    const rules = this.getRules(firewallDeviceId).filter((r) => r.enabled);

    for (const rule of rules) {
      if (this.matches(rule, packet)) {
        if (rule.action === 'DENY') {
          this.engine.emitEvent(
            'FIREWALL_BLOCK',
            `🛡️ Firewall DENY: ${packet.protocol} ${packet.ip?.srcIp ?? '?'} → ${packet.ip?.dstIp ?? '?'} (Rule #${rule.priority}: ${rule.description})`,
            'WARNING',
            { deviceId: firewallDeviceId, packetId: packet.id, ruleId: rule.id, direction }
          );
        }
        return { action: rule.action, matchedRule: rule };
      }
    }

    // Default allow
    return { action: 'ALLOW' };
  }

  private matches(rule: FirewallRule, packet: Packet): boolean {
    // Protocol check
    if (rule.protocol !== 'ANY' && rule.protocol !== packet.protocol) return false;

    // Source check
    if (rule.source !== 'ANY') {
      const srcIp = packet.ip?.srcIp;
      if (!srcIp || !this.ipMatchesCIDR(srcIp, rule.source)) return false;
    }

    // Destination check
    if (rule.destination !== 'ANY') {
      const dstIp = packet.ip?.dstIp;
      if (!dstIp || !this.ipMatchesCIDR(dstIp, rule.destination)) return false;
    }

    // Destination port check
    if (rule.destinationPort && rule.destinationPort !== 'ANY') {
      const pktPort = packet.transport?.dstPort?.toString();
      if (!pktPort || pktPort !== rule.destinationPort) return false;
    }

    return true;
  }

  private ipMatchesCIDR(ip: string, cidrOrIp: string): boolean {
    if (cidrOrIp === 'ANY') return true;
    if (!cidrOrIp.includes('/')) return ip === cidrOrIp;

    const [network, prefixStr] = cidrOrIp.split('/');
    const prefix = parseInt(prefixStr, 10);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

    const ipToInt = (addr: string) =>
      addr.split('.').reduce((acc, o) => (acc << 8) + parseInt(o, 10), 0) >>> 0;

    return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
  }
}
