import {
  findNearestSourceElement,
  formatSourceLocation,
  getElementSourceLocation,
  getElementSourceName,
  getReactOwnerStack,
  getReactSourceLocation,
} from "./sourceMetadata.js";
import type { ElementContext } from "./types.js";

const PAYLOAD_TAG = "pinpoint-selection";

const truncate = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
};

const getElementText = (element: Element) => {
  const text = truncate(element.textContent ?? "", 120);
  return text.length > 0 ? text : null;
};

const getElementClassName = (element: Element) => {
  const className = element.getAttribute("class");
  return className && className.trim().length > 0 ? truncate(className, 180) : null;
};

const getAccessibleName = (element: Element) =>
  element.getAttribute("aria-label") ?? element.getAttribute("title") ?? element.getAttribute("alt");

const getDomPath = (element: Element) => {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 8) {
    let part = current.tagName.toLowerCase();
    const id = current.getAttribute("id");
    const dataSlot = current.getAttribute("data-slot");
    if (id) {
      part += `#${id}`;
      parts.unshift(part);
      break;
    }
    if (dataSlot) {
      part += `[data-slot="${dataSlot}"]`;
    }
    const parent: Element | null = current.parentElement;
    if (parent) {
      const tagName = current.tagName;
      const siblings = Array.from(parent.children).filter((sibling) => sibling.tagName === tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }
    parts.unshift(part);
    current = parent;
  }

  return parts.join(" > ");
};

const getComputedStyleSummary = (element: Element) => {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return {
    display: style?.display ?? "",
    position: style?.position ?? "",
    width: style?.width ?? "",
    height: style?.height ?? "",
    margin: style?.margin ?? "",
    padding: style?.padding ?? "",
    color: style?.color ?? "",
    backgroundColor: style?.backgroundColor ?? "",
    fontSize: style?.fontSize ?? "",
    fontWeight: style?.fontWeight ?? "",
  };
};

export const createElementContext = (element: Element, windowLabel: string | null): ElementContext => {
  const sourceElement = findNearestSourceElement(element);
  const contextElement = sourceElement ?? element;
  return {
    element,
    tagName: element.tagName.toLowerCase(),
    text: getElementText(element),
    accessibleName: getAccessibleName(element),
    role: element.getAttribute("role"),
    id: element.getAttribute("id"),
    className: getElementClassName(element),
    dataSlot: element.getAttribute("data-slot"),
    source: getElementSourceLocation(contextElement),
    sourceElementName: getElementSourceName(contextElement),
    reactSource: getReactSourceLocation(element),
    reactOwnerStack: getReactOwnerStack(element),
    domPath: getDomPath(element),
    bounds: element.getBoundingClientRect(),
    url: element.ownerDocument.defaultView?.location.href ?? "",
    windowLabel,
    computedStyle: getComputedStyleSummary(element),
  };
};

const serializeBounds = (bounds: DOMRect) => ({
  x: Math.round(bounds.x),
  y: Math.round(bounds.y),
  width: Math.round(bounds.width),
  height: Math.round(bounds.height),
  top: Math.round(bounds.top),
  right: Math.round(bounds.right),
  bottom: Math.round(bounds.bottom),
  left: Math.round(bounds.left),
});

const createAiTargetDescription = (context: ElementContext) => {
  const label = context.accessibleName ?? context.text;
  const name = label ? ` "${label}"` : "";
  const slot = context.dataSlot ? ` with data-slot="${context.dataSlot}"` : "";
  const source = formatSourceLocation(context.source) ?? formatSourceLocation(context.reactSource);
  return `The visible ${context.tagName}${name}${slot}${source ? ` rendered from ${source}` : ""}.`;
};

export const createContextPayload = (context: ElementContext) => {
  const source = formatSourceLocation(context.source);
  const reactSource = formatSourceLocation(context.reactSource);
  const payload = {
    schemaVersion: 1,
    kind: "pinpoint.selection",
    capturedAt: new Date().toISOString(),
    app: {
      name: "Shotomatic",
      environment: "development",
      window: context.windowLabel,
      url: context.url,
    },
    target: {
      description: createAiTargetDescription(context),
      tagName: context.tagName,
      text: context.text,
      accessibleName: context.accessibleName,
      role: context.role,
      id: context.id,
      className: context.className,
      dataSlot: context.dataSlot,
    },
    source: {
      primary: source ?? reactSource,
      jsxMetadata: context.source
        ? {
            ...context.source,
            formatted: source,
            elementName: context.sourceElementName,
          }
        : null,
      reactDebug: context.reactSource
        ? {
            ...context.reactSource,
            formatted: reactSource,
          }
        : null,
      sourceElementName: context.sourceElementName,
    },
    react: {
      ownerStack: context.reactOwnerStack,
    },
    dom: {
      path: context.domPath,
    },
    layout: {
      bounds: serializeBounds(context.bounds),
    },
    computedStyle: context.computedStyle,
    promptHint: "Use target.description and source.primary to locate the UI element before editing.",
  };

  return `<${PAYLOAD_TAG}>\n${JSON.stringify(payload, null, 2)}\n</${PAYLOAD_TAG}>`;
};
