import { createContextPayload, createElementContext } from "./contextPayload.js";
import type { Pinpoint, PinpointOptions } from "./types.js";

const OVERLAY_ID = "pinpoint-overlay";
const LABEL_ID = "pinpoint-label";

const isSelectableElement = (element: Element | null): element is Element => {
  if (!element) return false;
  if (element.id === OVERLAY_ID || element.id === LABEL_ID) return false;
  if (element.closest(`#${OVERLAY_ID}, #${LABEL_ID}`)) return false;
  return element.tagName.toLowerCase() !== "html";
};

const getElementAtPoint = (doc: Document, clientX: number, clientY: number) => {
  const element = doc.elementFromPoint(clientX, clientY);
  return isSelectableElement(element) ? element : null;
};

const applyBox = (box: HTMLElement, target: Element | null) => {
  if (!target) {
    box.style.display = "none";
    return;
  }
  const rect = target.getBoundingClientRect();
  box.style.display = "block";
  box.style.transform = `translate(${Math.round(rect.left)}px, ${Math.round(rect.top)}px)`;
  box.style.width = `${Math.round(rect.width)}px`;
  box.style.height = `${Math.round(rect.height)}px`;
};

const applyLabel = (label: HTMLElement, target: Element | null) => {
  if (!target) {
    label.style.display = "none";
    return;
  }
  const rect = target.getBoundingClientRect();
  const text = target.getAttribute("data-ui-context-source") ?? target.tagName.toLowerCase();
  label.textContent = text;
  label.style.display = "block";
  label.style.transform = `translate(${Math.max(8, Math.round(rect.left))}px, ${Math.max(8, Math.round(rect.top) - 28)}px)`;
};

const createOverlayElement = (doc: Document) => {
  const box = doc.createElement("div");
  box.id = OVERLAY_ID;
  box.style.cssText = [
    "position:fixed",
    "display:none",
    "z-index:2147483646",
    "left:0",
    "top:0",
    "box-sizing:border-box",
    "pointer-events:none",
    "border:1.5px solid #ff4d4f",
    "background:rgba(255,77,79,0.08)",
    "box-shadow:0 0 0 9999px rgba(15,23,42,0.05)",
    "border-radius:4px",
    "transition:transform 80ms ease,width 80ms ease,height 80ms ease",
  ].join(";");
  return box;
};

const createLabelElement = (doc: Document) => {
  const label = doc.createElement("div");
  label.id = LABEL_ID;
  label.style.cssText = [
    "position:fixed",
    "display:none",
    "z-index:2147483647",
    "left:0",
    "top:0",
    "max-width:min(520px,calc(100vw - 16px))",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "white-space:nowrap",
    "pointer-events:none",
    "border-radius:5px",
    "background:rgba(15,23,42,0.95)",
    "color:white",
    "font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
    "padding:4px 7px",
    "box-shadow:0 8px 24px rgba(15,23,42,0.24)",
  ].join(";");
  return label;
};

export const createPinpoint = (options: PinpointOptions): Pinpoint => {
  const doc = options.document ?? globalThis.document;
  let active = false;
  let currentElement: Element | null = null;
  let box: HTMLElement | null = null;
  let label: HTMLElement | null = null;

  const ensureOverlay = () => {
    if (!box) {
      box = createOverlayElement(doc);
      doc.body.appendChild(box);
    }
    if (!label) {
      label = createLabelElement(doc);
      doc.body.appendChild(label);
    }
  };

  const removeOverlay = () => {
    box?.remove();
    label?.remove();
    box = null;
    label = null;
  };

  const setCurrentElement = (element: Element | null) => {
    currentElement = element;
    if (!box || !label) return;
    applyBox(box, element);
    applyLabel(label, element);
  };

  const handlePointerMove = (event: PointerEvent) => {
    setCurrentElement(getElementAtPoint(doc, event.clientX, event.clientY));
  };

  const handleClick = (event: MouseEvent) => {
    if (!currentElement) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const context = createElementContext(currentElement, options.getWindowLabel?.() ?? null);
    const payload = createContextPayload(context);
    void options.copyText(payload).then(() => {
      options.onCopied?.(payload, context);
      stop();
    });
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    stop();
  };

  const start = () => {
    if (active) return;
    active = true;
    ensureOverlay();
    doc.addEventListener("pointermove", handlePointerMove, true);
    doc.addEventListener("click", handleClick, true);
    doc.addEventListener("keydown", handleKeyDown, true);
    doc.body.style.cursor = "crosshair";
  };

  function stop() {
    if (!active) return;
    active = false;
    currentElement = null;
    doc.removeEventListener("pointermove", handlePointerMove, true);
    doc.removeEventListener("click", handleClick, true);
    doc.removeEventListener("keydown", handleKeyDown, true);
    doc.body.style.cursor = "";
    removeOverlay();
  }

  return {
    start,
    stop,
    toggle: () => {
      if (active) {
        stop();
      } else {
        start();
      }
    },
    isActive: () => active,
  };
};
