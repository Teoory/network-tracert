// ============================================================
// Routing Protocol — Static/Default route management
// ============================================================

import type { Route } from '../../types';
import { generateId, ipToInt } from '../../utils/network';
import type { SimulationEngine } from '../engine/SimulationEngine';

export class RoutingProtocol {
  private engine: SimulationEngine;
  // deviceId -> Route[]
  private routingTables: Map<string, Route[]> = new Map();

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  getTable(deviceId: string): Route[] {
    return this.routingTables.get(deviceId) ?? [];
  }

  getRoutes(deviceId: string): Route[] {
    return this.getTable(deviceId);
  }

  addRoute(deviceId: string, route: Omit<Route, 'id'>): Route {
    const newRoute: Route = { ...route, id: generateId('route') };
    const existing = this.routingTables.get(deviceId) ?? [];
    this.routingTables.set(deviceId, [...existing, newRoute]);
    return newRoute;
  }

  removeRoute(deviceId: string, routeId: string): void {
    const routes = this.routingTables.get(deviceId) ?? [];
    this.routingTables.set(deviceId, routes.filter((r) => r.id !== routeId));
  }

  /** Look up best route for destination IP on a given router */
  lookup(routerDeviceId: string, destIp: string): Route | null {
    const routes = this.routingTables.get(routerDeviceId) ?? [];
    if (routes.length === 0) return null;

    const destInt = ipToInt(destIp);
    let best: Route | null = null;
    let bestMask = -1;

    for (const route of routes) {
      if (!route.mask) continue;
      const maskInt = ipToInt(route.mask);
      const networkInt = ipToInt(route.network);
      if ((destInt & maskInt) === (networkInt & maskInt)) {
        // Longest prefix match
        const ones = route.isDefault ? 0 : maskInt.toString(2).split('').filter((c) => c === '1').length;
        if (ones > bestMask) {
          bestMask = ones;
          best = route;
        }
      }
    }

    // Check default route
    if (!best) {
      best = routes.find((r) => r.isDefault) ?? null;
    }

    return best;
  }

  /** Add common connected routes based on device interfaces */
  buildConnectedRoutes(deviceId: string): void {
    const device = this.engine.getDevice(deviceId);
    if (!device) return;

    const routes: Route[] = [];
    for (const iface of device.interfaces) {
      if (!iface.ipAddress || !iface.subnetMask) continue;
      const network = this.networkAddress(iface.ipAddress, iface.subnetMask);
      routes.push({
        id: generateId('route'),
        network,
        mask: iface.subnetMask,
        metric: 0,
        isDefault: false,
        type: 'CONNECTED',
        interface: iface.name,
      });
    }

    const existing = this.routingTables.get(deviceId) ?? [];
    this.routingTables.set(deviceId, [...existing, ...routes]);
  }

  private networkAddress(ip: string, mask: string): string {
    const ipInt = ipToInt(ip);
    const maskInt = ipToInt(mask);
    const net = (ipInt & maskInt) >>> 0;
    return [(net >>> 24) & 0xff, (net >>> 16) & 0xff, (net >>> 8) & 0xff, net & 0xff].join('.');
  }
}
