import { SOURCE_ATTR, SOURCE_NAME_ATTR, type SourceLocation } from "./types.js";

type UnknownRecord = Record<string, unknown>;

type ReactDebugSource = {
  readonly fileName?: unknown;
  readonly lineNumber?: unknown;
  readonly columnNumber?: unknown;
};

type ReactFiberLike = UnknownRecord & {
  readonly type?: unknown;
  readonly elementType?: unknown;
  readonly _debugSource?: ReactDebugSource;
  readonly _debugOwner?: ReactFiberLike | null;
  readonly return?: ReactFiberLike | null;
};

const REACT_FIBER_PREFIXES = ["__reactFiber$", "__reactInternalInstance$"] as const;

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === "object";

const parsePositiveInteger = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseSourceLocation = (value: string | null): SourceLocation | null => {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 3) return null;

  const column = parsePositiveInteger(parts.at(-1) ?? "");
  const line = parsePositiveInteger(parts.at(-2) ?? "");
  if (!line || !column) return null;

  return {
    file: parts.slice(0, -2).join(":"),
    line,
    column,
  };
};

export const formatSourceLocation = (location: SourceLocation | null) => {
  if (!location) return null;
  return `${location.file}:${location.line}:${location.column}`;
};

export const findNearestSourceElement = (element: Element) =>
  element.closest(`[${SOURCE_ATTR}]`) as HTMLElement | SVGElement | null;

export const getElementSourceLocation = (element: Element): SourceLocation | null => {
  const sourceElement = findNearestSourceElement(element);
  return parseSourceLocation(sourceElement?.getAttribute(SOURCE_ATTR) ?? null);
};

export const getElementSourceName = (element: Element): string | null => {
  const sourceElement = findNearestSourceElement(element);
  return sourceElement?.getAttribute(SOURCE_NAME_ATTR) ?? null;
};

const getReactFiber = (element: Element): ReactFiberLike | null => {
  const record = element as unknown as UnknownRecord;
  const key = Object.keys(record).find((candidate) =>
    REACT_FIBER_PREFIXES.some((prefix) => candidate.startsWith(prefix)),
  );
  if (!key) return null;
  const value = record[key];
  return isRecord(value) ? (value as ReactFiberLike) : null;
};

const getComponentName = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return null;
  const displayName = value.displayName;
  if (typeof displayName === "string" && displayName.length > 0) return displayName;
  const name = value.name;
  return typeof name === "string" && name.length > 0 ? name : null;
};

const sourceFromReactDebugSource = (source: ReactDebugSource | undefined): SourceLocation | null => {
  if (!source) return null;
  if (typeof source.fileName !== "string") return null;
  if (typeof source.lineNumber !== "number" || !Number.isFinite(source.lineNumber)) return null;
  const column =
    typeof source.columnNumber === "number" && Number.isFinite(source.columnNumber) ? source.columnNumber : 1;
  return {
    file: source.fileName,
    line: source.lineNumber,
    column,
  };
};

export const getReactSourceLocation = (element: Element): SourceLocation | null => {
  let fiber = getReactFiber(element);
  let depth = 0;
  while (fiber && depth < 20) {
    const source = sourceFromReactDebugSource(fiber._debugSource);
    if (source) return source;
    fiber = fiber.return ?? fiber._debugOwner ?? null;
    depth += 1;
  }
  return null;
};

export const getReactOwnerStack = (element: Element): readonly string[] => {
  const stack: string[] = [];
  let fiber = getReactFiber(element);
  let depth = 0;

  while (fiber && depth < 20) {
    const name = getComponentName(fiber.elementType) ?? getComponentName(fiber.type);
    if (name && stack.at(-1) !== name) {
      stack.push(name);
    }
    fiber = fiber._debugOwner ?? fiber.return ?? null;
    depth += 1;
  }

  return stack;
};
