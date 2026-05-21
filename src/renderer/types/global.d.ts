export {};

declare global {
  interface Window {
    musicAI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<any>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}
