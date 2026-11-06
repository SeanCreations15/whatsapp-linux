import { describe, expect, it } from "vitest";
import { defaultSettings, mergeSettings, validateSettings } from "../../src/shared/settings";

describe("settings validation", () => {
  it("returns independent defaults for invalid input", () => {
    const result = validateSettings(null);
    expect(result).toEqual(defaultSettings);
    expect(result).not.toBe(defaultSettings);
  });

  it("migrates partial legacy settings and preserves valid fields", () => {
    expect(validateSettings({ closeBehavior: "tray", spellcheck: false })).toMatchObject({
      version: 2,
      closeBehavior: "tray",
      launchAtLogin: false,
      startHidden: false,
      spellcheck: false
    });
    expect(validateSettings({})).toMatchObject({ spellcheckLanguage: "en-GB" });
    expect(validateSettings({ spellcheckLanguage: "invalid-language" }).spellcheckLanguage).toBe("en-GB");
  });

  it("clamps unsafe window values", () => {
    const result = validateSettings({
      window: { width: 10, height: 20, x: 12.4, y: -20.6, zoomFactor: 99, maximized: true }
    });
    expect(result.window).toEqual({
      width: 600,
      height: 480,
      x: 12,
      y: -21,
      zoomFactor: 2,
      maximized: true
    });
  });

  it("merges a partial update without losing window state", () => {
    const result = mergeSettings(defaultSettings, {
      closeBehavior: "quit",
      window: { ...defaultSettings.window, width: 1400 }
    });
    expect(result.closeBehavior).toBe("quit");
    expect(result.window.width).toBe(1400);
    expect(result.window.height).toBe(800);
  });
});
