import React, { useState, useEffect } from 'react';
import { engine } from '../../simulation/engine/SimulationEngine';
import { useNetworkStore } from '../../store/networkStore';

export function NextEventControl() {
  const { devices, syncFromEngine } = useNetworkStore();
  const [pendingCount, setPendingCount] = useState(0);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const update = () => {
      setPendingCount(engine.queue.getPendingTasks().length);
    };
    update();
    const unsub = engine.onEvent(() => update());
    return () => unsub();
  }, []);

  const handleNextStep = () => {
    // If queue is empty, auto-enqueue a realistic ping/discovery step across devices if present
    if (engine.queue.getPendingTasks().length === 0) {
      const devList = Object.values(devices);
      if (devList.length >= 2) {
        const src = devList[0];
        const dst = devList[1];
        engine.queue.enqueue({
          name: `ICMP Echo Step (${src.name} → ${dst.name})`,
          description: `Ping probe from ${src.name} to ${dst.name}`,
          protocol: 'ICMP',
          execute: (eng) => {
            eng.packets.sendPing(src.id, dst.id);
          },
        });
      }
    }

    const res = engine.queue.stepNext();
    if (res.processed && res.task) {
      setLastExecuted(res.task.name);
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 500);
      syncFromEngine();
    }
  };

  const handleQueuePing = () => {
    const devList = Object.values(devices);
    if (devList.length < 2) return;
    const src = devList[0];
    const dst = devList[1];

    engine.queue.enqueue({
      name: `Step: ARP Query & ICMP (${src.name} → ${dst.name})`,
      description: `Resolve ARP and send Echo Request to ${dst.name}`,
      protocol: 'ICMP',
      execute: (eng) => {
        eng.packets.sendPing(src.id, dst.id);
      },
    });
    setPendingCount(engine.queue.getPendingTasks().length);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(15, 23, 42, 0.95)',
        border: isFlashing ? '1px solid #38bdf8' : '1px solid #334155',
        borderRadius: 8,
        padding: '3px 8px',
        boxShadow: isFlashing ? '0 0 15px rgba(56, 189, 248, 0.5)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'all 0.2s',
      }}
    >
      <button
        onClick={handleNextStep}
        style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 6,
          padding: '5px 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.4,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
        }}
        title="Execute next pending simulation event step"
      >
        <span>⏭️</span>
        <span>NEXT EVENT</span>
        {pendingCount > 0 && (
          <span
            style={{
              background: '#38bdf8',
              color: '#0f172a',
              borderRadius: 10,
              padding: '1px 5px',
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {lastExecuted && (
        <span style={{ fontSize: 10, color: '#38bdf8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lastExecuted}
        </span>
      )}

      <button
        onClick={handleQueuePing}
        style={{
          background: 'transparent',
          border: '1px solid #475569',
          color: '#94a3b8',
          borderRadius: 4,
          padding: '3px 6px',
          fontSize: 10,
          cursor: 'pointer',
        }}
        title="Queue ICMP ping event"
      >
        + Queue Ping
      </button>
    </div>
  );
}
