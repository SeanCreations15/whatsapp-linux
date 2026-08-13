export {};

const retry = document.querySelector<HTMLButtonElement>("#retry");
const diagnose = document.querySelector<HTMLButtonElement>("#diagnose");
const status = document.querySelector<HTMLElement>("#status");
const output = document.querySelector<HTMLElement>("#diagnostics");

if (!retry || !diagnose || !status || !output) throw new Error("Error interface is incomplete");

retry.addEventListener("click", async () => {
  retry.disabled = true;
  status.textContent = "Connecting…";
  try {
    await window.whatsappLinux.retry();
  } catch {
    status.textContent = "Connection failed. Check diagnostics for details.";
    retry.disabled = false;
  }
});

diagnose.addEventListener("click", async () => {
  const details = await window.whatsappLinux.diagnostics();
  output.hidden = false;
  output.textContent = [
    `Network reported online: ${String(details.online)}`,
    `Platform: ${details.platform}`,
    `Electron: ${details.electron}`,
    `Last error: ${details.error || "Unknown"}`
  ].join("\n");
});
