import React, { useEffect, useRef } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import type { SimulationEvent } from '../../types';

const EVENT_ICONS: Partial<Record<string, string>> = {
  PACKET_CREATED: '📦',
  PACKET_FORWARDED: '→',
  PACKET_DELIVERED: '✅',
  PACKET_DROPPED: '❌',
  DEVICE_ADDED: '➕',
  DEVICE_REMOVED: '🗑️',
  DEVICE_CONNECTED: '🔗',
  DEVICE_DISCONNECTED: '✂️',
  ARP_REQUEST: '❓',
  ARP_REPLY: '✔️',
  ICMP_ECHO_REQUEST: '🏓',
  ICMP_ECHO_REPLY: '🏓',
  DHCP_DISCOVER: '📡',
  DHCP_OFFER: '🤝',
  DHCP_REQUEST: '📋',
  DHCP_ACK: '✅',
  FIREWALL_BLOCK: '🛡️',
  ATTACK_DETECTED: '⚠️',
  PORT_FAILURE: '🔴',
  CABLE_FAILURE: '⚡',
};

function EventEntry({ event }: { event: SimulationEvent }) {
  return (
    <div className="event-entry animate-fade-in">
      <span className="event-time">
        {new Date(event.timestamp).toLocaleTimeString('en', { hour12: false })}
      </span>
      <span className={`event-badge ${event.severity}`}>{event.severity}</span>
      <span style={{ flexShrink: 0, fontSize: 12 }}>
        {EVENT_ICONS[event.type] ?? '•'}
      </span>
      <span className="event-desc">{event.description}</span>
    </div>
  );
}

export default function EventLog() {
  const events = useNetworkStore((s) => s.events);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep scroll at top (newest events are at top)
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="empty-icon">📋</div>
        <div className="empty-text">No events yet. Add devices and create connections to see activity.</div>
      </div>
    );
  }

  return (
    <div className="event-log">
      {events.map((e) => (
        <EventEntry key={e.id} event={e} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
