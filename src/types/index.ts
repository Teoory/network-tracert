// ============================================================
// Network Sandbox Simulator — Core Types
// ============================================================

// ---- Device Types ------------------------------------------

export type DeviceType =
  | 'PC'
  | 'Laptop'
  | 'Mobile'
  | 'IoT'
  | 'Switch'
  | 'Router'
  | 'Firewall'
  | 'AccessPoint'
  | 'LoadBalancer'
  | 'DHCPServer'
  | 'DNSServer'
  | 'WebServer'
  | 'FTPServer'
  | 'MailServer'
  | 'DatabaseServer'
  | 'FileServer'
  | 'Server';

export type DeviceStatus = 'UP' | 'DOWN' | 'OVERLOADED' | 'UNREACHABLE';

export type PortStatus = 'UP' | 'DOWN' | 'BLOCKED';
export type PortMode = 'ACCESS' | 'TRUNK';
export type PortDuplex = 'FULL' | 'HALF';

export interface Port {
  id: string;
  name: string;
  status: PortStatus;
  speed: number;
  duplex: PortDuplex;
  mode: PortMode;
  vlanId?: number;
  connectedDeviceId?: string;
  connectedPortId?: string;
}

export interface NetworkInterface {
  id: string;
  name: string;
  macAddress: string;
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  dns?: string;
  isDHCP: boolean;
  status: 'UP' | 'DOWN';
}

export interface DeviceMetrics {
  cpu: number;
  ram: number;
  throughput: number;
  packetsPerSec: number;
  packetLoss: number;
  latency: number;
  connections: number;
}

export interface NetworkDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  ports: Port[];
  interfaces: NetworkInterface[];
  macAddress: string;
  ipAddresses: string[];
  metrics: DeviceMetrics;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

// ---- Connection / Cable ------------------------------------

export type ConnectionType = 'Ethernet' | 'Fiber' | 'Wireless';
export type ConnectionStatus = 'UP' | 'DOWN';

export interface Connection {
  id: string;
  sourceDeviceId: string;
  sourcePortId: string;
  destinationDeviceId: string;
  destinationPortId: string;
  type: ConnectionType;
  status: ConnectionStatus;
  bandwidth: number;
  metrics: {
    throughput: number;
    packetLoss: number;
    latency: number;
  };
}

// ---- Packet ------------------------------------------------

export type PacketProtocol =
  | 'Ethernet'
  | 'ARP'
  | 'IPv4'
  | 'ICMP'
  | 'TCP'
  | 'UDP'
  | 'DHCP'
  | 'DNS'
  | 'HTTP'
  | 'HTTPS'
  | 'FTP'
  | 'SSH';

export type PacketStatus =
  | 'CREATED'
  | 'QUEUED'
  | 'FORWARDED'
  | 'DELIVERED'
  | 'DROPPED'
  | 'EXPIRED'
  | 'BLOCKED';

export interface PacketHop {
  deviceId: string;
  deviceName: string;
  portId?: string;
  timestamp: number;
  action: 'RECEIVED' | 'FORWARDED' | 'DROPPED' | 'DELIVERED';
}

export interface EthernetFrame {
  srcMac: string;
  dstMac: string;
  etherType: string;
}

export interface IPv4Header {
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: string;
}

export interface TransportHeader {
  srcPort: number;
  dstPort: number;
  protocol: 'TCP' | 'UDP';
  flags?: string[];
}

export interface ApplicationPayload {
  protocol: string;
  data: Record<string, unknown>;
}

export interface Packet {
  id: string;
  sourceDeviceId: string;
  destinationDeviceId: string;
  protocol: PacketProtocol;
  size: number;
  ttl: number;
  timestamp: number;
  status: PacketStatus;
  route: PacketHop[];
  ethernet?: EthernetFrame;
  ip?: IPv4Header;
  transport?: TransportHeader;
  application?: ApplicationPayload;
  dropReason?: string;
}

