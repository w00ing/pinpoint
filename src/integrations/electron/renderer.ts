import { createPinpoint } from "../../core/index.js";
import type { ElectronPinpointApi } from "./channels.js";

declare global {
  interface Window {
    readonly pinpoint?: ElectronPinpointApi;
  }
}

export type ElectronPinpointRendererOptions = {
  readonly windowLabel?: string;
};

const getElectronWindowType = () => {
  const candidate = window as Window & { electron?: { context?: { windowType?: string } } };
  return candidate.electron?.context?.windowType ?? null;
};

export const installElectronPinpoint = (options: ElectronPinpointRendererOptions = {}) => {
  const api = window.pinpoint;
  if (!api) {
    return () => undefined;
  }

  const picker = createPinpoint({
    copyText: api.copyText,
    getWindowLabel: () => options.windowLabel ?? getElectronWindowType(),
  });
  const unsubscribe = api.onToggle(() => {
    picker.toggle();
  });

  return () => {
    unsubscribe();
    picker.stop();
  };
};
