export type CloseBehavior = "ask" | "tray" | "quit";
export type ThemeSource = "system" | "light" | "dark";
export type AppearancePreset = "whatsapp" | "midnight" | "oled" | "nord" | "dracula" | "solarized" | "rose" | "custom";
export type WallpaperMode = "default" | "solid" | "gradient" | "image";

export interface AppearanceSettings {
  enabled: boolean;
  preset: AppearancePreset;
  nativeTheme: ThemeSource;
  fontFamily: string;
  customFontFamily: string;
  fontScale: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  density: number;
  sidebarWidth: number;
  messageWidth: number;
  bubbleRadius: number;
  controlRadius: number;
  avatarRadius: number;
  borderWidth: number;
  shadowStrength: number;
  panelBlur: number;
  bubbleSpacing: number;
  accentColor: string;
  appBackground: string;
  sidebarBackground: string;
  sidebarHeaderBackground: string;
  sidebarSearchBackground: string;
  sidebarSearchInputBackground: string;
  chatListBackground: string;
  panelBackground: string;
  composerBackground: string;
  incomingBubble: string;
  outgoingBubble: string;
  primaryText: string;
  secondaryText: string;
  borderColor: string;
  linkColor: string;
  selectionColor: string;
  wallpaperMode: WallpaperMode;
  wallpaperColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  wallpaperFile: string;
  wallpaperSize: "cover" | "contain" | "tile";
  wallpaperPosition: "center" | "top" | "bottom" | "left" | "right";
  wallpaperOpacity: number;
  wallpaperBlur: number;
  wallpaperOverlay: string;
  wallpaperOverlayOpacity: number;
  reducedMotion: boolean;
  highContrast: boolean;
  grayscaleAvatars: boolean;
  monochromeIcons: boolean;
  underlineLinks: boolean;
  customScrollbars: boolean;
  scrollbarWidth: number;
  translucentPanels: boolean;
  hideWallpaperPattern: boolean;
  customCss: string;
}

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
  zoomFactor: number;
}

export interface AppSettings {
  version: 2;
  closeBehavior: CloseBehavior;
  launchAtLogin: boolean;
  startHidden: boolean;
  spellcheck: boolean;
  spellcheckLanguage: string;
  appearance: AppearanceSettings;
  window: WindowState;
}

export const defaultAppearance: AppearanceSettings = {
  enabled: false,
  preset: "whatsapp",
  nativeTheme: "system",
  fontFamily: "system-ui",
  customFontFamily: "",
  fontScale: 1,
  fontWeight: 400,
  lineHeight: 1.35,
  letterSpacing: 0,
  density: 1,
  sidebarWidth: 360,
  messageWidth: 72,
  bubbleRadius: 8,
  controlRadius: 8,
  avatarRadius: 50,
  borderWidth: 1,
  shadowStrength: 18,
  panelBlur: 0,
  bubbleSpacing: 2,
  accentColor: "#1daa61",
  appBackground: "#ffffff",
  sidebarBackground: "#ffffff",
  sidebarHeaderBackground: "#f7f5f3",
  sidebarSearchBackground: "#ffffff",
  sidebarSearchInputBackground: "#f0f2f5",
  chatListBackground: "#ffffff",
  panelBackground: "#f7f5f3",
  composerBackground: "#ffffff",
  incomingBubble: "#ffffff",
  outgoingBubble: "#d9fdd3",
  primaryText: "#0a0a0a",
  secondaryText: "#667781",
  borderColor: "#e9edef",
  linkColor: "#008069",
  selectionColor: "#d9fdd3",
  wallpaperMode: "default",
  wallpaperColor: "#f5f1eb",
  gradientStart: "#d9fdd3",
  gradientEnd: "#d2e8fe",
  gradientAngle: 135,
  wallpaperFile: "",
  wallpaperSize: "cover",
  wallpaperPosition: "center",
  wallpaperOpacity: 1,
  wallpaperBlur: 0,
  wallpaperOverlay: "#000000",
  wallpaperOverlayOpacity: 0,
  reducedMotion: false,
  highContrast: false,
  grayscaleAvatars: false,
  monochromeIcons: false,
  underlineLinks: false,
  customScrollbars: true,
  scrollbarWidth: 8,
  translucentPanels: false,
  hideWallpaperPattern: false,
  customCss: ""
};

