import type {
  NetworkDevice,
  DeviceType,
  Port,
  NetworkInterface,
  DeviceMetrics,
} from '../../types';
import { generateId, generateMac } from '../../utils/network';

function defaultMetrics(): DeviceMetrics {
  return { cpu: 0, ram: 0, throughput: 0, packetsPerSec: 0, packetLoss: 0, latency: 0, connections: 0 };
}

function makePort(name: string, speed = 1000): Port {
  return { id: generateId('port'), name, status: 'UP', speed, duplex: 'FULL', mode: 'ACCESS', vlanId: 1 };
}

function makeInterface(name: string, mac: string): NetworkInterface {
  return { id: generateId('iface'), name, macAddress: mac, isDHCP: true, status: 'UP' };
}

function createPorts(type: DeviceType): Port[] {
  switch (type) {
    case 'PC': case 'Laptop': case 'Mobile': case 'IoT':
      return [makePort('eth0')];
    case 'Switch':
      return Array.from({ length: 8 }, (_, i) => makePort(`Gi0/${i + 1}`));
    case 'Router':
      return [makePort('Gi0/0'), makePort('Gi0/1'), makePort('Gi0/2')];
    case 'Firewall':
      return [makePort('WAN0'), makePort('LAN0'), makePort('DMZ0')];
    case 'AccessPoint':
      return [makePort('eth0'), makePort('wlan0', 300)];
    case 'LoadBalancer':
      return [makePort('WAN0'), makePort('LAN0'), makePort('LAN1')];
    default:
      return [makePort('eth0'), makePort('eth1')];
  }
}

const _deviceCounter: Record<string, number> = {};

function nextDeviceNumber(type: DeviceType): string {
  _deviceCounter[type] = (_deviceCounter[type] || 0) + 1;
  return String(_deviceCounter[type]).padStart(2, '0');
}

function defaultDeviceName(type: DeviceType): string {
  const n = nextDeviceNumber(type);
  const prefixes: Partial<Record<DeviceType, string>> = {
    PC: 'PC', Laptop: 'LAPTOP', Mobile: 'MOBILE', IoT: 'IOT',
    Switch: 'SW', Router: 'RTR', Firewall: 'FW', AccessPoint: 'AP',
    LoadBalancer: 'LB', Server: 'SRV', DHCPServer: 'DHCP', DNSServer: 'DNS',
    WebServer: 'WEB', FTPServer: 'FTP', MailServer: 'MAIL', DatabaseServer: 'DB', FileServer: 'FILE',
  };
  return `${prefixes[type] ?? type}-${n}`;
}

export function createDevice(
  type: DeviceType,
  position: { x: number; y: number },
  overrides: Partial<NetworkDevice> = {}
): NetworkDevice {
  const mac = generateMac();
  const ports = createPorts(type);
  const interfaces = [makeInterface('eth0', mac)];
  return {
    id: generateId('dev'),
    name: defaultDeviceName(type),
    type,
    status: 'UP',
    ports,
    interfaces,
    macAddress: mac,
    ipAddresses: [],
    metrics: defaultMetrics(),
    position,
    config: {},
    ...overrides,
  };
}
