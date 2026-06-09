import electron from "electron";
import { Effect } from "effect";
import { PINPOINT_COPY_CHANNEL, PINPOINT_TOGGLE_CHANNEL } from "./channels.js";

export const DEFAULT_PINPOINT_ACCELERATOR = "CommandOrControl+Shift+C";

const { BrowserWindow, clipboard, ipcMain } = electron as typeof import("electron");

const getTargetWindow = () => {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  return BrowserWindow.getAllWindows().find((window) => !window.isDestroyed() && window.isVisible()) ?? null;
};

export const registerElectronPinpointMain = () =>
  Effect.acquireRelease(
    Effect.sync(() => {
      ipcMain.handle(PINPOINT_COPY_CHANNEL, (_event, text: unknown) => {
        if (typeof text !== "string") return false;
        clipboard.writeText(text);
        return true;
      });
    }),
    () =>
      Effect.sync(() => {
        ipcMain.removeHandler(PINPOINT_COPY_CHANNEL);
      }),
  );

export const toggleElectronPinpointForFocusedWindow = () =>
  Effect.sync(() => {
    const targetWindow = getTargetWindow();
    if (!targetWindow) return false;
    targetWindow.webContents.send(PINPOINT_TOGGLE_CHANNEL);
    return true;
  });
