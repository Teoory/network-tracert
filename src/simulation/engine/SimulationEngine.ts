import type {
  NetworkState, NetworkDevice, Connection, Packet, PacketStatus,
  PacketHop, SimulationEvent, SimulationEventType, DeviceType, Port,
} from '../../types';
import { generateId, now } from '../../utils/network';
import { createDevice } from '../devices/DeviceFactory';
import { PacketEngine } from '../packets/PacketEngine';
import { ARPProtocol } from '../protocols/ARP';
import { IPv4Protocol } from '../protocols/IPv4';
import { DHCPProtocol } from '../protocols/DHCP';
import { DNSProtocol } from '../protocols/DNS';
import { RoutingProtocol } from '../protocols/Routing';
import { FirewallProtocol } from '../protocols/Firewall';
import { NATProtocol } from '../protocols/NAT';
import { VLANProtocol } from '../protocols/VLAN';
import { RandomEventEngine } from '../events/RandomEventEngine';
import { SecurityEventEngine } from '../events/SecurityEventEngine';
import { SimulationEventQueue } from '../events/EventQueue';

export type EngineEventListener = (event: SimulationEvent) => void;

export class SimulationEngine {
  private state: NetworkState;
  private listeners: EngineEventListener[] = [];
  private packetEngine!: PacketEngine;
  private arpProtocol!: ARPProtocol;
  private ipv4Protocol!: IPv4Protocol;
  private dhcpProtocol!: DHCPProtocol;
  private dnsProtocol!: DNSProtocol;
  private routingProtocol!: RoutingProtocol;
  private firewallProtocol!: FirewallProtocol;
  private natProtocol!: NATProtocol;
  private vlanProtocol!: VLANProtocol;
  private randomEventEngine!: RandomEventEngine;
  private securityEventEngine!: SecurityEventEngine;
  private eventQueue!: SimulationEventQueue;
  private arpCaches: Map<string, Map<string, string>> = new Map();
  private macTables: Map<string, Map<string, string>> = new Map();

  constructor() {
    this.state = {
      devices: {}, connections: {}, packets: {}, events: [],
      vlans: { 1: { id: 1, name: 'default' } }, tickCount: 0,
    };
    this.packetEngine = new PacketEngine(this);
    this.arpProtocol = new ARPProtocol(this);
    this.ipv4Protocol = new IPv4Protocol();
    this.dhcpProtocol = new DHCPProtocol(this);
    this.dnsProtocol = new DNSProtocol(this);
    this.routingProtocol = new RoutingProtocol(this);
    this.firewallProtocol = new FirewallProtocol(this);
    this.natProtocol = new NATProtocol(this);
    this.vlanProtocol = new VLANProtocol(this);
    this.randomEventEngine = new RandomEventEngine(this);
    this.securityEventEngine = new SecurityEventEngine(this);
    this.eventQueue = new SimulationEventQueue(this);
  }

  getState(): Readonly<NetworkState> { return this.state; }
  getDevice(id: string): NetworkDevice | undefined { return this.state.devices[id]; }
  getDevices(): NetworkDevice[] { return Object.values(this.state.devices); }
  getConnection(id: string): Connection | undefined { return this.state.connections[id]; }
  getConnections(): Connection[] { return Object.values(this.state.connections); }
  getPackets(): Packet[] { return Object.values(this.state.packets); }
  getEvents(): SimulationEvent[] { return [...this.state.events]; }

  getARPCache(deviceId: string): Map<string, string> {
    if (!this.arpCaches.has(deviceId)) this.arpCaches.set(deviceId, new Map());
    return this.arpCaches.get(deviceId)!;
  }

  getMACTable(switchId: string): Map<string, string> {
    if (!this.macTables.has(switchId)) this.macTables.set(switchId, new Map());
    return this.macTables.get(switchId)!;
  }

  addDevice(type: DeviceType, position: { x: number; y: number }): NetworkDevice {
    const device = createDevice(type, position);
    this.state = { ...this.state, devices: { ...this.state.devices, [device.id]: device } };
    this.emitEvent('DEVICE_ADDED', `Device ${device.name} added`, 'INFO', { deviceId: device.id, deviceType: type });
    return device;
  }

  removeDevice(deviceId: string): void {
    const device = this.state.devices[deviceId];
    if (!device) return;
    Object.values(this.state.connections)
      .filter((c) => c.sourceDeviceId === deviceId || c.destinationDeviceId === deviceId)
      .forEach((c) => this.removeConnection(c.id));
    const { [deviceId]: _r, ...restDevices } = this.state.devices;
    this.state = { ...this.state, devices: restDevices };
    this.arpCaches.delete(deviceId);
    this.macTables.delete(deviceId);
    this.emitEvent('DEVICE_REMOVED', `Device ${device.name} removed`, 'INFO', { deviceId });
  }

