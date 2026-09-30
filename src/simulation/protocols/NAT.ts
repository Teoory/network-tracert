// ============================================================
// NAT Protocol — Network Address Translation (PAT / SNAT)
// ============================================================

import type { SimulationEngine } from '../engine/SimulationEngine';

export interface NATTranslation {
  id: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  insideLocalIp: string;
  insideLocalPort: number;
  insideGlobalIp: string;
  insideGlobalPort: number;
  outsideGlobalIp: string;
  outsideGlobalPort: number;
  timestamp: number;
  expiresAt: number;
}

export interface NATConfig {
  enabled: boolean;
  publicInterfaceId?: string;
  publicIp?: string;
  patPoolStartPort?: number;
  patPoolEndPort?: number;
  staticMappings?: Array<{
    insideIp: string;
    insidePort: number;
    outsidePort: number;
    protocol: 'TCP' | 'UDP';
  }>;
}

export class NATProtocol {
  private engine: SimulationEngine;
  private translations: Map<string, NATTranslation[]> = new Map(); // routerId -> NATTranslation[]
  private nextPortMap: Map<string, number> = new Map();

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  getTranslations(routerId: string): NATTranslation[] {
    this.cleanupExpired(routerId);
    return [...(this.translations.get(routerId) ?? [])];
  }

  translateOutbound(
    routerId: string,
    protocol: 'TCP' | 'UDP' | 'ICMP',
    srcIp: string,
    srcPort: number,
    dstIp: string,
    dstPort: number,
    publicIp: string
  ): { translatedSrcIp: string; translatedSrcPort: number } {
    const router = this.engine.getDevice(routerId);
    if (!router) return { translatedSrcIp: srcIp, translatedSrcPort: srcPort };

    let table = this.translations.get(routerId);
    if (!table) {
      table = [];
      this.translations.set(routerId, table);
    }

    // Look for existing translation
    const existing = table.find(
      (t) =>
        t.protocol === protocol &&
        t.insideLocalIp === srcIp &&
        t.insideLocalPort === srcPort &&
        t.outsideGlobalIp === dstIp &&
        t.outsideGlobalPort === dstPort
    );

    if (existing) {
      existing.expiresAt = Date.now() + 60000;
      return {
        translatedSrcIp: existing.insideGlobalIp,
        translatedSrcPort: existing.insideGlobalPort,
      };
    }

    // Allocate new port
    let nextPort = this.nextPortMap.get(routerId) ?? 10000;
    if (nextPort > 60000) nextPort = 10000;
    const allocatedPort = nextPort++;
    this.nextPortMap.set(routerId, nextPort);

    const translation: NATTranslation = {
      id: `nat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      protocol,
      insideLocalIp: srcIp,
      insideLocalPort: srcPort,
      insideGlobalIp: publicIp,
      insideGlobalPort: allocatedPort,
      outsideGlobalIp: dstIp,
      outsideGlobalPort: dstPort,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60000,
    };

    table.push(translation);

    this.engine.emitEvent(
      'PACKET_FORWARDED',
      `[NAT] SNAT translation on ${router.name}: ${srcIp}:${srcPort} → ${publicIp}:${allocatedPort}`,
      'INFO',
      { routerId, translation }
    );

    return {
      translatedSrcIp: publicIp,
      translatedSrcPort: allocatedPort,
    };
  }

  translateInbound(
    routerId: string,
    protocol: 'TCP' | 'UDP' | 'ICMP',
    dstIp: string,
    dstPort: number,
    srcIp: string,
    srcPort: number
  ): { translatedDstIp: string; translatedDstPort: number } | null {
    const table = this.translations.get(routerId);
    if (!table) return null;

    const match = table.find(
      (t) =>
        t.protocol === protocol &&
        t.insideGlobalIp === dstIp &&
        t.insideGlobalPort === dstPort &&
        t.outsideGlobalIp === srcIp &&
        t.outsideGlobalPort === srcPort
    );

    if (match) {
      match.expiresAt = Date.now() + 60000;
      return {
        translatedDstIp: match.insideLocalIp,
        translatedDstPort: match.insideLocalPort,
      };
    }

    return null;
  }

  clearTranslations(routerId: string): void {
    this.translations.delete(routerId);
  }

  private cleanupExpired(routerId: string): void {
    const table = this.translations.get(routerId);
    if (!table) return;
    const now = Date.now();
    this.translations.set(
      routerId,
      table.filter((t) => t.expiresAt > now)
    );
  }
}
