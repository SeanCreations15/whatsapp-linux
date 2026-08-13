import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";
import type { ElectronApplication } from "playwright";

let server: Server;
let fixtureUrl: string;
let userDataDirectory: string;
let electronApp: ElectronApplication | undefined;

async function stopElectronApp(): Promise<void> {
  const runningApp = electronApp;
  electronApp = undefined;
  if (!runningApp) return;

  const child = runningApp.process();
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => {
    const forceExit = setTimeout(() => {
      child.kill();
      resolve();
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(forceExit);
      resolve();
    });
  });
  await runningApp.evaluate(({ app }) => app.exit(0)).catch(() => undefined);
  await exited;
}

test.beforeAll(async () => {
  const fixture = readFileSync(join(process.cwd(), "tests/fixtures/app.html"));
  server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fixture);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture server did not bind");
  fixtureUrl = `http://127.0.0.1:${address.port}/`;
});

test.beforeEach(async () => {
  userDataDirectory = await mkdtemp(join(tmpdir(), "whatsapp-linux-e2e-"));
  const environment: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
  environment.WHATSAPP_LINUX_TEST_URL = fixtureUrl;
  environment.WHATSAPP_LINUX_TEST_CLOSE_RESPONSE = "0";
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.ELECTRON_NO_ATTACH_CONSOLE;
  electronApp = await electron.launch({
    args: [".", `--user-data-dir=${userDataDirectory}`],
    env: environment
  });
});

test.afterEach(async () => {
  await stopElectronApp();
  await rm(userDataDirectory, { recursive: true, force: true });
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("loads a local app fixture and tracks its title", async () => {
  if (!electronApp) throw new Error("Electron did not start");
  const window = await electronApp.firstWindow();
  await expect(window.locator("#ready")).toHaveText("Local integration fixture is ready.");
  await expect(window).toHaveTitle("(3) WhatsApp fixture");
});

test("keeps Node and the local preload API out of remote content", async () => {
  if (!electronApp) throw new Error("Electron did not start");
  const page = await electronApp.firstWindow();
  await expect(page.locator("#ready")).toBeVisible();
  expect(await page.evaluate(() => typeof (globalThis as { require?: unknown }).require)).toBe("undefined");
  expect(await page.evaluate(() => typeof (globalThis as { whatsappLinux?: unknown }).whatsappLinux)).toBe("undefined");
  const userAgent = await page.evaluate(() => navigator.userAgent);
  expect(userAgent).toContain("Chrome/150.0.7871.224");
  expect(userAgent).not.toContain("Electron");
});

test("denies unsafe popup protocols", async () => {
  if (!electronApp) throw new Error("Electron did not start");
  const page = await electronApp.firstWindow();
  await page.locator("#unsafe-popup").click();
  await page.waitForTimeout(100);
  expect(electronApp.windows()).toHaveLength(1);
});

test("applies and persists the first-close tray choice", async () => {
  if (!electronApp) throw new Error("Electron did not start");
  const page = await electronApp.firstWindow();
  await expect(page.locator("#ready")).toBeVisible();
  const settingsPath = await electronApp.evaluate(({ app }) => `${app.getPath("userData")}/settings.json`);
  await electronApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.close();
  });
  await expect.poll(() => electronApp?.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.isVisible()
  )).toBe(false);
  expect(JSON.parse(readFileSync(settingsPath, "utf8"))).toMatchObject({ closeBehavior: "tray" });
});

test("shows local recovery UI when the remote application cannot load", async () => {
  await stopElectronApp();
  const environment: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.ELECTRON_NO_ATTACH_CONSOLE;
  environment.WHATSAPP_LINUX_TEST_URL = "http://127.0.0.1:1/unavailable";
  electronApp = await electron.launch({
    args: [".", `--user-data-dir=${userDataDirectory}`],
    env: environment
  });
  await expect.poll(() => electronApp?.windows().length).toBe(2);
  const page = electronApp.windows().at(-1);
  if (!page) throw new Error("Recovery window did not open");
  await expect(page.getByRole("heading", { name: "Unable to reach WhatsApp" })).toBeVisible();
  expect(await page.evaluate(() => ({
    api: typeof (globalThis as { whatsappLinux?: unknown }).whatsappLinux,
    url: globalThis.location.href
  }))).toEqual({ api: "object", url: expect.stringContaining("error.html") });
  await page.getByRole("button", { name: "Show diagnostics" }).click();
  await expect(page.locator("#diagnostics")).toContainText("Last error:");
});

test("previews and saves an appearance preset from Settings", async () => {
  await stopElectronApp();
  const environment: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.ELECTRON_NO_ATTACH_CONSOLE;
  environment.WHATSAPP_LINUX_TEST_URL = fixtureUrl;
  electronApp = await electron.launch({
    args: [".", `--user-data-dir=${userDataDirectory}`, "--settings"],
    env: environment
  });
  await expect.poll(() => electronApp?.windows().length).toBe(2);
  const page = electronApp.windows().find((window) => window.url().includes("settings.html"));
  if (!page) throw new Error("Settings window did not open");
  await page.getByRole("button", { name: "Themes" }).click();
  await page.getByRole("button", { name: /Midnight/ }).click();
  await expect(page.locator('input[name="accentColor"]')).toHaveValue("#53bdeb");
  await expect(page.locator('input[name="enabled"]')).toBeChecked();
  await page.getByRole("button", { name: "Save all settings" }).click();
  await expect(page.locator("#status")).toHaveText("All settings saved");
  const settingsPath = await electronApp.evaluate(({ app }) => `${app.getPath("userData")}/settings.json`);
  expect(JSON.parse(readFileSync(settingsPath, "utf8"))).toMatchObject({
    version: 2,
    appearance: { enabled: true, preset: "midnight", accentColor: "#53bdeb" }
  });
});
