export type GameEventHandler<T = unknown> = (payload: T) => void;

export class GameEventBus {
  private listeners = new Map<string, Set<GameEventHandler<any>>>();

  on<T = unknown>(event: string, handler: GameEventHandler<T>): () => void {
    const set = this.listeners.get(event) ?? new Set<GameEventHandler<any>>();
    set.add(handler as GameEventHandler<any>);
    this.listeners.set(event, set);
    return () => this.off(event, handler);
  }

  once<T = unknown>(event: string, handler: GameEventHandler<T>): () => void {
    const unsubscribe = this.on<T>(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  off<T = unknown>(event: string, handler: GameEventHandler<T>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler as GameEventHandler<any>);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<T = unknown>(event: string, payload: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[Greenvale event-bus] listener failed: ${event}`, error);
      }
    }
  }

  clear(event?: string): void {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }
}

export const gameEvents = new GameEventBus();
