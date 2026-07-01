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
const TARGET_NAME_MAX_LENGTH = 80;

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

const compactObject = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === null || entry === undefined) return false;
      if (typeof entry === "string" && entry.trim().length === 0) return false;
      if (Array.isArray(entry) && entry.length === 0) return false;
      return true;
    }),
  );

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

export const createContextPayload = (context: ElementContext) => {
  const source = formatSourceLocation(context.source);
  const reactSource = formatSourceLocation(context.reactSource);
  const primarySource = source ?? reactSource;
  const sourceKind = source ? "jsx-metadata" : reactSource ? "react-debug" : null;
  const targetName = context.accessibleName ?? context.text;
  const payload = compactObject({
    kind: "pinpoint.selection",
    source: primarySource
      ? compactObject({
          location: primarySource,
          element: context.sourceElementName,
          kind: sourceKind,
        })
      : null,
    target: compactObject({
      tag: context.tagName,
      name: targetName ? truncate(targetName, TARGET_NAME_MAX_LENGTH) : null,
      role: context.role,
      id: context.id,
      slot: context.dataSlot,
    }),
    window: context.windowLabel,
  });

  return `<${PAYLOAD_TAG}>\n${JSON.stringify(payload, null, 2)}\n</${PAYLOAD_TAG}>`;
};