  updateDevice(deviceId: string, updates: Partial<NetworkDevice>): void {
    const device = this.state.devices[deviceId];
    if (!device) return;
    this.state = { ...this.state, devices: { ...this.state.devices, [deviceId]: { ...device, ...updates } } };
  }

  getPort(deviceId: string, portId: string): Port | undefined {
    return this.state.devices[deviceId]?.ports.find((p) => p.id === portId);
  }

  getAvailablePort(deviceId: string): Port | undefined {
    return this.state.devices[deviceId]?.ports.find((p) => !p.connectedDeviceId && p.status !== 'DOWN');
  }

  setPortDown(deviceId: string, portId: string): void {
    const device = this.state.devices[deviceId];
    if (!device) return;
    const ports = device.ports.map((p) => p.id === portId ? { ...p, status: 'DOWN' as const } : p);
    this.updateDevice(deviceId, { ports });
    const conn = Object.values(this.state.connections).find(
      (c) => (c.sourceDeviceId === deviceId && c.sourcePortId === portId) ||
              (c.destinationDeviceId === deviceId && c.destinationPortId === portId)
    );
    if (conn) this.setConnectionStatus(conn.id, 'DOWN');
    const portName = device.ports.find((p) => p.id === portId)?.name ?? portId;
    this.emitEvent('INTERFACE_DOWN', `Port ${portName} on ${device.name} is DOWN`, 'WARNING', { deviceId, portId });
  }

  setPortUp(deviceId: string, portId: string): void {
    const device = this.state.devices[deviceId];
    if (!device) return;
    const ports = device.ports.map((p) => p.id === portId ? { ...p, status: 'UP' as const } : p);
    this.updateDevice(deviceId, { ports });
    const conn = Object.values(this.state.connections).find(
      (c) => (c.sourceDeviceId === deviceId && c.sourcePortId === portId) ||
              (c.destinationDeviceId === deviceId && c.destinationPortId === portId)
    );
    if (conn) this.setConnectionStatus(conn.id, 'UP');
    const portName = device.ports.find((p) => p.id === portId)?.name ?? portId;
    this.emitEvent('INTERFACE_UP', `Port ${portName} on ${device.name} is UP`, 'INFO', { deviceId, portId });
  }

  connectDevices(srcDeviceId: string, srcPortId: string, dstDeviceId: string, dstPortId: string): Connection | null {
    const srcDevice = this.state.devices[srcDeviceId];
    const dstDevice = this.state.devices[dstDeviceId];
    if (!srcDevice || !dstDevice) return null;
    const srcPort = srcDevice.ports.find((p) => p.id === srcPortId);
    const dstPort = dstDevice.ports.find((p) => p.id === dstPortId);
    if (!srcPort || !dstPort) return null;
    if (srcPort.connectedDeviceId || dstPort.connectedDeviceId) return null;

    const connection: Connection = {
      id: generateId('conn'),
      sourceDeviceId: srcDeviceId, sourcePortId: srcPortId,
      destinationDeviceId: dstDeviceId, destinationPortId: dstPortId,
      type: 'Ethernet', status: 'UP',
      bandwidth: Math.min(srcPort.speed, dstPort.speed),
      metrics: { throughput: 0, packetLoss: 0, latency: 1 },
    };

    this.updatePortConnection(srcDeviceId, srcPortId, dstDeviceId, dstPortId);
    this.updatePortConnection(dstDeviceId, dstPortId, srcDeviceId, srcPortId);
    this.state = { ...this.state, connections: { ...this.state.connections, [connection.id]: connection } };
    this.emitEvent('DEVICE_CONNECTED', `${srcDevice.name} ↔ ${dstDevice.name} connected`, 'INFO',
      { connectionId: connection.id, sourceDeviceId: srcDeviceId, destinationDeviceId: dstDeviceId });
    return connection;
  }

  private updatePortConnection(deviceId: string, portId: string, remoteDeviceId: string, remotePortId: string): void {
    const device = this.state.devices[deviceId];
    if (!device) return;
    const ports = device.ports.map((p) =>
      p.id === portId ? { ...p, connectedDeviceId: remoteDeviceId, connectedPortId: remotePortId } : p
    );
    this.updateDevice(deviceId, { ports });
  }

  removeConnection(connectionId: string): void {
    const conn = this.state.connections[connectionId];
    if (!conn) return;
    this.clearPortConnection(conn.sourceDeviceId, conn.sourcePortId);
    this.clearPortConnection(conn.destinationDeviceId, conn.destinationPortId);
    const { [connectionId]: _r, ...restConns } = this.state.connections;
    this.state = { ...this.state, connections: restConns };
    this.emitEvent('DEVICE_DISCONNECTED', 'Connection removed', 'INFO', { connectionId });
  }

  private clearPortConnection(deviceId: string, portId: string): void {
    const device = this.state.devices[deviceId];
    if (!device) return;
    const ports = device.ports.map((p) =>
      p.id === portId ? { ...p, connectedDeviceId: undefined, connectedPortId: undefined } : p
    );
    this.updateDevice(deviceId, { ports });
  }

