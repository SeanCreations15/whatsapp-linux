import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings } from "../shared/settings";

export interface Diagnostics {
  error: string;
  online: boolean;
  platform: string;
  electron: string;
}

export interface LocalAppApi {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  retry: () => Promise<void>;
  diagnostics: () => Promise<Diagnostics>;
}

const api: LocalAppApi = {
  getSettings: () => ipcRenderer.invoke("settings:get") as Promise<AppSettings>,
  saveSettings: (patch) => ipcRenderer.invoke("settings:save", patch) as Promise<AppSettings>,
  retry: () => ipcRenderer.invoke("app:retry") as Promise<void>,
  diagnostics: () => ipcRenderer.invoke("app:diagnostics") as Promise<Diagnostics>
};
contextBridge.exposeInMainWorld("whatsappLinux", api);
