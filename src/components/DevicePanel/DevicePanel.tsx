import React, { type DragEvent } from 'react';
import type { DeviceType } from '../../types';

interface DeviceCategory {
  label: string;
  devices: Array<{ type: DeviceType; icon: string; label: string; desc: string; color: string }>;
}

const DEVICE_CATEGORIES: DeviceCategory[] = [
  {
    label: 'Client Devices',
    devices: [
      { type: 'PC', icon: '💻', label: 'PC', desc: 'Personal Computer', color: '#3b82f6' },
      { type: 'Laptop', icon: '💻', label: 'Laptop', desc: 'Laptop / Notebook', color: '#3b82f6' },
      { type: 'Mobile', icon: '📱', label: 'Mobile', desc: 'Mobile Device', color: '#60a5fa' },
      { type: 'IoT', icon: '🔌', label: 'IoT', desc: 'IoT Device', color: '#94a3b8' },
    ],
  },
  {
    label: 'Network Devices',
    devices: [
      { type: 'Switch', icon: '🔀', label: 'Switch', desc: 'L2 Switch', color: '#10b981' },
      { type: 'Router', icon: '🌐', label: 'Router', desc: 'IP Router', color: '#8b5cf6' },
      { type: 'Firewall', icon: '🛡️', label: 'Firewall', desc: 'Packet Filter', color: '#ef4444' },
      { type: 'AccessPoint', icon: '📡', label: 'AP', desc: 'Access Point', color: '#84cc16' },
      { type: 'LoadBalancer', icon: '⚖️', label: 'Load Balancer', desc: 'LB', color: '#f97316' },
    ],
  },
  {
    label: 'Servers',
    devices: [
      { type: 'DHCPServer', icon: '🖥️', label: 'DHCP', desc: 'DHCP Server', color: '#06b6d4' },
      { type: 'DNSServer', icon: '🖥️', label: 'DNS', desc: 'DNS Server', color: '#ec4899' },
      { type: 'WebServer', icon: '🖥️', label: 'Web', desc: 'HTTP/S Server', color: '#f59e0b' },
      { type: 'Server', icon: '🖥️', label: 'Server', desc: 'Generic Server', color: '#64748b' },
    ],
  },
];

export default function DevicePanel() {
  const onDragStart = (e: DragEvent<HTMLDivElement>, type: DeviceType) => {
    e.dataTransfer.setData('application/device-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">Devices</div>
      <div className="device-list">
        {DEVICE_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <div className="section-title" style={{ fontSize: 9, padding: '8px 4px 4px' }}>
              {cat.label}
            </div>
            {cat.devices.map((d) => (
              <div
                key={d.type}
                className="device-item"
                draggable
                onDragStart={(e) => onDragStart(e, d.type)}
                title={`Drag to canvas to add ${d.label}`}
              >
                <div
                  className="device-icon"
                  style={{
                    background: `linear-gradient(135deg, ${d.color}33 0%, ${d.color}11 100%)`,
                    border: `1px solid ${d.color}44`,
                  }}
                >
                  {d.icon}
                </div>
                <div className="device-info">
                  <span className="device-name">{d.label}</span>
                  <span className="device-desc">{d.desc}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
