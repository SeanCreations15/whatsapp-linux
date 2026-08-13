import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsStore } from "../../src/main/settings-store";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { force: true, recursive: true });
});

function temporaryFile(): string {
  const directory = mkdtempSync(join(tmpdir(), "whatsapp-linux-test-"));
  directories.push(directory);
  return join(directory, "settings.json");
}

describe("SettingsStore", () => {
  it("recovers from malformed JSON", () => {
    const path = temporaryFile();
    writeFileSync(path, "not json");
    expect(new SettingsStore(path).get().closeBehavior).toBe("ask");
  });

  it("writes validated preferences atomically", () => {
    const path = temporaryFile();
    const store = new SettingsStore(path);
    store.update({ closeBehavior: "tray", launchAtLogin: true });
    expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
      closeBehavior: "tray",
      launchAtLogin: true
    });
  });
});
