import electron from "electron";
import { PINPOINT_COPY_CHANNEL, PINPOINT_TOGGLE_CHANNEL } from "./channels.js";

export const DEFAULT_PINPOINT_ACCELERATOR = "CommandOrControl+Shift+C";

const { BrowserWindow, clipboard, ipcMain } = electron as typeof import("electron");

const getTargetWindow = () => {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  return BrowserWindow.getAllWindows().find((window) => !window.isDestroyed() && window.isVisible()) ?? null;
};

export const registerElectronPinpointMain = () => {
  ipcMain.handle(PINPOINT_COPY_CHANNEL, (_event, text: unknown) => {
    if (typeof text !== "string") return false;
    clipboard.writeText(text);
    return true;
  });

  return () => {
    ipcMain.removeHandler(PINPOINT_COPY_CHANNEL);
  };
};

export const toggleElectronPinpointForFocusedWindow = () => {
  const targetWindow = getTargetWindow();
  if (!targetWindow) return false;
  targetWindow.webContents.send(PINPOINT_TOGGLE_CHANNEL);
  return true;
};
