import type {
  Packet, PacketProtocol, PacketHop, EthernetFrame, IPv4Header, TransportHeader,
} from '../../types';
import { generateId, now } from '../../utils/network';
import type { SimulationEngine } from '../engine/SimulationEngine';

export interface PacketCreateOptions {
  sourceDeviceId: string;
  destinationDeviceId: string;
  protocol: PacketProtocol;
  size?: number;
  ttl?: number;
  ethernet?: EthernetFrame;
  ip?: IPv4Header;
  transport?: TransportHeader;
  application?: { protocol: string; data: Record<string, unknown> };
}

export class PacketEngine {
  private engine: SimulationEngine;

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  createPacket(options: PacketCreateOptions): Packet {
    const packet: Packet = {
      id: generateId('pkt'),
      sourceDeviceId: options.sourceDeviceId,
      destinationDeviceId: options.destinationDeviceId,
      protocol: options.protocol,
      size: options.size ?? 64,
      ttl: options.ttl ?? 64,
      timestamp: now(),
      status: 'CREATED',
      route: [],
      ethernet: options.ethernet,
      ip: options.ip,
      transport: options.transport,
      application: options.application,
    };
    this.engine.addPacket(packet);
    return packet;
  }

  routePacket(packetId: string): boolean {
    const packet = this.engine.getState().packets[packetId];
    if (!packet) return false;

    const src = this.engine.getDevice(packet.sourceDeviceId);
    const dst = this.engine.getDevice(packet.destinationDeviceId);
    if (!src || !dst) {
      this.engine.setPacketStatus(packetId, 'DROPPED', 'Device not found');
      return false;
    }

    const path = this.engine.findPath(packet.sourceDeviceId, packet.destinationDeviceId);
    if (path.length === 0) {
      this.engine.setPacketStatus(packetId, 'DROPPED', 'No route to host');
      return false;
    }

    let ttl = packet.ttl;
    for (let i = 0; i < path.length; i++) {
      const deviceId = path[i];
      const device = this.engine.getDevice(deviceId);
      if (!device) {
        this.engine.setPacketStatus(packetId, 'DROPPED', 'Device not found in path');
        return false;
      }

      if (device.status === 'DOWN') {
        this.engine.setPacketStatus(packetId, 'DROPPED', `Device ${device.name} is offline (DOWN)`);
        return false;
      }

      // Update metrics for traversed device
      this.engine.updateDevice(deviceId, {
        metrics: {
          ...device.metrics,
          packetsPerSec: device.metrics.packetsPerSec + 1,
          throughput: +(device.metrics.throughput + (packet.size * 8) / 1000000).toFixed(3),
          cpu: Math.min(100, device.metrics.cpu + 0.2),
        },
      });

      // Firewall inspection
      if (device.type === 'Firewall') {
        const fwResult = this.engine.firewall.evaluate(deviceId, packet);
        if (fwResult.action === 'DENY') {
          const hop: PacketHop = {
            deviceId,
            deviceName: device.name,
            timestamp: now(),
            action: 'DROPPED',
          };
          this.engine.addPacketHop(packetId, hop);
          this.engine.setPacketStatus(
            packetId,
            'BLOCKED',
            `Blocked by Firewall rule: ${fwResult.matchedRule?.description || 'DENY'}`
          );
          return false;
        }
      }

      // Switch MAC learning
      if (device.type === 'Switch' && packet.ethernet?.srcMac) {
        const macTable = this.engine.getMACTable(device.id);
        const prevDeviceId = i > 0 ? path[i - 1] : undefined;
        const conn = prevDeviceId ? this.engine.getConnectionBetween(prevDeviceId, device.id) : undefined;
        const portId = conn ? (conn.sourceDeviceId === device.id ? conn.sourcePortId : conn.destinationPortId) : 'Gi0/1';
        macTable.set(packet.ethernet.srcMac, portId);
      }

      const action: PacketHop['action'] =
        i === 0 ? 'RECEIVED' : i === path.length - 1 ? 'DELIVERED' : 'FORWARDED';

      const hop: PacketHop = { deviceId, deviceName: device.name, timestamp: now(), action };
      this.engine.addPacketHop(packetId, hop);

      if (i > 0) {
        ttl -= 1;
        if (ttl <= 0) {
          this.engine.setPacketStatus(packetId, 'EXPIRED', 'TTL expired');
          this.engine.emitEvent('PACKET_EXPIRED', `Packet expired at ${device.name}`, 'WARNING', { packetId, deviceId });
          return false;
        }
        this.engine.updatePacket(packetId, { ttl, status: 'FORWARDED' });
        this.engine.emitEvent('PACKET_FORWARDED', `Packet forwarded at ${device.name}`, 'INFO', { packetId, deviceId });
      }
    }

    this.engine.setPacketStatus(packetId, 'DELIVERED');
    return true;
  }

  dropPacket(packetId: string, reason: string): void {
    this.engine.setPacketStatus(packetId, 'DROPPED', reason);
  }

  sendPing(
    sourceDeviceId: string,
    destinationDeviceId: string
  ): { requestId: string; replyId?: string; success: boolean; latency: number } {
    const src = this.engine.getDevice(sourceDeviceId);
    const dst = this.engine.getDevice(destinationDeviceId);
    if (!src || !dst) return { requestId: '', success: false, latency: 0 };

    const srcIp = src.interfaces[0]?.ipAddress ?? '0.0.0.0';
    const dstIp = dst.interfaces[0]?.ipAddress ?? '0.0.0.0';

    const arpResult = this.engine.arp.resolve(sourceDeviceId, dstIp);

    this.engine.emitEvent('ICMP_ECHO_REQUEST', `ICMP Echo Request: ${src.name} → ${dst.name}`, 'INFO',
      { sourceDeviceId, destinationDeviceId, srcIp, dstIp });

    const request = this.createPacket({
      sourceDeviceId, destinationDeviceId, protocol: 'ICMP', size: 64, ttl: 64,
      ip: { srcIp, dstIp, ttl: 64, protocol: 'ICMP' },
      ethernet: arpResult.success
        ? { srcMac: src.macAddress, dstMac: arpResult.mac!, etherType: '0x0800' }
        : undefined,
    });

    const startTime = now();
    const success = this.routePacket(request.id);
    const latency = now() - startTime + Math.random() * 5;

    if (!success) return { requestId: request.id, success: false, latency: 0 };

    this.engine.emitEvent('ICMP_ECHO_REPLY', `ICMP Echo Reply: ${dst.name} → ${src.name}  time=${latency.toFixed(1)}ms`, 'INFO',
      { sourceDeviceId: destinationDeviceId, destinationDeviceId: sourceDeviceId, latency });

    const reply = this.createPacket({
      sourceDeviceId: destinationDeviceId, destinationDeviceId: sourceDeviceId,
      protocol: 'ICMP', size: 64, ttl: 64,
      ip: { srcIp: dstIp, dstIp: srcIp, ttl: 64, protocol: 'ICMP' },
    });

    this.routePacket(reply.id);
    return { requestId: request.id, replyId: reply.id, success: true, latency };
  }
}
