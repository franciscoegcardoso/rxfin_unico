/// <reference types="vite/client" />

interface Window {
  clarity: (method: string, ...args: unknown[]) => void;
}
