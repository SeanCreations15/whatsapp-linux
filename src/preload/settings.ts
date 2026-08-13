import { contextBridge, ipcRenderer } from "electron";
import type { AppearanceSettings, AppSettings } from "../shared/settings";

export interface Diagnostics {
  error: string;
  online: boolean;
  platform: string;
  electron: string;
}

export interface LocalAppApi {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  previewAppearance: (appearance: AppearanceSettings) => Promise<AppearanceSettings>;
  selectWallpaper: () => Promise<string>;
  clearWallpaper: () => Promise<void>;
  exportAppearance: (appearance: AppearanceSettings) => Promise<boolean>;
  importAppearance: () => Promise<AppearanceSettings | undefined>;
  retry: () => Promise<void>;
  diagnostics: () => Promise<Diagnostics>;
}

const api: LocalAppApi = {
  getSettings: () => ipcRenderer.invoke("settings:get") as Promise<AppSettings>,
  saveSettings: (patch) => ipcRenderer.invoke("settings:save", patch) as Promise<AppSettings>,
  previewAppearance: (appearance) => ipcRenderer.invoke("appearance:preview", appearance) as Promise<AppearanceSettings>,
  selectWallpaper: () => ipcRenderer.invoke("appearance:select-wallpaper") as Promise<string>,
  clearWallpaper: () => ipcRenderer.invoke("appearance:clear-wallpaper") as Promise<void>,
  exportAppearance: (appearance) => ipcRenderer.invoke("appearance:export", appearance) as Promise<boolean>,
  importAppearance: () => ipcRenderer.invoke("appearance:import") as Promise<AppearanceSettings | undefined>,
  retry: () => ipcRenderer.invoke("app:retry") as Promise<void>,
  diagnostics: () => ipcRenderer.invoke("app:diagnostics") as Promise<Diagnostics>
};
contextBridge.exposeInMainWorld("whatsappLinux", api);
