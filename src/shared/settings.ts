export type CloseBehavior = "ask" | "tray" | "quit";

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
  zoomFactor: number;
}

export interface AppSettings {
  version: 1;
  closeBehavior: CloseBehavior;
  launchAtLogin: boolean;
  startHidden: boolean;
  spellcheck: boolean;
  window: WindowState;
}

export const defaultSettings: AppSettings = {
  version: 1,
  closeBehavior: "ask",
  launchAtLogin: false,
  startHidden: false,
  spellcheck: true,
  window: {
    width: 1200,
    height: 800,
    maximized: false,
    zoomFactor: 1
  }
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function validateSettings(value: unknown): AppSettings {
  if (typeof value !== "object" || value === null) return structuredClone(defaultSettings);
  const input = value as Record<string, unknown>;
  const windowInput =
    typeof input.window === "object" && input.window !== null
      ? (input.window as Record<string, unknown>)
      : {};
  const closeBehavior = ["ask", "tray", "quit"].includes(String(input.closeBehavior))
    ? (input.closeBehavior as CloseBehavior)
    : defaultSettings.closeBehavior;
  const width = isFiniteNumber(windowInput.width)
    ? Math.max(600, Math.round(windowInput.width))
    : defaultSettings.window.width;
  const height = isFiniteNumber(windowInput.height)
    ? Math.max(480, Math.round(windowInput.height))
    : defaultSettings.window.height;
  const zoomFactor = isFiniteNumber(windowInput.zoomFactor)
    ? Math.min(2, Math.max(0.5, windowInput.zoomFactor))
    : defaultSettings.window.zoomFactor;
  const output: AppSettings = {
    version: 1,
    closeBehavior,
    launchAtLogin:
      typeof input.launchAtLogin === "boolean" ? input.launchAtLogin : false,
    startHidden: typeof input.startHidden === "boolean" ? input.startHidden : false,
    spellcheck: typeof input.spellcheck === "boolean" ? input.spellcheck : true,
    window: {
      width,
      height,
      maximized: windowInput.maximized === true,
      zoomFactor
    }
  };
  if (isFiniteNumber(windowInput.x)) output.window.x = Math.round(windowInput.x);
  if (isFiniteNumber(windowInput.y)) output.window.y = Math.round(windowInput.y);
  return output;
}

export function mergeSettings(current: AppSettings, patch: Partial<AppSettings>): AppSettings {
  return validateSettings({
    ...current,
    ...patch,
    window: { ...current.window, ...patch.window }
  });
}
