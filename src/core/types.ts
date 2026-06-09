export const SOURCE_ATTR = "data-ui-context-source";
export const SOURCE_NAME_ATTR = "data-ui-context-name";

export type SourceLocation = {
  readonly file: string;
  readonly line: number;
  readonly column: number;
};

export type ElementContext = {
  readonly element: Element;
  readonly tagName: string;
  readonly text: string | null;
  readonly accessibleName: string | null;
  readonly role: string | null;
  readonly id: string | null;
  readonly className: string | null;
  readonly dataSlot: string | null;
  readonly source: SourceLocation | null;
  readonly sourceElementName: string | null;
  readonly reactSource: SourceLocation | null;
  readonly reactOwnerStack: readonly string[];
  readonly domPath: string;
  readonly bounds: DOMRect;
  readonly url: string;
  readonly windowLabel: string | null;
  readonly computedStyle: {
    readonly display: string;
    readonly position: string;
    readonly width: string;
    readonly height: string;
    readonly margin: string;
    readonly padding: string;
    readonly color: string;
    readonly backgroundColor: string;
    readonly fontSize: string;
    readonly fontWeight: string;
  };
};

export type PinpointOptions = {
  readonly copyText: (text: string) => Promise<void>;
  readonly getWindowLabel?: () => string | null;
  readonly onCopied?: (payload: string, context: ElementContext) => void;
  readonly document?: Document;
};

export type Pinpoint = {
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
  readonly isActive: () => boolean;
};
