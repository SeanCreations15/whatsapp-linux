import { extname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { AppearanceSettings } from "../shared/settings";
import { validateAppearance } from "../shared/settings";

function rgb(hex: string): string {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)).join(", ");
}

function cssString(value: string): string {
  return JSON.stringify(value);
}

export function sanitizeCustomCss(css: string): string {
  return css
    .slice(0, 50_000)
    .replace(/@import[^;]*;?/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none");
}

export function wallpaperDataUrl(appearance: AppearanceSettings, appearanceDirectory: string): string | undefined {
  if (appearance.wallpaperMode !== "image" || !appearance.wallpaperFile) return undefined;
  const path = join(appearanceDirectory, appearance.wallpaperFile);
  if (!existsSync(path)) return undefined;
  const mime = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" } as Record<string, string>)[extname(path).toLowerCase()];
  if (!mime) return undefined;
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

export function buildAppearanceCss(value: AppearanceSettings, imageDataUrl?: string): string {
  const a = validateAppearance(value);
  if (!a.enabled) return "";
  const font = a.customFontFamily.trim() || a.fontFamily;
  const wallpaper = a.wallpaperMode === "image" && imageDataUrl
    ? `url(${cssString(imageDataUrl)})`
    : a.wallpaperMode === "gradient"
      ? `linear-gradient(${a.gradientAngle}deg, ${a.gradientStart}, ${a.gradientEnd})`
      : a.wallpaperMode === "solid" ? `linear-gradient(${a.wallpaperColor}, ${a.wallpaperColor})` : "none";
  const wallpaperSize = a.wallpaperSize === "tile" ? "auto" : a.wallpaperSize;
  const panelAlpha = a.translucentPanels ? "d9" : "ff";
  const contrast = a.highContrast ? "contrast(1.18)" : "none";
  const customCss = sanitizeCustomCss(a.customCss);
  const wallpaperRules = a.wallpaperMode === "default" ? "" : `
[data-testid="conversation-panel-body"], [data-testid="conversation-panel-messages"] { position: relative; overflow: hidden; background: ${a.wallpaperColor} !important; }
[data-testid="conversation-panel-body"]::after, [data-testid="conversation-panel-messages"]::after {
  content: ""; position: absolute; z-index: 0; inset: -${a.wallpaperBlur * 2}px; pointer-events: none;
  background-color: rgba(${rgb(a.wallpaperOverlay)}, ${a.wallpaperOverlayOpacity}); background-image: ${wallpaper} !important;
  background-size: ${wallpaperSize} !important; background-position: ${a.wallpaperPosition} !important;
  background-repeat: ${a.wallpaperSize === "tile" ? "repeat" : "no-repeat"} !important;
  background-blend-mode: normal; opacity: ${a.wallpaperOpacity}; filter: blur(${a.wallpaperBlur}px);
}
[data-testid="conversation-panel-body"] > *, [data-testid="conversation-panel-messages"] > * { position: relative; z-index: 1; }`;

  return `
:root {
  --WAL-accent: ${a.accentColor}; --WAL-wallpaper: ${wallpaper};
  --WDS-accent: ${a.accentColor}; --WDS-accent-RGB: ${rgb(a.accentColor)};
  --WDS-secondary-positive: ${a.accentColor}; --WDS-secondary-positive-RGB: ${rgb(a.accentColor)};
  --icon-primary: ${a.accentColor}; --icon-high-emphasis: ${a.accentColor}; --text-action: ${a.linkColor};
  --app-background: ${a.appBackground}; --background-default: ${a.appBackground}; --background-default-rgb: ${rgb(a.appBackground)};
  --app-background-deeper: ${a.borderColor}; --splashscreen-startup-background: ${a.appBackground};
  --splashscreen-startup-background-rgb: ${rgb(a.appBackground)}; --splashscreen-primary-title: ${a.primaryText};
  --splashscreen-secondary-lighter: ${a.secondaryText}; --splashscreen-progress-primary: ${a.accentColor};
  --WDS-surface-default: ${a.appBackground}; --WDS-surface-default-RGB: ${rgb(a.appBackground)};
  --WDS-background-wash-plain: ${a.appBackground}; --WDS-background-wash-plain-RGB: ${rgb(a.appBackground)};
  --WDS-background-elevated-wash-plain: ${a.appBackground}; --WDS-background-elevated-wash-plain-RGB: ${rgb(a.appBackground)};
  --panel-background: ${a.sidebarBackground}; --panel-background-rgb: ${rgb(a.sidebarBackground)};
  --panel-background-deep: ${a.panelBackground}; --picker-background: ${a.panelBackground};
  --navbar-background: ${a.panelBackground}; --WDS-components-surface-nav-bar: ${a.panelBackground};
  --WDS-components-surface-nav-bar-RGB: ${rgb(a.panelBackground)}; --WDS-surface-emphasized: ${a.panelBackground};
  --WDS-surface-elevated-emphasized: ${a.panelBackground}; --WDS-systems-chat-surface-tray: ${a.panelBackground};
  --WDS-background-wash-inset: ${a.panelBackground}; --WDS-background-wash-inset-RGB: ${rgb(a.panelBackground)};
  --WDS-background-elevated-wash-inset: ${a.panelBackground}; --WDS-background-elevated-wash-inset-RGB: ${rgb(a.panelBackground)};
  --WDS-systems-chat-surface-composer: ${a.composerBackground}; --WDS-systems-chat-surface-composer-RGB: ${rgb(a.composerBackground)};
  --panel-input-background: ${a.composerBackground}; --compose-panel-background-hover: ${a.panelBackground};
  --incoming-background: ${a.incomingBubble}; --WDS-systems-bubble-surface-incoming: ${a.incomingBubble};
  --WDS-systems-bubble-surface-incoming-RGB: ${rgb(a.incomingBubble)};
  --outgoing-background: ${a.outgoingBubble}; --WDS-systems-bubble-surface-outgoing: ${a.outgoingBubble};
  --WDS-systems-bubble-surface-outgoing-RGB: ${rgb(a.outgoingBubble)};
  --primary: ${a.primaryText}; --primary-strong: ${a.primaryText}; --primary-stronger: ${a.primaryText};
  --primary-rgb: ${rgb(a.primaryText)}; --primary-strong-rgb: ${rgb(a.primaryText)}; --primary-stronger-rgb: ${rgb(a.primaryText)};
  --message-primary: ${a.primaryText}; --text-primary-strong: ${a.primaryText}; --secondary: ${a.secondaryText};
  --message-primary-rgb: ${rgb(a.primaryText)}; --icon: ${a.secondaryText}; --icon-strong: ${a.secondaryText};
  --primary-muted: ${a.secondaryText}; --text-muted: ${a.secondaryText}; --border-deeper: ${a.borderColor};
  --WDS-systems-chat-background-wallpaper: ${a.wallpaperColor}; --WDS-systems-chat-background-wallpaper-RGB: ${rgb(a.wallpaperColor)};
  --radius-app: ${a.controlRadius}px; --border-bubble: ${a.borderColor};
}
html, body, #app { font-family: ${cssString(font)}, system-ui, sans-serif !important; font-size: ${a.fontScale * 100}% !important; filter: ${contrast}; }
body, button, input, textarea, select { font-family: inherit !important; letter-spacing: ${a.letterSpacing}px !important; }
body { line-height: ${a.lineHeight} !important; font-weight: ${a.fontWeight}; background: ${a.appBackground} !important; }
::selection { background: ${a.selectionColor} !important; color: ${a.primaryText} !important; }
a { color: ${a.linkColor} !important; text-decoration: ${a.underlineLinks ? "underline" : "inherit"} !important; }
${wallpaperRules}
${a.hideWallpaperPattern ? "[data-testid=\"conversation-panel-body\"]::before { display: none !important; }" : ""}
[data-testid="cell-frame-container"], [role="listitem"] { min-height: calc(72px * ${a.density}) !important; }
[data-testid="msg-container"] { margin-block: ${a.bubbleSpacing}px !important; max-width: ${a.messageWidth}% !important; }
[data-testid="msg-container"] > div, [data-testid="msg-container"] [class*="copyable"] {
  border-radius: ${a.bubbleRadius}px !important; border-width: ${a.borderWidth}px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,${a.shadowStrength / 100}) !important;
}
button, input, textarea, [role="button"], [role="dialog"] { border-radius: ${a.controlRadius}px !important; }
img[draggable="false"], [data-testid*="avatar"] img { border-radius: ${a.avatarRadius}% !important; filter: ${a.grayscaleAvatars ? "grayscale(1)" : "none"}; }
[data-icon] { ${a.monochromeIcons ? `filter: grayscale(1); color: ${a.accentColor} !important;` : ""} }
[data-testid="wa-web-main-screen"] > div > div:has([data-testid="chat-list-search-container"]) {
  flex: 0 0 ${a.sidebarWidth}px !important; width: ${a.sidebarWidth}px !important;
  min-width: ${a.sidebarWidth}px !important; max-width: ${a.sidebarWidth}px !important;
}
[data-testid="drawer-left"] { width: ${a.sidebarWidth}px !important; min-width: ${a.sidebarWidth}px !important; max-width: ${a.sidebarWidth}px !important; }
[data-testid="chatlist-header"] { background-color: ${a.sidebarHeaderBackground}${panelAlpha} !important; backdrop-filter: blur(${a.panelBlur}px); }
[data-testid="chat-list-search-container"], [role="tablist"] { background-color: ${a.sidebarSearchBackground}${panelAlpha} !important; backdrop-filter: blur(${a.panelBlur}px); }
[data-testid="chat-list-search-container"] { margin-bottom: 0 !important; }
[data-testid="chat-list-search-container"] div:has(> div > input[role="textbox"]),
[data-testid="chat-list-search-container"] div:has(> input[role="textbox"]) { background-color: ${a.sidebarSearchInputBackground} !important; }
[data-testid="chat-list"], [data-testid="cell-frame-container"] { background-color: ${a.chatListBackground}${panelAlpha} !important; backdrop-filter: blur(${a.panelBlur}px); }
header:not([data-testid="chatlist-header"]) { background-color: ${a.panelBackground}${panelAlpha} !important; backdrop-filter: blur(${a.panelBlur}px); }
[data-testid="conversation-panel-wrapper"] footer { background-color: transparent !important; backdrop-filter: none; }
[data-testid="compose-box"] div:has(> div > [data-testid="conversation-compose-box-input"]) { margin-block: 6px !important; }
${a.customScrollbars ? `* { scrollbar-color: ${a.secondaryText} transparent; scrollbar-width: auto; } ::-webkit-scrollbar { width: ${a.scrollbarWidth}px; height: ${a.scrollbarWidth}px; } ::-webkit-scrollbar-thumb { background: ${a.secondaryText}; border-radius: 999px; } ::-webkit-scrollbar-track { background: transparent; }` : ""}
${a.reducedMotion ? "*, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }" : ""}
${customCss}
`;
}
