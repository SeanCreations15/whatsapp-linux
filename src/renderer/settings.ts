import { defaultAppearance, validateAppearance } from "../shared/settings";
import type { AppearancePreset, AppearanceSettings } from "../shared/settings";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Settings interface is missing ${selector}`);
  return element;
}

const form = required<HTMLFormElement>("#settings-form");
const closeBehavior = required<HTMLSelectElement>("#close-behavior");
const launchAtLogin = required<HTMLInputElement>("#launch-at-login");
const startHidden = required<HTMLInputElement>("#start-hidden");
const spellcheck = required<HTMLInputElement>("#spellcheck");
const spellcheckLanguage = required<HTMLSelectElement>("#spellcheck-language");
const status = required<HTMLElement>("#status");
const wallpaperName = required<HTMLElement>("#wallpaper-name");

const presetPalettes: Record<Exclude<AppearancePreset, "custom">, Partial<AppearanceSettings>> = {
  whatsapp: {
    nativeTheme: "light", accentColor: "#1daa61", appBackground: "#ffffff", sidebarBackground: "#ffffff",
    sidebarHeaderBackground: "#f7f5f3", sidebarSearchBackground: "#ffffff", sidebarSearchInputBackground: "#f0f2f5", chatListBackground: "#ffffff",
    panelBackground: "#f7f5f3", composerBackground: "#ffffff", incomingBubble: "#ffffff",
    outgoingBubble: "#d9fdd3", primaryText: "#0a0a0a", secondaryText: "#667781", borderColor: "#e9edef",
    linkColor: "#008069", selectionColor: "#d9fdd3", wallpaperColor: "#f5f1eb"
  },
  midnight: {
    nativeTheme: "dark", accentColor: "#53bdeb", appBackground: "#0b141a", sidebarBackground: "#111b21",
    sidebarHeaderBackground: "#202c33", sidebarSearchBackground: "#111b21", sidebarSearchInputBackground: "#202c33", chatListBackground: "#111b21",
    panelBackground: "#202c33", composerBackground: "#2a3942", incomingBubble: "#202c33",
    outgoingBubble: "#005c4b", primaryText: "#e9edef", secondaryText: "#8696a0", borderColor: "#2a3942",
    linkColor: "#53bdeb", selectionColor: "#005c4b", wallpaperColor: "#0b141a"
  },
  oled: {
    nativeTheme: "dark", accentColor: "#00d084", appBackground: "#000000", sidebarBackground: "#050505",
    sidebarHeaderBackground: "#0d0d0d", sidebarSearchBackground: "#050505", sidebarSearchInputBackground: "#121212", chatListBackground: "#050505",
    panelBackground: "#0d0d0d", composerBackground: "#121212", incomingBubble: "#111111",
    outgoingBubble: "#003f34", primaryText: "#f5f5f5", secondaryText: "#9b9b9b", borderColor: "#202020",
    linkColor: "#42e8b5", selectionColor: "#004d3e", wallpaperColor: "#000000"
  },
  nord: {
    nativeTheme: "dark", accentColor: "#88c0d0", appBackground: "#2e3440", sidebarBackground: "#3b4252",
    sidebarHeaderBackground: "#4c566a", sidebarSearchBackground: "#3b4252", sidebarSearchInputBackground: "#434c5e", chatListBackground: "#3b4252",
    panelBackground: "#434c5e", composerBackground: "#4c566a", incomingBubble: "#434c5e",
    outgoingBubble: "#44646e", primaryText: "#eceff4", secondaryText: "#d8dee9", borderColor: "#4c566a",
    linkColor: "#88c0d0", selectionColor: "#5e81ac", wallpaperColor: "#2e3440"
  },
  dracula: {
    nativeTheme: "dark", accentColor: "#bd93f9", appBackground: "#282a36", sidebarBackground: "#21222c",
    sidebarHeaderBackground: "#343746", sidebarSearchBackground: "#21222c", sidebarSearchInputBackground: "#44475a", chatListBackground: "#21222c",
    panelBackground: "#343746", composerBackground: "#44475a", incomingBubble: "#44475a",
    outgoingBubble: "#4d3b63", primaryText: "#f8f8f2", secondaryText: "#bfbfc7", borderColor: "#525568",
    linkColor: "#8be9fd", selectionColor: "#44475a", wallpaperColor: "#282a36"
  },
  solarized: {
    nativeTheme: "dark", accentColor: "#2aa198", appBackground: "#002b36", sidebarBackground: "#073642",
    sidebarHeaderBackground: "#0b3d49", sidebarSearchBackground: "#073642", sidebarSearchInputBackground: "#124652", chatListBackground: "#073642",
    panelBackground: "#0b3d49", composerBackground: "#124652", incomingBubble: "#073642",
    outgoingBubble: "#145b58", primaryText: "#eee8d5", secondaryText: "#93a1a1", borderColor: "#28515a",
    linkColor: "#2aa198", selectionColor: "#586e75", wallpaperColor: "#002b36"
  },
  rose: {
    nativeTheme: "dark", accentColor: "#eb6f92", appBackground: "#191724", sidebarBackground: "#1f1d2e",
    sidebarHeaderBackground: "#26233a", sidebarSearchBackground: "#1f1d2e", sidebarSearchInputBackground: "#2a273f", chatListBackground: "#1f1d2e",
    panelBackground: "#26233a", composerBackground: "#2a273f", incomingBubble: "#26233a",
    outgoingBubble: "#40334d", primaryText: "#e0def4", secondaryText: "#908caa", borderColor: "#403d52",
    linkColor: "#c4a7e7", selectionColor: "#524f67", wallpaperColor: "#191724"
  }
};

let currentAppearance: AppearanceSettings;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let previewRevision = 0;
const settings = await window.whatsappLinux.getSettings();

closeBehavior.value = settings.closeBehavior;
launchAtLogin.checked = settings.launchAtLogin;
startHidden.checked = settings.startHidden;
spellcheck.checked = settings.spellcheck;
const availableLanguages = await window.whatsappLinux.getSpellcheckLanguages();
for (const language of availableLanguages) {
  spellcheckLanguage.add(new Option(language, language));
}
spellcheckLanguage.value = availableLanguages.includes(settings.spellcheckLanguage)
  ? settings.spellcheckLanguage
  : availableLanguages[0] ?? "";
spellcheckLanguage.disabled = !spellcheck.checked || availableLanguages.length === 0;
spellcheck.addEventListener("change", () => {
  spellcheckLanguage.disabled = !spellcheck.checked || availableLanguages.length === 0;
});
startHidden.disabled = !launchAtLogin.checked;

function appearanceControls(): Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  return [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-appearance][name]")];
}

function readAppearance(): AppearanceSettings {
  const draft = { ...currentAppearance } as AppearanceSettings & Record<string, unknown>;
  for (const control of appearanceControls()) {
    draft[control.name] = control instanceof HTMLInputElement && control.type === "checkbox"
      ? control.checked
      : control instanceof HTMLInputElement && control.type === "range"
        ? Number(control.value)
        : control.value;
  }
  return validateAppearance(draft);
}

function outputText(name: string, value: number): string {
  if (["fontScale", "density", "wallpaperOpacity", "wallpaperOverlayOpacity"].includes(name)) return `${Math.round(value * 100)}%`;
  if (name === "messageWidth") return `${value}%`;
  if (["sidebarWidth", "bubbleRadius", "controlRadius", "borderWidth", "bubbleSpacing", "wallpaperBlur", "panelBlur", "scrollbarWidth"].includes(name)) return `${value}px`;
  if (name === "avatarRadius") return `${value}%`;
  if (name === "shadowStrength") return `${value}%`;
  if (name === "gradientAngle") return `${value}°`;
  return String(value);
}

function updateOutputs(): void {
  for (const output of form.querySelectorAll<HTMLOutputElement>("output[data-output]")) {
    const name = output.dataset.output;
    if (!name) continue;
    const value = currentAppearance[name as keyof AppearanceSettings];
    if (typeof value === "number") output.value = outputText(name, value);
  }
}

function renderAppearance(appearance: AppearanceSettings): void {
  currentAppearance = validateAppearance(appearance);
  for (const control of appearanceControls()) {
    const value = currentAppearance[control.name as keyof AppearanceSettings];
    if (control instanceof HTMLInputElement && control.type === "checkbox") control.checked = value === true;
    else control.value = String(value);
  }
  wallpaperName.textContent = currentAppearance.wallpaperFile || "No image selected";
  updatePresetSelection();
  updateOutputs();
}

function updatePresetSelection(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>(".preset")) {
    button.classList.toggle("selected", button.dataset.preset === currentAppearance.preset);
  }
}

function previewSoon(): void {
  const revision = ++previewRevision;
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    previewTimer = undefined;
    currentAppearance = readAppearance();
    updateOutputs();
    try {
      const previewed = await window.whatsappLinux.previewAppearance(currentAppearance);
      if (revision !== previewRevision) return;
      currentAppearance = previewed;
      status.textContent = "Previewing unsaved changes";
    } catch {
      if (revision !== previewRevision) return;
      status.textContent = "Preview failed";
    }
  }, 100);
}

renderAppearance(settings.appearance);

launchAtLogin.addEventListener("change", () => { startHidden.disabled = !launchAtLogin.checked; });

for (const item of document.querySelectorAll<HTMLButtonElement>(".nav-item")) {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((node) => node.classList.remove("active"));
    document.querySelectorAll(".settings-section").forEach((node) => node.classList.remove("active"));
    item.classList.add("active");
    document.querySelector(`[data-section="${item.dataset.tab}"]`)?.classList.add("active");
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".preset")) {
  button.addEventListener("click", () => {
    const preset = button.dataset.preset as AppearancePreset;
    const palette = preset === "custom" ? {} : presetPalettes[preset];
    renderAppearance(validateAppearance({ ...currentAppearance, ...palette, preset, enabled: true }));
    previewSoon();
  });
}

for (const control of appearanceControls()) {
  control.addEventListener("input", () => {
    currentAppearance = readAppearance();
    if (!["enabled", "nativeTheme"].includes(control.name)) currentAppearance.preset = "custom";
    updatePresetSelection();
    updateOutputs();
    previewSoon();
  });
}

document.querySelector("#choose-wallpaper")?.addEventListener("click", async () => {
  const fileName = await window.whatsappLinux.selectWallpaper();
  if (!fileName) return;
  renderAppearance({ ...readAppearance(), wallpaperFile: fileName, wallpaperMode: "image", enabled: true, preset: "custom" });
  previewSoon();
});

document.querySelector("#clear-wallpaper")?.addEventListener("click", async () => {
  await window.whatsappLinux.clearWallpaper();
  renderAppearance({ ...readAppearance(), wallpaperFile: "", wallpaperMode: "default", preset: "custom" });
  previewSoon();
});

document.querySelector("#reset-appearance")?.addEventListener("click", () => {
  renderAppearance(structuredClone(defaultAppearance));
  previewSoon();
});

document.querySelector("#export-theme")?.addEventListener("click", async () => {
  status.textContent = await window.whatsappLinux.exportAppearance(readAppearance()) ? "Theme exported" : "Export cancelled";
});

document.querySelector("#import-theme")?.addEventListener("click", async () => {
  try {
    const imported = await window.whatsappLinux.importAppearance();
    if (!imported) return;
    renderAppearance({ ...imported, preset: "custom" });
    previewSoon();
  } catch {
    status.textContent = "That theme file is not valid";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  previewRevision += 1;
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = undefined;
  }
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
  if (button) button.disabled = true;
  status.textContent = "Saving…";
  try {
    const updated = await window.whatsappLinux.saveSettings({
      closeBehavior: closeBehavior.value as "ask" | "tray" | "quit",
      launchAtLogin: launchAtLogin.checked,
      startHidden: startHidden.checked,
      spellcheck: spellcheck.checked,
      spellcheckLanguage: spellcheckLanguage.value || settings.spellcheckLanguage,
      appearance: readAppearance()
    });
    renderAppearance(updated.appearance);
    status.textContent = "All settings saved";
  } catch {
    status.textContent = "Could not save settings";
  } finally {
    if (button) button.disabled = false;
  }
});
