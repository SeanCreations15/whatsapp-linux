import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  Menu,
  nativeImage,
  nativeTheme,
  session,
  shell,
  Tray
} from "electron";
import type { AppearanceSettings, AppSettings } from "../shared/settings";
import { validateAppearance } from "../shared/settings";
import { buildAppearanceCss, wallpaperDataUrl } from "./appearance";
import { setAutostart } from "./autostart";
import {
  chromeCompatibleUserAgent,
  extractDeepLink,
  isAllowedPermission,
  isDeepLink,
  isMainAppUrl,
  isSafeExternalUrl,
  isTrustedWhatsAppUrl,
  shouldHideOnClose,
  unreadCountFromTitle
} from "./policies";
import { SettingsStore } from "./settings-store";

const APP_URL = !app.isPackaged && process.env.WHATSAPP_LINUX_TEST_URL
  ? process.env.WHATSAPP_LINUX_TEST_URL
  : "https://web.whatsapp.com/";
const APP_ID = "whatsapp-linux";
const currentDirectory = fileURLToPath(new URL(".", import.meta.url));
const browserUserAgent = chromeCompatibleUserAgent(process.versions.chrome);

app.setName("WhatsApp Linux");
app.setDesktopName(`${APP_ID}.desktop`);
app.setAppUserModelId(APP_ID);
app.userAgentFallback = browserUserAgent;
app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let errorWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let store: SettingsStore;
let isQuitting = false;
let unreadCount = 0;
let lastLoadError = "";
let closePromptOpen = false;
const insertedAppearanceKeys = new Map<number, string>();
let previewAppearance: AppearanceSettings | null = null;

function rendererFile(name: "settings.html" | "error.html"): string {
  return join(currentDirectory, `../renderer/${name}`);
}

function assetPath(name: string): string {
  const packaged = join(process.resourcesPath, "assets", name);
  const development = join(app.getAppPath(), "assets", name);
  const system = join("/usr/share/icons/hicolor/512x512/apps", name === "icon.png" ? APP_ID + ".png" : name);
  if (app.isPackaged && existsSync(packaged)) return packaged;
  if (existsSync(development)) return development;
  return system;
}

function configHome(): string {
  return process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
}

function appearanceDirectory(): string {
  return join(app.getPath("userData"), "appearance");
}

async function applyAppearance(window: BrowserWindow, appearance = previewAppearance ?? store.get().appearance): Promise<void> {
  if (window.isDestroyed() || !isTrustedWhatsAppUrl(window.webContents.getURL())) return;
  const previousKey = insertedAppearanceKeys.get(window.webContents.id);
  if (previousKey) {
    await window.webContents.removeInsertedCSS(previousKey).catch(() => undefined);
    insertedAppearanceKeys.delete(window.webContents.id);
  }
  const css = buildAppearanceCss(appearance, wallpaperDataUrl(appearance, appearanceDirectory()));
  if (css) {
    const key = await window.webContents.insertCSS(css, { cssOrigin: "user" });
    insertedAppearanceKeys.set(window.webContents.id, key);
  }
}

function applyAppearanceToWhatsAppWindows(appearance: AppearanceSettings): void {
  nativeTheme.themeSource = appearance.nativeTheme;
  for (const window of BrowserWindow.getAllWindows()) void applyAppearance(window, appearance);
}

