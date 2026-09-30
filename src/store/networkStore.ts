import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { NetworkDevice, Connection, Packet, SimulationEvent, DeviceType } from '../types';
import { engine } from '../simulation/engine/SimulationEngine';

export type UIPanel = 'device' | 'packet' | 'capture' | 'terminal' | 'events' | 'monitoring' | null;
export type BottomTab = 'events' | 'capture' | 'terminal' | 'monitoring' | 'tools';

interface NetworkStore {
  devices: Record<string, NetworkDevice>;
  connections: Record<string, Connection>;
  packets: Record<string, Packet>;
  events: SimulationEvent[];
  selectedDeviceId: string | null;
  selectedPacketId: string | null;
  activePanel: UIPanel;
  bottomTab: BottomTab;

  addDevice: (type: DeviceType, position: { x: number; y: number }) => NetworkDevice;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, updates: Partial<NetworkDevice>) => void;
  selectDevice: (id: string | null) => void;
  connectDevices: (
    srcDeviceId: string, srcPortId: string,
    dstDeviceId: string, dstPortId: string
  ) => Connection | null;
  removeConnection: (id: string) => void;
  selectPacket: (id: string | null) => void;
  sendPing: (srcDeviceId: string, dstDeviceId: string) => void;
  setActivePanel: (panel: UIPanel) => void;
  setBottomTab: (tab: BottomTab) => void;
  syncFromEngine: () => void;
  syncWithEngine: () => void;
  clearTopology: () => void;
}

export const useNetworkStore = create<NetworkStore>()(
  subscribeWithSelector((set, get) => ({
    devices: {},
    connections: {},
    packets: {},
    events: [],
    selectedDeviceId: null,
    selectedPacketId: null,
    activePanel: null,
    bottomTab: 'events',

    syncFromEngine: () => {
      const state = engine.getState();
      set({
        devices: { ...state.devices },
        connections: { ...state.connections },
        packets: { ...state.packets },
        events: [...engine.getEvents()],
      });
    },

    syncWithEngine: () => {
      get().syncFromEngine();
    },

    clearTopology: () => {
      const devs = Object.keys(engine.getState().devices);
      devs.forEach((id) => engine.removeDevice(id));
      get().syncFromEngine();
    },

    addDevice: (type, position) => {
      const device = engine.addDevice(type, position);
      get().syncFromEngine();
      return device;
    },

    removeDevice: (id) => {
      engine.removeDevice(id);
      set((s) => ({
        selectedDeviceId: s.selectedDeviceId === id ? null : s.selectedDeviceId,
        activePanel: s.selectedDeviceId === id ? null : s.activePanel,
      }));
      get().syncFromEngine();
    },

    updateDevice: (id, updates) => {
      engine.updateDevice(id, updates);
      get().syncFromEngine();
    },

    selectDevice: (id) => {
      set({ selectedDeviceId: id, selectedPacketId: null, activePanel: id ? 'device' : null });
    },

    connectDevices: (srcDeviceId, srcPortId, dstDeviceId, dstPortId) => {
      const conn = engine.connectDevices(srcDeviceId, srcPortId, dstDeviceId, dstPortId);
      get().syncFromEngine();
      return conn;
    },

    removeConnection: (id) => {
      engine.removeConnection(id);
      get().syncFromEngine();
    },

    selectPacket: (id) => {
      set({ selectedPacketId: id, selectedDeviceId: null, activePanel: id ? 'packet' : null });
    },

    sendPing: (srcDeviceId, dstDeviceId) => {
      engine.packets.sendPing(srcDeviceId, dstDeviceId);
      get().syncFromEngine();
    },

    setActivePanel: (panel) => set({ activePanel: panel }),
    setBottomTab: (tab) => set({ bottomTab: tab }),
  }))
);

engine.onEvent(() => {
  useNetworkStore.getState().syncFromEngine();
});
