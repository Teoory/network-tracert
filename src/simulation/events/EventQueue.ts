// ============================================================
// Event Queue — Deterministic Step-by-Step Simulation Scheduling
// ============================================================

import type { SimulationEngine } from '../engine/SimulationEngine';

export interface QueuedSimulationTask {
  id: string;
  name: string;
  description: string;
  protocol: string;
  createdAt: number;
  execute: (engine: SimulationEngine) => void;
}

export class SimulationEventQueue {
  private engine: SimulationEngine;
  private queue: QueuedSimulationTask[] = [];
  private history: QueuedSimulationTask[] = [];

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  getPendingTasks(): QueuedSimulationTask[] {
    return [...this.queue];
  }

  getHistory(): QueuedSimulationTask[] {
    return [...this.history];
  }

  enqueue(task: Omit<QueuedSimulationTask, 'id' | 'createdAt'>): QueuedSimulationTask {
    const fullTask: QueuedSimulationTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    this.queue.push(fullTask);
    return fullTask;
  }

  /**
   * Execute the next pending task in queue.
   * Returns true if a task was processed, false if queue was empty.
   */
  stepNext(): { processed: boolean; task?: QueuedSimulationTask } {
    if (this.queue.length === 0) return { processed: false };

    const task = this.queue.shift()!;
    try {
      task.execute(this.engine);
      this.history.unshift(task);
      if (this.history.length > 100) this.history.pop();
      return { processed: true, task };
    } catch (err) {
      console.error(`Failed to execute event step ${task.name}:`, err);
      return { processed: false, task };
    }
  }

  clear(): void {
    this.queue = [];
  }
}