function showMainWindow(): void {
  if (errorWindow) {
    errorWindow.show();
    errorWindow.focus();
    return;
  }
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function deepLinkToWeb(link: string): string | undefined {
  if (!isDeepLink(link)) return undefined;
  const url = new URL(link);
  const route = [url.hostname, url.pathname.replace(/^\//, "")].filter(Boolean).join("/");
  return `https://web.whatsapp.com/${route}${url.search}${url.hash}`;
}

async function handleDeepLink(link: string): Promise<void> {
  const target = deepLinkToWeb(link);
  if (!target || !mainWindow) return;
  showMainWindow();
  await mainWindow.loadURL(target);
}

function updateTrayMenu(): void {
  if (!tray) return;
  tray.setToolTip(unreadCount > 0 ? `WhatsApp Linux — ${unreadCount} unread` : "WhatsApp Linux");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open WhatsApp Linux", click: showMainWindow },
      { label: unreadCount > 0 ? `${unreadCount} unread messages` : "No unread messages", enabled: false },
      { type: "separator" },
      { label: "Settings", click: openSettingsWindow },
      { label: "Reload", click: () => void loadWhatsApp() },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
}

function createTray(): void {
  const image = nativeImage.createFromPath(assetPath("icon.png")).resize({ width: 22, height: 22 });
  tray = new Tray(image);
  tray.on("click", showMainWindow);
  updateTrayMenu();
}

async function chooseCloseBehavior(event: Electron.Event): Promise<void> {
  event.preventDefault();
  if (!mainWindow || closePromptOpen) return;
  closePromptOpen = true;
  const testResponse = !app.isPackaged ? Number(process.env.WHATSAPP_LINUX_TEST_CLOSE_RESPONSE) : Number.NaN;
  const result = Number.isInteger(testResponse)
    ? { response: testResponse }
    : await dialog.showMessageBox(mainWindow, {
        type: "question",
        title: "Keep WhatsApp Linux running?",
        message: "What should the close button do?",
        detail: "You can change this later in Settings.",
        buttons: ["Hide to tray", "Quit", "Cancel"],
        defaultId: 0,
        cancelId: 2,
        noLink: true
      });
  if (result.response === 0) {
    store.update({ closeBehavior: "tray" });
    mainWindow.hide();
  } else if (result.response === 1) {
    store.update({ closeBehavior: "quit" });
    isQuitting = true;
    app.quit();
  }
  closePromptOpen = false;
}

function attachNavigationPolicy(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isTrustedWhatsAppUrl(url)) {
      if (isSafeExternalUrl(url)) void shell.openExternal(url);
      return { action: "deny" };
    }
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
          spellcheck: true,
          partition: "persist:whatsapp-linux"
        }
      }
    };
  });
  window.webContents.on("did-create-window", (childWindow) => {
    attachNavigationPolicy(childWindow);
    attachSpellcheckMenu(childWindow);
    childWindow.webContents.on("did-finish-load", () => void applyAppearance(childWindow));
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isMainAppUrl(url)) {
      event.preventDefault();
      if (isTrustedWhatsAppUrl(url)) void window.loadURL(url);
      else if (isSafeExternalUrl(url)) void shell.openExternal(url);
    }
  });
}

function attachSpellcheckMenu(window: BrowserWindow): void {
  window.webContents.on("context-menu", (_event, params) => {
    if (!params.isEditable) return;
    const menuItems: Electron.MenuItemConstructorOptions[] = [];
    if (window.webContents.session.isSpellCheckerEnabled() && params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions) {
        menuItems.push({
          label: suggestion,
          click: () => window.webContents.replaceMisspelling(suggestion)
        });
      }
      if (params.dictionarySuggestions.length === 0) {
        menuItems.push({ label: "No spelling suggestions", enabled: false });
      }
      menuItems.push({
        label: "Add to dictionary",
        click: () => window.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      });
      menuItems.push({ type: "separator" });
    }
    menuItems.push(
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" }
    );
    Menu.buildFromTemplate(menuItems).popup({ window });
  });
}

function attachLocalWindowPolicy(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:")) event.preventDefault();
  });
}

function requireLocalUi(event: IpcMainInvokeEvent): void {
  if (!event.senderFrame?.url.startsWith("file:")) throw new Error("Local UI access required");
}

async function showLoadError(errorDescription: string): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  lastLoadError = errorDescription;
  mainWindow.hide();
  if (errorWindow) {
    errorWindow.show();
    return;
  }
  errorWindow = new BrowserWindow({
    title: "WhatsApp Linux — Connection problem",
    icon: assetPath("icon.png"),
    width: 620,
    height: 520,
    minWidth: 520,
    minHeight: 460,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(currentDirectory, "../preload/settings.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  errorWindow.on("closed", () => {
    errorWindow = null;
  });
  attachLocalWindowPolicy(errorWindow);
  await errorWindow.loadFile(rendererFile("error.html"));
}

async function loadWhatsApp(): Promise<void> {
  if (!mainWindow) return;
  try {
    await mainWindow.loadURL(APP_URL);
    errorWindow?.destroy();
    errorWindow = null;
    showMainWindow();
  } catch (error) {
    await showLoadError(error instanceof Error ? error.message : String(error));
  }
}

