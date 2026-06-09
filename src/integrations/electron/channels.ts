export const PINPOINT_TOGGLE_CHANNEL = "pinpoint:toggle";
export const PINPOINT_COPY_CHANNEL = "pinpoint:copy";

export type ElectronPinpointApi = {
  readonly copyText: (text: string) => Promise<void>;
  readonly onToggle: (listener: () => void) => () => void;
};
