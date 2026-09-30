import React, { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { NetworkDevice, DeviceType } from '../../types';
import { useNetworkStore } from '../../store/networkStore';

const DEVICE_ICONS: Record<DeviceType, string> = {
  PC: '💻', Laptop: '💻', Mobile: '📱', IoT: '🔌',
  Switch: '🔀', Router: '🌐', Firewall: '🛡️', AccessPoint: '📡', LoadBalancer: '⚖️',
  DHCPServer: '🖥️', DNSServer: '🖥️', WebServer: '🖥️', FTPServer: '🖥️',
  MailServer: '🖥️', DatabaseServer: '🖥️', FileServer: '🖥️', Server: '🖥️',
};

const DEVICE_COLORS: Partial<Record<DeviceType, string>> = {
  PC: '#3b82f6', Laptop: '#3b82f6', Switch: '#10b981', Router: '#8b5cf6',
  Firewall: '#ef4444', DHCPServer: '#06b6d4', DNSServer: '#ec4899',
  WebServer: '#f59e0b', Server: '#f59e0b', AccessPoint: '#84cc16', LoadBalancer: '#f97316',
};

interface DeviceNodeData { device: NetworkDevice; }

const DeviceNode = memo(({ data, selected }: NodeProps<DeviceNodeData>) => {
  const { device } = data;
  const selectDevice = useNetworkStore((s) => s.selectDevice);
  const ip = device.interfaces[0]?.ipAddress;
  const color = DEVICE_COLORS[device.type] ?? '#64748b';
  const icon = DEVICE_ICONS[device.type] ?? '📦';

  const handleClick = useCallback(() => { selectDevice(device.id); }, [device.id, selectDevice]);

  return (
    <div
      className={`device-node ${selected ? 'selected' : ''} ${device.status === 'DOWN' ? 'status-down' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
      <div className={`device-node-status ${device.status.toLowerCase()}`} />
      <div
        style={{
          background: `linear-gradient(135deg, ${color}33 0%, ${color}11 100%)`,
          borderRadius: 8, width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, border: `1px solid ${color}44`,
        }}
      >
        {icon}
      </div>
      <div className="device-node-name">{device.name}</div>
      {ip && <div className="device-node-ip">{ip}</div>}
    </div>
  );
});

DeviceNode.displayName = 'DeviceNode';
export default DeviceNode;