function createMainWindow(initialUrl = APP_URL): void {
  const settings = store.get();
  mainWindow = new BrowserWindow({
    title: "WhatsApp Linux",
    icon: assetPath("icon.png"),
    width: settings.window.width,
    height: settings.window.height,
    ...(settings.window.x === undefined ? {} : { x: settings.window.x }),
    ...(settings.window.y === undefined ? {} : { y: settings.window.y }),
    minWidth: 600,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#111b21",
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
      partition: "persist:whatsapp-linux"
    }
  });
  if (settings.window.maximized) mainWindow.maximize();
  mainWindow.webContents.setZoomFactor(settings.window.zoomFactor);
  attachNavigationPolicy(mainWindow);
  attachSpellcheckMenu(mainWindow);
  mainWindow.once("ready-to-show", () => {
    if (!process.argv.includes("--hidden")) showMainWindow();
  });
  mainWindow.on("close", (event) => {
    const behavior = store.get().closeBehavior;
    if (behavior === "ask" && !isQuitting) {
      void chooseCloseBehavior(event);
    } else if (shouldHideOnClose(behavior, isQuitting)) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  let saveTimer: NodeJS.Timeout | undefined;
  const saveWindowState = (): void => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const bounds = mainWindow.getNormalBounds();
      store.update({
        window: {
          ...bounds,
          maximized: mainWindow.isMaximized(),
          zoomFactor: mainWindow.webContents.getZoomFactor()
        }
      });
    }, 250);
  };
  mainWindow.on("resize", saveWindowState);
  mainWindow.on("move", saveWindowState);
  mainWindow.on("maximize", saveWindowState);
  mainWindow.on("unmaximize", saveWindowState);
  mainWindow.webContents.on("page-title-updated", (_event, title) => {
    unreadCount = unreadCountFromTitle(title);
    updateTrayMenu();
  });
  mainWindow.webContents.on("did-finish-load", () => void applyAppearance(mainWindow as BrowserWindow));
  mainWindow.webContents.on("zoom-changed", () => {
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      store.update({
        window: { ...store.get().window, zoomFactor: mainWindow.webContents.getZoomFactor() }
      });
    }, 0);
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && url.startsWith("https://")) void showLoadError(description);
  });
  void mainWindow.loadURL(initialUrl).catch((error: unknown) =>
    showLoadError(error instanceof Error ? error.message : String(error))
  );
}

function openSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    ...(mainWindow ? { parent: mainWindow } : {}),
    title: "WhatsApp Linux Settings",
    width: 1040,
    height: 820,
    minWidth: 820,
    minHeight: 650,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(currentDirectory, "../preload/settings.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  attachLocalWindowPolicy(settingsWindow);
  void settingsWindow.loadFile(rendererFile("settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
    previewAppearance = null;
    applyAppearanceToWhatsAppWindows(store.get().appearance);
  });
}

function configureSession(): void {
  const appSession = session.fromPartition("persist:whatsapp-linux");
  appSession.setUserAgent(browserUserAgent);
  configureSpellChecker();
  appSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) =>
    isAllowedPermission(permission, requestingOrigin)
  );
  appSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    callback(isAllowedPermission(permission, details.requestingUrl || webContents.getURL()));
  });
  appSession.setDisplayMediaRequestHandler(async (request, callback) => {
    const isWayland = process.env.XDG_SESSION_TYPE === "wayland" || Boolean(process.env.WAYLAND_DISPLAY);
    if (!isWayland || !isMainAppUrl(request.securityOrigin) || !request.userGesture) {
      callback({});
      return;
    }
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen", "window"] });
      const source = sources[0];
      callback(source ? { video: source } : {});
    } catch {
      callback({});
    }
  });
}

function configureSpellChecker(): void {
  const appSession = session.fromPartition("persist:whatsapp-linux");
  const preferred = store.get().spellcheckLanguage;
  const available = appSession.availableSpellCheckerLanguages;
  const language = [preferred, "en-GB", "en-US"].find((candidate) => available.includes(candidate));
  if (language) appSession.setSpellCheckerLanguages([language]);
  appSession.setSpellCheckerEnabled(store.get().spellcheck);
}

