import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";

export function autostartPath(configHome: string): string {
  return join(configHome, "autostart", "whatsapp-linux.desktop");
}

function desktopEntry(executable: string, startHidden: boolean): string {
  const escaped = executable.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const hiddenArgument = startHidden ? " --hidden" : "";
  return `[Desktop Entry]\nType=Application\nName=WhatsApp Linux\nComment=Start WhatsApp Linux at login\nExec="${escaped}"${hiddenArgument}\nIcon=whatsapp-linux\nTerminal=false\nCategories=Network;Chat;\nX-GNOME-Autostart-enabled=true\n`;
}

export function setAutostart(enabled: boolean, startHidden: boolean, configHome: string): void {
  const path = autostartPath(configHome);
  if (!enabled) {
    rmSync(path, { force: true });
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  const executable = process.env.APPIMAGE ?? process.env.WHATSAPP_LINUX_EXECUTABLE ?? app.getPath("exe");
  writeFileSync(path, desktopEntry(executable, startHidden), { mode: 0o644 });
}
