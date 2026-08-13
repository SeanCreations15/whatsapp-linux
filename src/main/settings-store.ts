import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AppSettings } from "../shared/settings";
import { defaultSettings, mergeSettings, validateSettings } from "../shared/settings";

export class SettingsStore {
  private settings: AppSettings;

  constructor(private readonly filePath: string) {
    this.settings = this.read();
  }

  get(): AppSettings {
    return structuredClone(this.settings);
  }

  update(patch: Partial<AppSettings>): AppSettings {
    this.settings = mergeSettings(this.settings, patch);
    this.write();
    return this.get();
  }

  private read(): AppSettings {
    try {
      return validateSettings(JSON.parse(readFileSync(this.filePath, "utf8")));
    } catch {
      return structuredClone(defaultSettings);
    }
  }

  private write(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(this.settings, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporaryPath, this.filePath);
  }
}