function registerIpc(): void {
  ipcMain.handle("settings:get", (event) => {
    requireLocalUi(event);
    return store.get();
  });
  ipcMain.handle("spellcheck:languages", (event) => {
    requireLocalUi(event);
    return session.fromPartition("persist:whatsapp-linux").availableSpellCheckerLanguages;
  });
  ipcMain.handle("settings:save", (event, patch: Partial<AppSettings>) => {
    requireLocalUi(event);
    const updated = store.update(patch);
    configureSpellChecker();
    setAutostart(updated.launchAtLogin, updated.startHidden, configHome());
    previewAppearance = null;
    applyAppearanceToWhatsAppWindows(updated.appearance);
    return updated;
  });
  ipcMain.handle("appearance:preview", (event, appearance: AppearanceSettings) => {
    requireLocalUi(event);
    const validated = validateAppearance(appearance);
    previewAppearance = validated;
    applyAppearanceToWhatsAppWindows(validated);
    return validated;
  });
  ipcMain.handle("appearance:select-wallpaper", async (event) => {
    requireLocalUi(event);
    const options: Electron.OpenDialogOptions = {
      title: "Choose a chat wallpaper",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
    };
    const result = settingsWindow ? await dialog.showOpenDialog(settingsWindow, options) : await dialog.showOpenDialog(options);
    const selected = result.filePaths[0];
    if (result.canceled || !selected) return "";
    const extension = selected.toLowerCase().match(/\.(png|jpe?g|webp|gif)$/)?.[0];
    if (!extension) return "";
    mkdirSync(appearanceDirectory(), { recursive: true });
    const fileName = `wallpaper${extension}`;
    copyFileSync(selected, join(appearanceDirectory(), fileName));
    return fileName;
  });
  ipcMain.handle("appearance:clear-wallpaper", (event) => {
    requireLocalUi(event);
    const current = store.get().appearance.wallpaperFile;
    if (current) rmSync(join(appearanceDirectory(), current), { force: true });
  });
  ipcMain.handle("appearance:export", async (event, appearance: AppearanceSettings) => {
    requireLocalUi(event);
    const options: Electron.SaveDialogOptions = {
      title: "Export appearance theme",
      defaultPath: "whatsapp-linux-theme.json",
      filters: [{ name: "WhatsApp Linux theme", extensions: ["json"] }]
    };
    const result = settingsWindow ? await dialog.showSaveDialog(settingsWindow, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return false;
    writeFileSync(result.filePath, `${JSON.stringify(validateAppearance(appearance), null, 2)}\n`, { mode: 0o600 });
    return true;
  });
  ipcMain.handle("appearance:import", async (event) => {
    requireLocalUi(event);
    const options: Electron.OpenDialogOptions = {
      title: "Import appearance theme",
      properties: ["openFile"],
      filters: [{ name: "WhatsApp Linux theme", extensions: ["json"] }]
    };
    const result = settingsWindow ? await dialog.showOpenDialog(settingsWindow, options) : await dialog.showOpenDialog(options);
    const selected = result.filePaths[0];
    if (result.canceled || !selected) return undefined;
    return validateAppearance(JSON.parse(readFileSync(selected, "utf8")) as unknown);
  });
  ipcMain.handle("app:retry", (event) => {
    requireLocalUi(event);
    return loadWhatsApp();
  });
  ipcMain.handle("app:diagnostics", async (event) => {
    requireLocalUi(event);
    const onlineResult: unknown = errorWindow
      ? await errorWindow.webContents.executeJavaScript("navigator.onLine", true)
      : false;
    return {
      error: lastLoadError,
      online: onlineResult === true,
      platform: process.platform,
      electron: process.versions.electron
    };
  });
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const link = extractDeepLink(argv);
    if (link) void handleDeepLink(link);
    else showMainWindow();
  });
  app.on("open-url", (event, url) => {
    event.preventDefault();
    void handleDeepLink(url);
  });
  void app.whenReady().then(() => {
    store = new SettingsStore(join(app.getPath("userData"), "settings.json"));
    nativeTheme.themeSource = store.get().appearance.nativeTheme;
    app.setAsDefaultProtocolClient("whatsapp");
    registerIpc();
    configureSession();
    createTray();
    const initialLink = extractDeepLink(process.argv);
    createMainWindow(initialLink ? (deepLinkToWeb(initialLink) ?? APP_URL) : APP_URL);
    if (process.argv.includes("--settings")) openSettingsWindow();
  });
  app.on("before-quit", () => {
    isQuitting = true;
  });
  app.on("window-all-closed", () => {
    // The tray owns the application lifecycle on Linux.
  });
}
