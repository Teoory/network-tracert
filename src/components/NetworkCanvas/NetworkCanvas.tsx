import React, { useCallback, useMemo, useRef, type DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnConnect,
  type Connection as RFConnection,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useNetworkStore } from '../../store/networkStore';
import type { NetworkDevice, DeviceType } from '../../types';
import DeviceNode from './DeviceNode';
import { engine } from '../../simulation/engine/SimulationEngine';

const nodeTypes: NodeTypes = { deviceNode: DeviceNode };

function devicesToNodes(devices: Record<string, NetworkDevice>): Node[] {
  return Object.values(devices).map((device) => ({
    id: device.id,
    type: 'deviceNode',
    position: device.position,
    data: { device },
  }));
}

function connectionsToEdges(
  connections: ReturnType<typeof useNetworkStore.getState>['connections']
): Edge[] {
  return Object.values(connections).map((conn) => {
    const isDown = conn.status === 'DOWN';
    const isFiber = conn.type === 'Fiber';
    const color = isDown ? '#ef4444' : isFiber ? '#ec4899' : '#38bdf8';

    return {
      id: conn.id,
      source: conn.sourceDeviceId,
      target: conn.destinationDeviceId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      animated: !isDown,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 14,
        height: 14,
      },
      style: {
        stroke: color,
        strokeWidth: isDown ? 1.5 : 2,
        strokeDasharray: isDown ? '5 4' : undefined,
        opacity: isDown ? 0.4 : 0.85,
        filter: isDown ? 'none' : 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.4))',
      },
      label: `${conn.type} (${conn.bandwidth} Mbps)`,
      labelStyle: {
        fontSize: 9,
        fill: isDown ? '#f87171' : '#94a3b8',
        fontWeight: 600,
        fontFamily: 'monospace',
      },
      labelBgStyle: {
        fill: '#090d16',
        fillOpacity: 0.85,
        rx: 4,
        ry: 4,
      },
      labelBgPadding: [4, 2] as [number, number],
    };
  });
}

function CanvasInner() {
  const { devices, connections, addDevice, connectDevices, selectDevice, updateDevice } = useNetworkStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => { setNodes(devicesToNodes(devices)); }, [devices, setNodes]);
  React.useEffect(() => { setEdges(connectionsToEdges(connections)); }, [connections, setEdges]);

  const onConnect: OnConnect = useCallback(
    (params: RFConnection) => {
      if (!params.source || !params.target) return;
      const srcPort = engine.getAvailablePort(params.source);
      const dstPort = engine.getAvailablePort(params.target);
      if (srcPort && dstPort) {
        connectDevices(params.source, srcPort.id, params.target, dstPort.id);
      }
    },
    [connectDevices]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => { updateDevice(node.id, { position: node.position }); },
    [updateDevice]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => { selectDevice(node.id); },
    [selectDevice]
  );

  const onPaneClick = useCallback(() => { selectDevice(null); }, [selectDevice]);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/device-type') as DeviceType;
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addDevice(type, position);
    },
    [screenToFlowPosition, addDevice]
  );

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '100%' }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        proOptions={{ hideAttribution: true }}
        deleteKeyCode="Delete"
      >
        <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.05)" gap={20} size={1} />
        <Controls
          style={{
            background: 'rgba(15,22,41,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: 'rgba(10,14,26,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            const d = (node.data as { device: NetworkDevice }).device;
            const colors: Record<string, string> = {
              PC: '#3b82f6', Laptop: '#3b82f6', Switch: '#10b981', Router: '#8b5cf6',
              Server: '#f59e0b', Firewall: '#ef4444',
            };
            return colors[d?.type] ?? '#64748b';
          }}
          maskColor="rgba(10,14,26,0.7)"
        />
      </ReactFlow>
    </div>
  );
}

export default function NetworkCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
