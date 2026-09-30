// ============================================================
// Security Event Engine — Simulates Cyber Attacks & Mitigation
// ============================================================

import type { SimulationEngine } from '../engine/SimulationEngine';

export type SecurityAttackType =
  | 'PORT_SCAN'
  | 'SSH_BRUTE_FORCE'
  | 'DDOS'
  | 'ARP_SPOOFING'
  | 'SUSPICIOUS_TRAFFIC';

export interface ActiveAttack {
  id: string;
  type: SecurityAttackType;
  title: string;
  sourceIp: string;
  sourceDeviceId?: string;
  targetDeviceId: string;
  targetIp: string;
  targetPort?: number;
  targetedPorts?: number[];
  startTime: number;
  packetsGenerated: number;
  mitigated: boolean;
  status: 'ACTIVE' | 'MITIGATED' | 'BLOCKED_BY_FIREWALL';
  mitigationRecommendation: string;
}

export class SecurityEventEngine {
  private engine: SimulationEngine;
  private activeAttacks: Map<string, ActiveAttack> = new Map();

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  getActiveAttacks(): ActiveAttack[] {
    return Array.from(this.activeAttacks.values()).filter((a) => !a.mitigated);
  }

  getAllAttacks(): ActiveAttack[] {
    return Array.from(this.activeAttacks.values());
  }

  launchAttack(
    type: SecurityAttackType,
    targetDeviceId: string,
    sourceDeviceId?: string
  ): ActiveAttack | null {
    const target = this.engine.getDevice(targetDeviceId);
    if (!target) return null;

    const source = sourceDeviceId ? this.engine.getDevice(sourceDeviceId) : undefined;
    const targetIp = target.interfaces[0]?.ipAddress ?? '192.168.1.50';
    const sourceIp = source?.interfaces[0]?.ipAddress ?? '198.51.100.77';

    const attackId = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    let attack: ActiveAttack | null = null;

    switch (type) {
      case 'PORT_SCAN': {
        const ports = [21, 22, 23, 25, 53, 80, 443, 3306, 8080];
        attack = {
          id: attackId,
          type,
          title: `SYN Port Scan on ${target.name}`,
          sourceIp,
          sourceDeviceId: source?.id,
          targetDeviceId: target.id,
          targetIp,
          targetedPorts: ports,
          startTime: Date.now(),
          packetsGenerated: ports.length,
          mitigated: false,
          status: 'ACTIVE',
          mitigationRecommendation: `Add Firewall rule to DENY incoming traffic from ${sourceIp} or drop unsolicited SYN scans.`,
        };

        this.engine.emitEvent(
          'PORT_SCAN',
          `🚨 Port Scan detected targeting ${target.name} (${targetIp}) across ports [${ports.join(', ')}] from ${sourceIp}`,
          'WARNING',
          { attackId, targetDeviceId: target.id, sourceIp, ports }
        );

        // Generate simulated TCP probe packets
        ports.forEach((port) => {
          if (source) {
            const pkt = this.engine.packets.createPacket({
              sourceDeviceId: source.id,
              destinationDeviceId: target.id,
              protocol: 'TCP',
              size: 60,
              ttl: 64,
              ip: { srcIp: sourceIp, dstIp: targetIp, ttl: 64, protocol: 'TCP' },
              transport: { srcPort: 49152 + Math.floor(Math.random() * 1000), dstPort: port, protocol: 'TCP', flags: ['SYN'] },
            });
            this.engine.packets.routePacket(pkt.id);
          }
        });
        break;
      }

      case 'SSH_BRUTE_FORCE': {
        attack = {
          id: attackId,
          type,
          title: `SSH Brute Force on ${target.name} (Port 22)`,
          sourceIp,
          sourceDeviceId: source?.id,
          targetDeviceId: target.id,
          targetIp,
          targetPort: 22,
          startTime: Date.now(),
          packetsGenerated: 12,
          mitigated: false,
          status: 'ACTIVE',
          mitigationRecommendation: `Block source IP ${sourceIp} on Firewall or change SSH management port.`,
        };

        this.engine.emitEvent(
          'SSH_BRUTE_FORCE',
          `🚨 High-rate SSH authentication failure burst on ${target.name} (Port 22) originating from ${sourceIp}`,
          'CRITICAL',
          { attackId, targetDeviceId: target.id, sourceIp, port: 22 }
        );

        if (source) {
          for (let i = 0; i < 6; i++) {
            const pkt = this.engine.packets.createPacket({
              sourceDeviceId: source.id,
              destinationDeviceId: target.id,
              protocol: 'SSH',
              size: 128,
              ttl: 64,
              ip: { srcIp: sourceIp, dstIp: targetIp, ttl: 64, protocol: 'TCP' },
              transport: { srcPort: 52000 + i, dstPort: 22, protocol: 'TCP', flags: ['PSH', 'ACK'] },
            });
            this.engine.packets.routePacket(pkt.id);
          }
        }
        break;
      }

      case 'DDOS': {
        attack = {
          id: attackId,
          type,
          title: `UDP/ICMP Flood DDoS against ${target.name}`,
          sourceIp,
          sourceDeviceId: source?.id,
          targetDeviceId: target.id,
          targetIp,
          startTime: Date.now(),
          packetsGenerated: 50,
          mitigated: false,
          status: 'ACTIVE',
          mitigationRecommendation: `Deploy upstream Firewall rate limiting or drop packets from subnet ${sourceIp}/24.`,
        };

        // Spike target metrics
        this.engine.updateDevice(target.id, {
          metrics: {
            ...target.metrics,
            cpu: 95,
            packetsPerSec: target.metrics.packetsPerSec + 450,
            throughput: target.metrics.throughput + 85,
            latency: 180,
            packetLoss: 25,
          },
        });

        this.engine.emitEvent(
          'DDOS',
          `💥 Massive Volumetric DDoS flood targeting ${target.name} (${targetIp}). Network saturation & latency spike detected!`,
          'CRITICAL',
          { attackId, targetDeviceId: target.id, sourceIp }
        );
        break;
      }

      case 'ARP_SPOOFING': {
        const fakeMac = 'DE:AD:BE:EF:00:01';
        attack = {
          id: attackId,
          type,
          title: `ARP Cache Poisoning / Man-In-The-Middle`,
          sourceIp,
          sourceDeviceId: source?.id,
          targetDeviceId: target.id,
          targetIp,
          startTime: Date.now(),
          packetsGenerated: 4,
          mitigated: false,
          status: 'ACTIVE',
          mitigationRecommendation: `Configure Static ARP binding on ${target.name} or enable Dynamic ARP Inspection (DAI) on switches.`,
        };

        // Inject poisoned entry into target ARP cache
        const cache = this.engine.getARPCache(target.id);
        cache.set(target.interfaces[0]?.gateway ?? '192.168.1.1', fakeMac);

        this.engine.emitEvent(
          'ARP_SPOOFING',
          `⚠️ Gratuitous ARP Poisoning detected! Gateway MAC spoofed as ${fakeMac} on ${target.name}`,
          'CRITICAL',
          { attackId, targetDeviceId: target.id, fakeMac }
        );
        break;
      }

      case 'SUSPICIOUS_TRAFFIC': {
        attack = {
          id: attackId,
          type,
          title: `Anomalous Egress Traffic from ${source?.name ?? sourceIp}`,
          sourceIp,
          sourceDeviceId: source?.id,
          targetDeviceId: target.id,
          targetIp,
          startTime: Date.now(),
          packetsGenerated: 8,
          mitigated: false,
          status: 'ACTIVE',
          mitigationRecommendation: `Inspect packet payloads in Packet Inspector and block C2 destination IP in Firewall.`,
        };

        this.engine.emitEvent(
          'SUSPICIOUS_TRAFFIC',
          `⚠️ Anomaly detected: Unexpected high volume encrypted outbound session to unknown endpoint ${targetIp}`,
          'WARNING',
          { attackId, sourceIp, targetIp }
        );
        break;
      }
    }

    if (attack) {
      this.activeAttacks.set(attack.id, attack);
    }

    return attack;
  }

