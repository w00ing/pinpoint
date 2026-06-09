import { createPinpoint } from "../../core/index.js";

export const installBrowserPinpoint = () => {
  const picker = createPinpoint({
    copyText: async (text) => {
      await navigator.clipboard.writeText(text);
    },
    getWindowLabel: () => "browser",
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data !== "pinpoint:toggle") return;
    picker.toggle();
  });

  return picker;
};
