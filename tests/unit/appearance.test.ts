import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildAppearanceCss, sanitizeCustomCss, wallpaperDataUrl } from "../../src/main/appearance";
import { defaultAppearance, validateAppearance } from "../../src/shared/settings";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("appearance validation", () => {
  it("clamps every numeric customization and validates colours", () => {
    const result = validateAppearance({ fontScale: 99, sidebarWidth: 1, bubbleRadius: -5, accentColor: "red" });
    expect(result.fontScale).toBe(1.5);
    expect(result.sidebarWidth).toBe(260);
    expect(result.bubbleRadius).toBe(0);
    expect(result.accentColor).toBe(defaultAppearance.accentColor);
  });

  it("migrates saved themes into the new sidebar layers", () => {
    const result = validateAppearance({ sidebarBackground: "#112233", panelBackground: "#445566" });
    expect(result.sidebarHeaderBackground).toBe("#445566");
    expect(result.sidebarSearchBackground).toBe("#112233");
    expect(result.sidebarSearchInputBackground).toBe("#445566");
    expect(result.chatListBackground).toBe("#112233");
  });

  it("removes CSS constructs that can load remote resources", () => {
    const css = sanitizeCustomCss("@import 'https://tracker.test/x'; .x{background:url(https://tracker.test/i)} .y{color:red}");
    expect(css).not.toContain("@import");
    expect(css).not.toContain("tracker.test");
    expect(css).toContain(".y{color:red}");
  });
});

describe("appearance stylesheet", () => {
  it("does nothing when customization is disabled", () => {
    expect(buildAppearanceCss(defaultAppearance)).toBe("");
  });

  it("maps structured controls to WhatsApp design tokens", () => {
    const css = buildAppearanceCss({
      ...defaultAppearance,
      enabled: true,
      accentColor: "#112233",
      sidebarSearchBackground: "#223344",
      chatListBackground: "#334455",
      outgoingBubble: "#445566",
      fontFamily: "Noto Sans",
      reducedMotion: true
    });
    expect(css).toContain("--WDS-accent: #112233");
    expect(css).toContain("--WDS-accent-RGB: 17, 34, 51");
    expect(css).toContain("--WDS-systems-bubble-surface-outgoing: #445566");
    expect(css).toContain('[role="tablist"] { background-color: #223344ff');
    expect(css).toContain('[data-testid="cell-frame-container"] { background-color: #334455ff');
    expect(css).not.toContain('[data-testid="drawer-left"] { background');
    expect(css).toContain('div:has([data-testid="chat-list-search-container"])');
    expect(css).toContain('[data-testid="chat-list-search-container"] { margin-bottom: 0');
    expect(css).toContain('[data-testid="conversation-panel-wrapper"] footer { background-color: transparent');
    expect(css).toContain('[data-testid="compose-box"] div:has(> div > [data-testid="conversation-compose-box-input"]) { margin-block: 6px');
    expect(css).not.toContain('[data-testid="conversation-compose-box-input"] { min-height:');
    expect(css).toContain('font-family: "Noto Sans"');
    expect(css).toContain("animation-duration: .001ms");
  });

  it("only overrides the chat wallpaper when a custom mode is selected", () => {
    const original = buildAppearanceCss({ ...defaultAppearance, enabled: true });
    const gradient = buildAppearanceCss({ ...defaultAppearance, enabled: true, wallpaperMode: "gradient" });
    expect(original).not.toContain("conversation-panel-body\"]::after");
    expect(gradient).toContain("linear-gradient(135deg");
    expect(gradient).toContain("conversation-panel-body\"]::after");
  });
});

describe("wallpaper storage", () => {
  it("loads only a supported app-owned wallpaper file", () => {
    const directory = mkdtempSync(join(tmpdir(), "wa-wallpaper-test-"));
    directories.push(directory);
    writeFileSync(join(directory, "wallpaper.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const appearance = { ...defaultAppearance, wallpaperMode: "image" as const, wallpaperFile: "wallpaper.png" };
    expect(wallpaperDataUrl(appearance, directory)).toBe("data:image/png;base64,iVBORw==");
  });
});