  mitigateAttackWithFirewall(attackId: string, firewallDeviceId: string): boolean {
    const attack = this.activeAttacks.get(attackId);
    if (!attack || attack.mitigated) return false;

    const fw = this.engine.getDevice(firewallDeviceId);
    if (!fw) return false;

    // Add blocking rule to firewall
    this.engine.firewall.addRule(firewallDeviceId, {
      priority: 10,
      source: attack.sourceIp,
      destination: 'ANY',
      protocol: 'ANY',
      action: 'DENY',
      enabled: true,
      description: `Auto-mitigation for ${attack.title}`,
    });

    attack.mitigated = true;
    attack.status = 'BLOCKED_BY_FIREWALL';

    // If target was burdened by DDoS, normalize metrics
    const target = this.engine.getDevice(attack.targetDeviceId);
    if (target && attack.type === 'DDOS') {
      this.engine.updateDevice(target.id, {
        metrics: {
          ...target.metrics,
          cpu: 18,
          packetsPerSec: 10,
          throughput: 1,
          latency: 2,
          packetLoss: 0,
        },
      });
    }

    this.engine.emitEvent(
      'FIREWALL_BLOCK',
      `🛡️ Attack Mitigated: Firewall rule deployed on ${fw.name} blocking source ${attack.sourceIp}`,
      'INFO',
      { attackId, firewallDeviceId, sourceIp: attack.sourceIp }
    );

    return true;
  }
}
