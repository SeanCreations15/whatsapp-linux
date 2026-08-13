import { describe, expect, it } from "vitest";
import {
  extractDeepLink,
  isAllowedPermission,
  isDeepLink,
  isMainAppUrl,
  isSafeExternalUrl,
  isTrustedWhatsAppUrl,
  shouldHideOnClose,
  unreadCountFromTitle
} from "../../src/main/policies";

describe("navigation policy", () => {
  it.each([
    "https://web.whatsapp.com/",
    "https://call.whatsapp.com/example",
    "https://static.whatsapp.net/file"
  ])("trusts a WhatsApp-owned HTTPS URL: %s", (url) => expect(isTrustedWhatsAppUrl(url)).toBe(true));

  it.each([
    "http://web.whatsapp.com/",
    "https://whatsapp.com.example.org/",
    "javascript:alert(1)",
    "not a URL"
  ])("rejects an untrusted URL: %s", (url) => expect(isTrustedWhatsAppUrl(url)).toBe(false));

  it("only treats the exact web origin as the main app", () => {
    expect(isMainAppUrl("https://web.whatsapp.com/send?phone=1")).toBe(true);
    expect(isMainAppUrl("https://call.whatsapp.com/")).toBe(false);
  });

  it.each([
    ["https://example.com/", true],
    ["mailto:person@example.com", true],
    ["file:///etc/passwd", false],
    ["javascript:alert(1)", false]
  ])("classifies safe external URL %s", (url, expected) => {
    expect(isSafeExternalUrl(url)).toBe(expected);
  });
});

describe("permission policy", () => {
  it("allows expected permissions only for the main origin", () => {
    expect(isAllowedPermission("camera", "https://web.whatsapp.com/")).toBe(true);
    expect(isAllowedPermission("geolocation", "https://web.whatsapp.com/")).toBe(false);
    expect(isAllowedPermission("camera", "https://example.com/")).toBe(false);
  });
});

describe("deep links", () => {
  it("recognizes and extracts whatsapp protocol arguments", () => {
    expect(isDeepLink("whatsapp://send?phone=123")).toBe(true);
    expect(extractDeepLink(["electron", ".", "--hidden", "whatsapp://send?phone=123"])).toBe(
      "whatsapp://send?phone=123"
    );
  });

  it("rejects lookalike links", () => {
    expect(isDeepLink("https://whatsapp.example/")).toBe(false);
    expect(extractDeepLink(["electron", "."])).toBeUndefined();
  });
});

describe("desktop state helpers", () => {
  it.each([
    ["(12) WhatsApp", 12],
    ["(1) WhatsApp", 1],
    ["WhatsApp", 0],
    ["(x) WhatsApp", 0]
  ])("parses unread count from %s", (title, expected) => {
    expect(unreadCountFromTitle(title)).toBe(expected);
  });

  it("hides only for tray behavior outside explicit quit", () => {
    expect(shouldHideOnClose("tray", false)).toBe(true);
    expect(shouldHideOnClose("tray", true)).toBe(false);
    expect(shouldHideOnClose("ask", false)).toBe(false);
    expect(shouldHideOnClose("quit", false)).toBe(false);
  });
});