export const defaultSettings: AppSettings = {
  version: 2,
  closeBehavior: "ask",
  launchAtLogin: false,
  startHidden: false,
  spellcheck: true,
  spellcheckLanguage: "en-GB",
  appearance: structuredClone(defaultAppearance),
  window: {
    width: 1200,
    height: 800,
    maximized: false,
    zoomFactor: 1
  }
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const numberInRange = (value: unknown, fallback: number, minimum: number, maximum: number): number =>
  isFiniteNumber(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;

const enumValue = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const colorValue = (value: unknown, fallback: string): string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;

const stringValue = (value: unknown, fallback: string, maximum: number): string =>
  typeof value === "string" ? value.slice(0, maximum) : fallback;

export function validateAppearance(value: unknown): AppearanceSettings {
  const input = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const result = structuredClone(defaultAppearance);
  result.enabled = typeof input.enabled === "boolean" ? input.enabled : result.enabled;
  result.preset = enumValue(input.preset, ["whatsapp", "midnight", "oled", "nord", "dracula", "solarized", "rose", "custom"], result.preset);
  result.nativeTheme = enumValue(input.nativeTheme, ["system", "light", "dark"], result.nativeTheme);
  result.fontFamily = stringValue(input.fontFamily, result.fontFamily, 120);
  result.customFontFamily = stringValue(input.customFontFamily, result.customFontFamily, 120).replace(/[;{}]/g, "");
  result.fontScale = numberInRange(input.fontScale, result.fontScale, 0.75, 1.5);
  result.fontWeight = Math.round(numberInRange(input.fontWeight, result.fontWeight, 300, 700));
  result.lineHeight = numberInRange(input.lineHeight, result.lineHeight, 1, 1.8);
  result.letterSpacing = numberInRange(input.letterSpacing, result.letterSpacing, -0.5, 2);
  result.density = numberInRange(input.density, result.density, 0.75, 1.3);
  result.sidebarWidth = Math.round(numberInRange(input.sidebarWidth, result.sidebarWidth, 260, 600));
  result.messageWidth = Math.round(numberInRange(input.messageWidth, result.messageWidth, 40, 95));
  result.bubbleRadius = numberInRange(input.bubbleRadius, result.bubbleRadius, 0, 28);
  result.controlRadius = numberInRange(input.controlRadius, result.controlRadius, 0, 24);
  result.avatarRadius = numberInRange(input.avatarRadius, result.avatarRadius, 0, 50);
  result.borderWidth = numberInRange(input.borderWidth, result.borderWidth, 0, 3);
  result.shadowStrength = numberInRange(input.shadowStrength, result.shadowStrength, 0, 60);
  result.panelBlur = numberInRange(input.panelBlur, result.panelBlur, 0, 30);
  result.bubbleSpacing = numberInRange(input.bubbleSpacing, result.bubbleSpacing, 0, 12);
  for (const key of ["accentColor", "appBackground", "sidebarBackground", "panelBackground", "composerBackground", "incomingBubble", "outgoingBubble", "primaryText", "secondaryText", "borderColor", "linkColor", "selectionColor", "wallpaperColor", "gradientStart", "gradientEnd", "wallpaperOverlay"] as const) {
    result[key] = colorValue(input[key], result[key]);
  }
  // Themes saved before the sidebar layers were split inherit their old palette
  // instead of unexpectedly falling back to light defaults.
  result.sidebarHeaderBackground = colorValue(input.sidebarHeaderBackground, result.panelBackground);
  result.sidebarSearchBackground = colorValue(input.sidebarSearchBackground, result.sidebarBackground);
  result.sidebarSearchInputBackground = colorValue(input.sidebarSearchInputBackground, result.panelBackground);
  result.chatListBackground = colorValue(input.chatListBackground, result.sidebarBackground);
  result.wallpaperMode = enumValue(input.wallpaperMode, ["default", "solid", "gradient", "image"], result.wallpaperMode);
  result.gradientAngle = Math.round(numberInRange(input.gradientAngle, result.gradientAngle, 0, 360));
  result.wallpaperFile = stringValue(input.wallpaperFile, "", 180).replace(/[^a-zA-Z0-9._-]/g, "");
  result.wallpaperSize = enumValue(input.wallpaperSize, ["cover", "contain", "tile"], result.wallpaperSize);
  result.wallpaperPosition = enumValue(input.wallpaperPosition, ["center", "top", "bottom", "left", "right"], result.wallpaperPosition);
  result.wallpaperOpacity = numberInRange(input.wallpaperOpacity, result.wallpaperOpacity, 0.05, 1);
  result.wallpaperBlur = numberInRange(input.wallpaperBlur, result.wallpaperBlur, 0, 20);
  result.wallpaperOverlayOpacity = numberInRange(input.wallpaperOverlayOpacity, result.wallpaperOverlayOpacity, 0, 0.9);
  for (const key of ["reducedMotion", "highContrast", "grayscaleAvatars", "monochromeIcons", "underlineLinks", "customScrollbars", "translucentPanels", "hideWallpaperPattern"] as const) {
    result[key] = typeof input[key] === "boolean" ? input[key] : result[key];
  }
  result.scrollbarWidth = Math.round(numberInRange(input.scrollbarWidth, result.scrollbarWidth, 4, 20));
  result.customCss = stringValue(input.customCss, "", 50_000);
  return result;
}

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
    version: 2,
    closeBehavior,
    launchAtLogin:
      typeof input.launchAtLogin === "boolean" ? input.launchAtLogin : false,
    startHidden: typeof input.startHidden === "boolean" ? input.startHidden : false,
    spellcheck: typeof input.spellcheck === "boolean" ? input.spellcheck : true,
    spellcheckLanguage: typeof input.spellcheckLanguage === "string" && /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(input.spellcheckLanguage)
      ? input.spellcheckLanguage
      : defaultSettings.spellcheckLanguage,
    appearance: validateAppearance(input.appearance),
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
    appearance: { ...current.appearance, ...patch.appearance },
    window: { ...current.window, ...patch.window }
  });
}
