import electron from "electron";
import type { ElectronPinpointApi } from "./channels.js";
import { PINPOINT_COPY_CHANNEL, PINPOINT_TOGGLE_CHANNEL } from "./channels.js";

const { contextBridge, ipcRenderer } = electron as typeof import("electron");

export const exposeElectronPinpointPreload = () => {
  const api: ElectronPinpointApi = {
    copyText: async (text) => {
      await ipcRenderer.invoke(PINPOINT_COPY_CHANNEL, text);
    },
    onToggle: (listener) => {
      const handleToggle = () => {
        listener();
      };
      ipcRenderer.on(PINPOINT_TOGGLE_CHANNEL, handleToggle);
      return () => {
        ipcRenderer.removeListener(PINPOINT_TOGGLE_CHANNEL, handleToggle);
      };
    },
  };

  contextBridge.exposeInMainWorld("pinpoint", api);
};
