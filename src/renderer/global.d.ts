import type { LocalAppApi } from "../preload/settings";

declare global {
  interface Window {
    whatsappLinux: LocalAppApi;
  }
}

export {};
