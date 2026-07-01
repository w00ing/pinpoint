import { describe, expect, it } from "vitest";
import { createContextPayload } from "./contextPayload.js";
import type { ElementContext } from "./types.js";

const makeContext = (overrides: Partial<ElementContext> = {}): ElementContext => ({
  element: {} as Element,
  tagName: "button",
  text: "Export screenshots",
  accessibleName: null,
  role: "button",
  id: null,
  className: "inline-flex rounded-md px-3 py-2 text-sm",
  dataSlot: null,
  source: {
    file: "src/components/ExportButton.tsx",
    line: 42,
    column: 5,
  },
  sourceElementName: "Button",
  reactSource: null,
  reactOwnerStack: ["ExportButton", "Toolbar"],
  domPath: "body > main > button",
  bounds: {} as DOMRect,
  url: "http://localhost:5174/capture",
  windowLabel: "main",
  computedStyle: {
    display: "inline-flex",
    position: "static",
    width: "120px",
    height: "32px",
    margin: "0px",
    padding: "8px 12px",
    color: "rgb(0, 0, 0)",
    backgroundColor: "rgb(255, 255, 255)",
    fontSize: "14px",
    fontWeight: "500",
  },
  ...overrides,
});

const parsePayload = (payload: string) => {
  const json = payload.replace(/^<pinpoint-selection>\n/, "").replace(/\n<\/pinpoint-selection>$/, "");
  return JSON.parse(json) as Record<string, unknown>;
};

describe("createContextPayload", () => {
  it("copies a compact AI locator payload", () => {
    const payload = parsePayload(createContextPayload(makeContext()));

    expect(payload).toEqual({
      kind: "pinpoint.selection",
      source: {
        location: "src/components/ExportButton.tsx:42:5",
        element: "Button",
        kind: "jsx-metadata",
      },
      target: {
        tag: "button",
        name: "Export screenshots",
        role: "button",
      },
      window: "main",
    });
  });

  it("omits noisy debug fields from the clipboard payload", () => {
    const payload = createContextPayload(makeContext());

    expect(payload).not.toContain("computedStyle");
    expect(payload).not.toContain("className");
    expect(payload).not.toContain("ownerStack");
    expect(payload).not.toContain("domPath");
    expect(payload).not.toContain("schemaVersion");
    expect(payload).not.toContain("promptHint");
  });

  it("falls back to React debug source when JSX metadata is unavailable", () => {
    const payload = parsePayload(
      createContextPayload(
        makeContext({
          source: null,
          sourceElementName: null,
          reactSource: {
            file: "src/components/Fallback.tsx",
            line: 7,
            column: 3,
          },
        }),
      ),
    );

    expect(payload.source).toEqual({
      location: "src/components/Fallback.tsx:7:3",
      kind: "react-debug",
    });
  });
});