// ---- Simulation Events ------------------------------------

export type SimulationEventType =
  | 'DEVICE_ADDED'
  | 'DEVICE_REMOVED'
  | 'DEVICE_CONNECTED'
  | 'DEVICE_DISCONNECTED'
  | 'INTERFACE_UP'
  | 'INTERFACE_DOWN'
  | 'PACKET_CREATED'
  | 'PACKET_FORWARDED'
  | 'PACKET_DELIVERED'
  | 'PACKET_DROPPED'
  | 'PACKET_EXPIRED'
  | 'ARP_REQUEST'
  | 'ARP_REPLY'
  | 'DHCP_DISCOVER'
  | 'DHCP_OFFER'
  | 'DHCP_REQUEST'
  | 'DHCP_ACK'
  | 'DNS_QUERY'
  | 'DNS_RESPONSE'
  | 'ICMP_ECHO_REQUEST'
  | 'ICMP_ECHO_REPLY'
  | 'PORT_FAILURE'
  | 'CABLE_FAILURE'
  | 'DHCP_POOL_EXHAUSTED'
  | 'DNS_FAILURE'
  | 'SERVER_OVERLOAD'
  | 'NETWORK_CONGESTION'
  | 'PORT_SCAN'
  | 'SSH_BRUTE_FORCE'
  | 'DDOS'
  | 'ARP_SPOOFING'
  | 'SUSPICIOUS_TRAFFIC'
  | 'FIREWALL_BLOCK'
  | 'ATTACK_DETECTED'
  | 'DEVICE_UPDATED'
  | 'VLAN_TAG_ADDED'
  | 'VLAN_MISMATCH';

export interface SimulationEvent {
  id: string;
  type: SimulationEventType;
  timestamp: number;
  description: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  deviceId?: string;
  packetId?: string;
  data: Record<string, unknown>;
}

// ---- VLAN -------------------------------------------------

export interface VLAN {
  id: number;
  name: string;
  color?: string;
}

// ---- Routing ----------------------------------------------

export interface Route {
  id: string;
  network: string;
  mask: string;
  nextHop?: string;
  interface?: string;
  metric: number;
  isDefault: boolean;
  type: 'STATIC' | 'CONNECTED' | 'DEFAULT';
}

// ---- Firewall Rules ---------------------------------------

export type FirewallAction = 'ALLOW' | 'DENY';

export interface FirewallRule {
  id: string;
  priority: number;
  source: string;
  destination: string;
  protocol: string;
  sourcePort?: string;
  destinationPort?: string;
  action: FirewallAction;
  enabled: boolean;
  description: string;
}

// ---- ARP --------------------------------------------------

export interface ARPEntry {
  ip: string;
  mac: string;
  deviceId: string;
  timestamp: number;
  isStatic: boolean;
}

// ---- MAC Table (Switch) ------------------------------------

export interface MACTableEntry {
  mac: string;
  portId: string;
  portName: string;
  vlanId: number;
  timestamp: number;
}

// ---- DHCP -------------------------------------------------

export interface DHCPLease {
  ip: string;
  mac: string;
  deviceId: string;
  startTime: number;
  leaseTime: number;
  gateway: string;
  dns: string;
  subnetMask: string;
}

export interface DHCPPool {
  network: string;
  poolStart: string;
  poolEnd: string;
  subnetMask: string;
  gateway: string;
  dns: string;
  leaseTime: number;
  leases: DHCPLease[];
}

// ---- DNS --------------------------------------------------

export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'PTR';

export interface DNSRecord {
  id: string;
  name: string;
  type: DNSRecordType;
  value: string;
  ttl: number;
}

// ---- Network State ----------------------------------------

export interface NetworkState {
  devices: Record<string, NetworkDevice>;
  connections: Record<string, Connection>;
  packets: Record<string, Packet>;
  events: SimulationEvent[];
  vlans: Record<number, VLAN>;
  tickCount: number;
}
