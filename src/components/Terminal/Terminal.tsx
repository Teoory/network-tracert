import React, { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import { engine } from '../../simulation/engine/SimulationEngine';
import { TopologyStorage } from '../../utils/topologyStorage';
import type { Route } from '../../types';

interface OutputLine { text: string; type: 'normal' | 'prompt' | 'error' | 'success' | 'info' | 'warning'; }

export default function Terminal() {
  const { devices, selectedDeviceId } = useNetworkStore();
  const [output, setOutput] = useState<OutputLine[]>([
    { text: '╔══════════════════════════════════════╗', type: 'info' },
    { text: '║   Network Sandbox Simulator v1.0     ║', type: 'info' },
    { text: '╚══════════════════════════════════════╝', type: 'info' },
    { text: 'Select a device first. Type "help" for commands.', type: 'normal' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const activeDevice = selectedDeviceId ? devices[selectedDeviceId] : null;

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const addLine = (text: string, type: OutputLine['type'] = 'normal') =>
    setOutput((p) => [...p, { text, type }]);
  const addLines = (lines: string[], type: OutputLine['type'] = 'normal') =>
    setOutput((p) => [...p, ...lines.map((text) => ({ text, type }))]);
  const nl = () => addLine('');

  const executeCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    const prefix = activeDevice ? `${activeDevice.name}> ` : '> ';
    addLine(prefix + cmd, 'prompt');
    setHistory((p) => [cmd, ...p].slice(0, 50));
    setHistoryIndex(-1);

    const parts = cmd.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'help':
        addLines([
          'NETWORK & DIAGNOSTIC COMMANDS:',
          '  ping <host>                — ICMP echo request (4 packets)',
          '  traceroute <host>          — Trace route hops to destination',
          '  nslookup <host>            — Query DNS record',
          '  ipconfig / ifconfig        — Show IP configuration',
          '  arp                        — Show ARP cache table',
          '  dhcp                       — Request dynamic IP via DHCP',
          '',
          'CISCO-STYLE SHOW COMMANDS:',
          '  show interfaces / show ip  — Display interface status and IP details',
          '  show ip route              — Display IPv4 routing table',
          '  show mac                   — Display Switch MAC address learning table',
          '  show vlan                  — Display configured VLANs & port assignments',
          '  show firewall              — Display active Firewall ACL rules',
          '  show nat                   — Display active NAT / PAT translation table',
          '',
          'SECURITY & INCIDENT SIMULATION:',
          '  attack <portscan|ddos|ssh|arp> <target> — Launch cyber security attack',
          '  incident <port|cable|dns|overload>      — Inject network infrastructure failure',
          '',
          'TOPOLOGY & SYSTEM:',
          '  devices                    — List all devices in simulation',
          '  select <name>              — Select active device context',
          '  save <slotName>            — Save topology to LocalStorage slot',
          '  load <slotName>            — Restore topology from LocalStorage slot',
          '  clear                      — Clear terminal screen',
        ], 'info');
        break;

      case 'clear':
        setOutput([]);
        break;

      case 'devices': {
        const list = Object.values(devices);
        if (list.length === 0) { addLine('No devices in the network.', 'warning'); break; }
        addLine('DEVICE LIST', 'info');
        addLine('─'.repeat(50), 'info');
        list.forEach((d) => {
          const ip = d.interfaces[0]?.ipAddress ?? 'No IP';
          addLine(`  ${d.name.padEnd(14)} ${d.type.padEnd(14)} ${ip}`);
        });
        break;
      }

      case 'select': {
        const name = args.join(' ').toUpperCase();
        const found = Object.values(devices).find((d) => d.name.toUpperCase() === name);
        if (found) { useNetworkStore.getState().selectDevice(found.id); addLine(`Switched to: ${found.name}`, 'success'); }
        else addLine(`Device not found: "${name}"`, 'error');
        break;
      }

      case 'ping': {
        if (!activeDevice) { addLine('Error: Select a device first. Use: select <name>', 'error'); break; }
        const target = args[0];
        if (!target) { addLine('Usage: ping <hostname|ip>', 'error'); break; }

        // DNS resolution first
        let resolvedIp = target;
        if (!/^\d+\.\d+\.\d+\.\d+$/.test(target)) {
          const dnsResult = engine.dns.resolve(activeDevice.id, target);
          if (dnsResult.success && dnsResult.ip) {
            resolvedIp = dnsResult.ip;
            addLine(`Resolving ${target}... → ${resolvedIp}`, 'info');
          } else {
            addLine(`ping: ${target}: Name or service not known`, 'error');
            break;
          }
        }

        const targetDevice = Object.values(devices).find((d) =>
          d.name.toUpperCase() === target.toUpperCase() || d.interfaces.some((i) => i.ipAddress === resolvedIp)
        );
        if (!targetDevice) { addLine(`ping: host ${resolvedIp} not found in simulation`, 'error'); break; }

        addLine(`PING ${targetDevice.name} (${resolvedIp}) 56(84) bytes of data.`, 'info');
        let success = 0;
        const latencies: number[] = [];
        for (let i = 0; i < 4; i++) {
          const r = engine.packets.sendPing(activeDevice.id, targetDevice.id);
          if (r.success) {
            success++;
            latencies.push(r.latency);
            const hops = engine.findPath(activeDevice.id, targetDevice.id).length;
            addLine(`64 bytes from ${resolvedIp}: icmp_seq=${i+1} ttl=${64 - hops + 1} time=${r.latency.toFixed(2)} ms`, 'success');
          } else {
            addLine(`Request timeout for icmp_seq ${i+1}`, 'error');
          }
          useNetworkStore.getState().syncFromEngine();
        }
        nl();
        const loss = ((4 - success) / 4 * 100).toFixed(0);
        const avg = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;
        addLine(`--- ${resolvedIp} ping statistics ---`);
        addLine(`4 packets transmitted, ${success} received, ${loss}% packet loss`, success === 4 ? 'success' : success === 0 ? 'error' : 'warning');
        if (latencies.length) addLine(`rtt min/avg/max = ${Math.min(...latencies).toFixed(2)}/${avg}/${Math.max(...latencies).toFixed(2)} ms`);
        break;
      }

      case 'traceroute':
      case 'tracert': {
        if (!activeDevice) { addLine('Error: Select a device first.', 'error'); break; }
        const target = args[0];
        if (!target) { addLine('Usage: traceroute <host>', 'error'); break; }
        const targetDevice = Object.values(devices).find((d) =>
          d.name.toUpperCase() === target.toUpperCase() || d.interfaces.some((i) => i.ipAddress === target)
        );
        if (!targetDevice) { addLine(`traceroute: ${target}: Name or service not known`, 'error'); break; }

        const path = engine.findPath(activeDevice.id, targetDevice.id);
        if (path.length === 0) { addLine(`traceroute: No route to ${targetDevice.name}`, 'error'); break; }

        addLine(`traceroute to ${targetDevice.name} (${targetDevice.interfaces[0]?.ipAddress ?? '?'}), ${path.length} hops max`, 'info');
        path.forEach((deviceId, i) => {
          const d = engine.getDevice(deviceId);
          const ip = d?.interfaces[0]?.ipAddress ?? '?';
          const latency = (Math.random() * 5 + i * 2).toFixed(2);
          addLine(`  ${String(i+1).padStart(2)}  ${(d?.name ?? '?').padEnd(12)} (${ip})  ${latency} ms`, 'success');
        });
        useNetworkStore.getState().syncFromEngine();
        break;
      }

      case 'nslookup': {
        if (!activeDevice) { addLine('Error: Select a device first.', 'error'); break; }
        const hostname = args[0];
        if (!hostname) { addLine('Usage: nslookup <hostname>', 'error'); break; }
        const result = engine.dns.resolve(activeDevice.id, hostname);
        if (result.success) {
          addLine(`Server:  ${result.serverName}`, 'info');
          addLine('');
          addLine(`Name:    ${hostname}`);
          addLine(`Address: ${result.ip}`, 'success');
        } else {
          addLine(`** server can't find ${hostname}: NXDOMAIN`, 'error');
        }
        useNetworkStore.getState().syncFromEngine();
        break;
      }

      case 'ipconfig':
      case 'ifconfig': {
        if (!activeDevice) { addLine('Error: Select a device first.', 'error'); break; }
        addLine(`${activeDevice.name} — ${activeDevice.type}`, 'info');
        addLine('─'.repeat(40), 'info');
        activeDevice.interfaces.forEach((iface) => {
          addLine(`Interface: ${iface.name}  (${iface.status})`);
          addLine(`  MAC:     ${iface.macAddress}`);
          addLine(`  IP:      ${iface.ipAddress ?? 'Not assigned'}`);
          addLine(`  Mask:    ${iface.subnetMask ?? 'Not assigned'}`);
          addLine(`  Gateway: ${iface.gateway ?? 'Not assigned'}`);
          addLine(`  DNS:     ${iface.dns ?? 'Not assigned'}`);
          addLine(`  Mode:    ${iface.isDHCP ? 'DHCP' : 'Static'}`);
        });
        break;
      }

      case 'arp': {
        if (!activeDevice) { addLine('Error: Select a device first.', 'error'); break; }
        const cache = engine.getARPCache(activeDevice.id);
        if (cache.size === 0) { addLine('ARP cache is empty.', 'warning'); break; }
        addLine('ARP Cache:', 'info');
        addLine('  Internet Address      Physical Address');
        cache.forEach((mac, ip) => addLine(`  ${ip.padEnd(22)} ${mac}`));
        break;
      }

      case 'dhcp': {
        if (!activeDevice) { addLine('Error: Select a device first.', 'error'); break; }
        addLine(`Sending DHCP Discover from ${activeDevice.name}...`, 'info');
        const lease = engine.dhcp.requestIP(activeDevice.id);
        if (lease) {
          addLine('DHCP ACK received!', 'success');
          addLine(`  IP Address:  ${lease.ip}`);
          addLine(`  Subnet Mask: ${lease.subnetMask}`);
          addLine(`  Gateway:     ${lease.gateway}`);
          addLine(`  DNS:         ${lease.dns}`);
          addLine(`  Lease Time:  ${lease.leaseTime}s`);
        } else {
          addLine('DHCP failed: No server reachable or pool exhausted.', 'error');
        }
        useNetworkStore.getState().syncFromEngine();
        break;
      }

      case 'show': {
        if (!activeDevice) { addLine('Error: Select a device first.', 'error'); break; }
        const sub = args.join(' ').toLowerCase();

        if (sub.includes('int') || sub.includes('ip int')) {
          addLine(`Interface Status for ${activeDevice.name}:`, 'info');
          addLine('  Port/Iface     Status   IP Address       Subnet Mask      Speed');
          addLine('─'.repeat(65), 'info');
          activeDevice.ports.forEach((p, idx) => {
            const iface = activeDevice.interfaces[idx];
            const ip = iface?.ipAddress ?? 'unassigned';
            const mask = iface?.subnetMask ?? 'unassigned';
            addLine(`  ${p.name.padEnd(14)} ${p.status.padEnd(8)} ${ip.padEnd(16)} ${mask.padEnd(16)} ${p.speed}M`);
          });
        } else if (sub.includes('route')) {
          addLine(`IPv4 Routing Table for ${activeDevice.name}:`, 'info');
          const routes = engine.routing.getRoutes(activeDevice.id);
          if (routes.length === 0) {
            addLine('  No routes configured.', 'warning');
          } else {
            addLine('  Type  Network          Netmask          Next-Hop         Interface Metric');
            addLine('─'.repeat(75), 'info');
            routes.forEach((r: Route) => {
              const typeStr = r.type === 'CONNECTED' ? 'C' : r.isDefault ? 'S*' : 'S';
              addLine(`  ${typeStr.padEnd(5)} ${(r.network || '0.0.0.0').padEnd(16)} ${(r.mask || '0.0.0.0').padEnd(16)} ${(r.nextHop || 'direct').padEnd(16)} ${(r.interface || 'Gi0/1').padEnd(9)} ${r.metric}`);
            });
          }
        } else if (sub.includes('mac')) {
          addLine(`MAC Address Table for ${activeDevice.name}:`, 'info');
          const macTable = engine.getMACTable(activeDevice.id);
          if (macTable.size === 0) {
            addLine('  MAC table is empty (no frames observed yet).', 'warning');
          } else {
            addLine('  VLAN   MAC Address         Type      Port');
            addLine('─'.repeat(50), 'info');
            macTable.forEach((portId, mac) => {
              addLine(`  1      ${mac.padEnd(19)} DYNAMIC   ${portId}`);
            });
          }
        } else if (sub.includes('vlan')) {
          addLine(`VLAN Database for ${activeDevice.name}:`, 'info');
          const vlans = engine.vlan.getVlans(activeDevice.id);
          addLine('  VLAN ID  Name             Status    Ports');
          addLine('─'.repeat(55), 'info');
          vlans.forEach((v) => {
            const assignedPorts = activeDevice.ports
              .filter((p) => {
                const cfg = engine.vlan.getPortConfig(activeDevice.id, p.id);
                return cfg.accessVlan === v.id;
              })
              .map((p) => p.name)
              .join(', ');
            addLine(`  ${String(v.id).padEnd(8)} ${v.name.padEnd(16)} ACTIVE    ${assignedPorts || 'none'}`);
          });
        } else if (sub.includes('firewall') || sub.includes('rule') || sub.includes('acl')) {
          addLine(`Firewall Filter Rules on ${activeDevice.name}:`, 'info');
          const rules = engine.firewall.getRules(activeDevice.id);
          if (rules.length === 0) {
            addLine('  No firewall rules defined (default policy: ALLOW all).', 'info');
          } else {
            addLine('  Prio  Action  Proto  Source           Destination      Port  Status  Description');
            addLine('─'.repeat(85), 'info');
            rules.forEach((r) => {
              const act = r.action === 'ALLOW' ? 'ALLOW' : 'DENY';
              addLine(`  ${String(r.priority).padEnd(5)} ${act.padEnd(7)} ${r.protocol.padEnd(6)} ${r.source.padEnd(16)} ${r.destination.padEnd(16)} ${(r.destinationPort || 'ANY').padEnd(5)} ${r.enabled ? 'ON' : 'OFF'}     ${r.description}`);
            });
          }
        } else if (sub.includes('nat')) {
          addLine(`NAT / PAT Active Translations on ${activeDevice.name}:`, 'info');
          const translations = engine.nat.getTranslations(activeDevice.id);
          if (translations.length === 0) {
            addLine('  No active NAT translations.', 'info');
          } else {
            addLine('  Proto  Inside Local         Inside Global        Outside Global');
            addLine('─'.repeat(70), 'info');
            translations.forEach((t) => {
              addLine(`  ${t.protocol.padEnd(6)} ${(t.insideLocalIp + ':' + t.insideLocalPort).padEnd(20)} ${(t.insideGlobalIp + ':' + t.insideGlobalPort).padEnd(20)} ${t.outsideGlobalIp + ':' + t.outsideGlobalPort}`);
            });
          }
        } else {
          addLine(`Unknown show target "${sub}". Available: interfaces, ip route, mac, vlan, firewall, nat`, 'error');
        }
        break;
      }

      case 'attack': {
        const attackType = (args[0] || '').toLowerCase();
        const targetName = (args[1] || '').toUpperCase();

        if (!targetName) {
          addLine('Usage: attack <portscan|ddos|ssh|arp|traffic> <targetDeviceName>', 'error');
          break;
        }

        const targetDev = Object.values(devices).find((d) => d.name.toUpperCase() === targetName);
        if (!targetDev) {
          addLine(`Target device "${targetName}" not found.`, 'error');
          break;
        }

        const typeMap: Record<string, any> = {
          portscan: 'PORT_SCAN',
          ddos: 'DDOS',
          ssh: 'SSH_BRUTE_FORCE',
          arp: 'ARP_SPOOFING',
          traffic: 'SUSPICIOUS_TRAFFIC',
        };

        const secType = typeMap[attackType];
        if (!secType) {
          addLine('Invalid attack type. Choose: portscan, ddos, ssh, arp, traffic', 'error');
          break;
        }

        const attack = engine.securityEvents.launchAttack(secType, targetDev.id, activeDevice?.id);
        if (attack) {
          addLine(`🚨 Attack Launched: ${attack.title}`, 'warning');
          addLine(`  Target: ${targetDev.name} (${attack.targetIp})`);
          addLine(`  Mitigation hint: ${attack.mitigationRecommendation}`, 'info');
        } else {
          addLine('Failed to launch attack.', 'error');
        }
        useNetworkStore.getState().syncFromEngine();
        break;
      }

      case 'incident': {
        const incType = (args[0] || '').toLowerCase();
        const typeMap: Record<string, any> = {
          port: 'PORT_FAILURE',
          cable: 'CABLE_FAILURE',
          dhcp: 'DHCP_POOL_EXHAUSTED',
          dns: 'DNS_FAILURE',
          overload: 'SERVER_OVERLOAD',
          congestion: 'NETWORK_CONGESTION',
        };

        const matched = typeMap[incType];
        if (!matched) {
          addLine('Usage: incident <port|cable|dhcp|dns|overload|congestion>', 'error');
          break;
        }

        const inc = engine.randomEvents.triggerIncident(matched, activeDevice?.id);
        if (inc) {
          addLine(`💥 Incident Injected: ${inc.title}`, 'error');
          addLine(`  ${inc.description}`);
          addLine(`  Hint: ${inc.mitigationHint}`, 'info');
        } else {
          addLine('Failed to trigger incident for current topology.', 'error');
        }
        useNetworkStore.getState().syncFromEngine();
        break;
      }

      case 'save': {
        const slot = args[0] || 'default';
        const ok = TopologyStorage.saveToSlot(slot);
        if (ok) addLine(`💾 Topology saved to slot "${slot}".`, 'success');
        else addLine(`Failed to save slot "${slot}".`, 'error');
        break;
      }

      case 'load': {
        const slot = args[0] || 'default';
        const ok = TopologyStorage.loadFromSlot(slot);
        if (ok) {
          useNetworkStore.getState().syncFromEngine();
          addLine(`📂 Topology loaded from slot "${slot}".`, 'success');
        } else {
          addLine(`Slot "${slot}" not found or failed to parse.`, 'error');
        }
        break;
      }

      case 'slots': {
        const slots = TopologyStorage.getSavedSlots();
        if (slots.length === 0) {
          addLine('No saved topology slots in LocalStorage.', 'info');
        } else {
          addLine('Saved Topology Slots:', 'info');
          slots.forEach((s) => addLine(`  - ${s}`));
        }
        break;
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { executeCommand(input); setInput(''); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); const i = Math.min(historyIndex + 1, history.length - 1); setHistoryIndex(i); setInput(history[i] ?? ''); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); const i = Math.max(historyIndex - 1, -1); setHistoryIndex(i); setInput(i === -1 ? '' : history[i] ?? ''); }
  };

  const prompt = activeDevice ? `${activeDevice.name}> ` : '> ';

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div ref={outputRef} className="terminal-output">
        {output.map((line, i) => (
          <div key={i} className={line.type !== 'normal' ? `t-${line.type}` : undefined}>{line.text || '\u00A0'}</div>
        ))}
      </div>
      <div className="terminal-input-row">
        <span className="terminal-prompt-label">{prompt}</span>
        <input ref={inputRef} className="terminal-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} spellCheck={false} autoFocus placeholder="type a command..." />
      </div>
    </div>
  );
}
