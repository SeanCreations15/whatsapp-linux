export {};

const form = document.querySelector<HTMLFormElement>("#settings-form");
const closeBehavior = document.querySelector<HTMLSelectElement>("#close-behavior");
const launchAtLogin = document.querySelector<HTMLInputElement>("#launch-at-login");
const startHidden = document.querySelector<HTMLInputElement>("#start-hidden");
const spellcheck = document.querySelector<HTMLInputElement>("#spellcheck");
const status = document.querySelector<HTMLElement>("#status");

if (!form || !closeBehavior || !launchAtLogin || !startHidden || !spellcheck || !status) {
  throw new Error("Settings interface is incomplete");
}

const settings = await window.whatsappLinux.getSettings();
closeBehavior.value = settings.closeBehavior;
launchAtLogin.checked = settings.launchAtLogin;
startHidden.checked = settings.startHidden;
spellcheck.checked = settings.spellcheck;
startHidden.disabled = !launchAtLogin.checked;

launchAtLogin.addEventListener("change", () => {
  startHidden.disabled = !launchAtLogin.checked;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
  if (button) button.disabled = true;
  status.textContent = "Saving…";
  try {
    await window.whatsappLinux.saveSettings({
      closeBehavior: closeBehavior.value as "ask" | "tray" | "quit",
      launchAtLogin: launchAtLogin.checked,
      startHidden: startHidden.checked,
      spellcheck: spellcheck.checked
    });
    status.textContent = "Saved";
  } catch {
    status.textContent = "Could not save settings";
  } finally {
    if (button) button.disabled = false;
  }
});
