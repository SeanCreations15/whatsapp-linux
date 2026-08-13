const APP_ORIGIN = "https://web.whatsapp.com";
const TRUSTED_HOST_SUFFIXES = [".whatsapp.com", ".whatsapp.net"];

export function chromeCompatibleUserAgent(chromeVersion: string): string {
  const version = /^\d+(?:\.\d+){0,3}$/.test(chromeVersion) ? chromeVersion : "150.0.0.0";
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}

export function isTrustedWhatsAppUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    return (
      url.hostname === "whatsapp.com" ||
      url.hostname === "whatsapp.net" ||
      TRUSTED_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
}

export function isMainAppUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

export function isDeepLink(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).protocol === "whatsapp:";
  } catch {
    return false;
  }
}

export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(rawUrl).protocol);
  } catch {
    return false;
  }
}

export type MediaPermission = "media" | "microphone" | "camera" | "display-capture";

export function isAllowedPermission(permission: string, requestingUrl: string): boolean {
  return (
    isMainAppUrl(requestingUrl) &&
    ["media", "microphone", "camera", "display-capture", "notifications", "clipboard-sanitized-write"].includes(
      permission
    )
  );
}

export function extractDeepLink(argv: readonly string[]): string | undefined {
  return argv.find((argument) => isDeepLink(argument));
}

export function unreadCountFromTitle(title: string): number {
  const match = /^\((\d+)\)/.exec(title.trim());
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

export function shouldHideOnClose(
  behavior: "ask" | "tray" | "quit",
  quitting: boolean
): boolean {
  return !quitting && behavior === "tray";
}