  private setConnectionStatus(connectionId: string, status: 'UP' | 'DOWN'): void {
    const conn = this.state.connections[connectionId];
    if (!conn) return;
    this.state = { ...this.state, connections: { ...this.state.connections, [connectionId]: { ...conn, status } } };
  }

  addPacket(packet: Packet): void {
    this.state = { ...this.state, packets: { ...this.state.packets, [packet.id]: packet } };
    this.emitEvent('PACKET_CREATED', `Packet ${packet.id} created`, 'INFO', { packetId: packet.id, protocol: packet.protocol });
  }

  updatePacket(packetId: string, updates: Partial<Packet>): void {
    const packet = this.state.packets[packetId];
    if (!packet) return;
    this.state = { ...this.state, packets: { ...this.state.packets, [packetId]: { ...packet, ...updates } } };
  }

  addPacketHop(packetId: string, hop: PacketHop): void {
    const packet = this.state.packets[packetId];
    if (!packet) return;
    this.updatePacket(packetId, { route: [...packet.route, hop] });
  }

  setPacketStatus(packetId: string, status: PacketStatus, reason?: string): void {
    const updates: Partial<Packet> = { status };
    if (reason) updates.dropReason = reason;
    this.updatePacket(packetId, updates);
    const eventMap: Partial<Record<PacketStatus, SimulationEventType>> = {
      CREATED: 'PACKET_CREATED', QUEUED: 'PACKET_CREATED', FORWARDED: 'PACKET_FORWARDED',
      DELIVERED: 'PACKET_DELIVERED', DROPPED: 'PACKET_DROPPED', EXPIRED: 'PACKET_EXPIRED', BLOCKED: 'PACKET_DROPPED',
    };
    this.emitEvent(
      eventMap[status] ?? 'PACKET_FORWARDED',
      `Packet ${packetId} ${status}${reason ? ': ' + reason : ''}`,
      status === 'DROPPED' || status === 'EXPIRED' ? 'WARNING' : 'INFO',
      { packetId, status, reason }
    );
  }

  get arp(): ARPProtocol { return this.arpProtocol; }
  get ipv4(): IPv4Protocol { return this.ipv4Protocol; }
  get packets(): PacketEngine { return this.packetEngine; }
  get dhcp(): DHCPProtocol { return this.dhcpProtocol; }
  get dns(): DNSProtocol { return this.dnsProtocol; }
  get routing(): RoutingProtocol { return this.routingProtocol; }
  get firewall(): FirewallProtocol { return this.firewallProtocol; }
  get nat(): NATProtocol { return this.natProtocol; }
  get vlan(): VLANProtocol { return this.vlanProtocol; }
  get randomEvents(): RandomEventEngine { return this.randomEventEngine; }
  get securityEvents(): SecurityEventEngine { return this.securityEventEngine; }
  get queue(): SimulationEventQueue { return this.eventQueue; }

  emitEvent(
    type: SimulationEventType,
    description: string,
    severity: SimulationEvent['severity'] = 'INFO',
    data: Record<string, unknown> = {}
  ): void {
    const event: SimulationEvent = {
      id: generateId('evt'), type, timestamp: now(), description, severity,
      deviceId: data['deviceId'] as string | undefined,
      packetId: data['packetId'] as string | undefined,
      data,
    };
    const newEvents = [event, ...this.state.events].slice(0, 500);
    this.state = { ...this.state, events: newEvents };
    this.listeners.forEach((l) => l(event));
  }

  onEvent(listener: EngineEventListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  getConnectionBetween(deviceA: string, deviceB: string): Connection | undefined {
    return Object.values(this.state.connections).find(
      (c) => (c.sourceDeviceId === deviceA && c.destinationDeviceId === deviceB) ||
              (c.sourceDeviceId === deviceB && c.destinationDeviceId === deviceA)
    );
  }

  getNeighbors(deviceId: string): string[] {
    const result: string[] = [];
    for (const conn of Object.values(this.state.connections)) {
      if (conn.status !== 'UP') continue;
      if (conn.sourceDeviceId === deviceId) result.push(conn.destinationDeviceId);
      else if (conn.destinationDeviceId === deviceId) result.push(conn.sourceDeviceId);
    }
    return result;
  }

  findPath(srcId: string, dstId: string): string[] {
    if (srcId === dstId) return [srcId];
    const visited = new Set<string>();
    const queue: string[][] = [[srcId]];
    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];
      if (node === dstId) return path;
      if (visited.has(node)) continue;
      visited.add(node);
      for (const neighbor of this.getNeighbors(node)) {
        if (!visited.has(neighbor)) queue.push([...path, neighbor]);
      }
    }
    return [];
  }
}

export const engine = new SimulationEngine();
