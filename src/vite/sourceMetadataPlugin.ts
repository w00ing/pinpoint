import path from "node:path";
import type { Plugin } from "vite";
import { SOURCE_ATTR, SOURCE_NAME_ATTR } from "../core/types.js";

type SourceMetadataPluginOptions = {
  readonly root?: string;
  readonly include?: RegExp;
  readonly exclude?: RegExp;
  readonly enabled?: boolean;
};

type Edit = {
  readonly index: number;
  readonly text: string;
};

const DEFAULT_INCLUDE = /\.[jt]sx$/;
const DEFAULT_EXCLUDE = /(?:node_modules|routeTree\.gen\.ts)/;
const RESERVED_AFTER_TAG_NAME = new Set(["extends", "keyof", "infer"]);

const normalizeId = (id: string) => id.split("?")[0] ?? id;

const buildLineStarts = (code: string) => {
  const starts = [0];
  for (let index = 0; index < code.length; index += 1) {
    if (code[index] === "\n") starts.push(index + 1);
  }
  return starts;
};

const getLineColumn = (lineStarts: readonly number[], index: number) => {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const start = lineStarts[middle] ?? 0;
    if (start <= index) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  const lineIndex = Math.max(0, high);
  return {
    line: lineIndex + 1,
    column: index - (lineStarts[lineIndex] ?? 0) + 1,
  };
};

const getRelativeSourceFile = (root: string, id: string) => path.relative(root, id).replaceAll(path.sep, "/");

const findOpeningTagEnd = (code: string, startIndex: number) => {
  let quote: string | null = null;
  let expressionDepth = 0;
  for (let index = startIndex + 1; index < code.length; index += 1) {
    const char = code[index];
    const previous = code[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      expressionDepth += 1;
      continue;
    }
    if (char === "}") {
      expressionDepth = Math.max(0, expressionDepth - 1);
      continue;
    }
    if (char === ">" && expressionDepth === 0) {
      return index;
    }
  }
  return null;
};

const getPreviousWord = (code: string, endIndex: number) => {
  let startIndex = endIndex;
  while (startIndex >= 0 && /[A-Za-z]/.test(code[startIndex] ?? "")) {
    startIndex -= 1;
  }
  return code.slice(startIndex + 1, endIndex + 1);
};

const isInsideStringOrComment = (code: string, targetIndex: number) => {
  let quote: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < targetIndex; index += 1) {
    const char = code[index];
    const next = code[index + 1];
    const previous = code[index - 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
    }
  }

  return Boolean(quote || inLineComment || inBlockComment);
};

const isLikelyJsxOpeningStart = (code: string, tagStart: number) => {
  let previousIndex = tagStart - 1;
  while (previousIndex >= 0 && /\s/.test(code[previousIndex] ?? "")) {
    previousIndex -= 1;
  }
  if (previousIndex < 0) return true;

  const previous = code[previousIndex] ?? "";
  if ("([{=,:?;!&|".includes(previous)) return true;
  if (previous === ">" && code[previousIndex - 1] === "=") return true;
  if (/[A-Za-z0-9_$.)\]]/.test(previous)) {
    const previousWord = getPreviousWord(code, previousIndex);
    return previousWord === "return" || previousWord === "yield";
  }
  return true;
};

const shouldSkipTag = (code: string, tagStart: number, tagName: string, openingEnd: number) => {
  const opening = code.slice(tagStart, openingEnd);
  if (opening.includes(SOURCE_ATTR)) return true;
  if (tagName === "React.Fragment") return true;
  const afterTagName = code.slice(tagStart + tagName.length + 1, openingEnd).trimStart();
  const firstWord = afterTagName.match(/^[A-Za-z]+/)?.[0];
  return Boolean(firstWord && RESERVED_AFTER_TAG_NAME.has(firstWord));
};

const applyEdits = (code: string, edits: readonly Edit[]) => {
  let transformed = code;
  for (const edit of [...edits].sort((left, right) => right.index - left.index)) {
    transformed = `${transformed.slice(0, edit.index)}${edit.text}${transformed.slice(edit.index)}`;
  }
  return transformed;
};

const transformJsxSourceMetadata = (code: string, id: string, root: string) => {
  const sourceFile = getRelativeSourceFile(root, id);
  const lineStarts = buildLineStarts(code);
  const edits: Edit[] = [];
  const openingTagPattern = /<([A-Za-z][\w.$:-]*)(?=[\s>/])/g;
  let match: RegExpExecArray | null;

  while ((match = openingTagPattern.exec(code))) {
    const tagStart = match.index;
    const tagName = match[1];
    if (!tagName) continue;
    if (code[tagStart + 1] === "/") continue;
    if (isInsideStringOrComment(code, tagStart)) continue;
    if (!isLikelyJsxOpeningStart(code, tagStart)) continue;
    const openingEnd = findOpeningTagEnd(code, tagStart);
    if (openingEnd === null) continue;
    if (shouldSkipTag(code, tagStart, tagName, openingEnd)) continue;

    const previousNonSpaceIndex = (() => {
      for (let index = openingEnd - 1; index > tagStart; index -= 1) {
        if (!/\s/.test(code[index] ?? "")) return index;
      }
      return openingEnd - 1;
    })();
    const insertIndex = code[previousNonSpaceIndex] === "/" ? previousNonSpaceIndex : openingEnd;
    const location = getLineColumn(lineStarts, tagStart);
    edits.push({
      index: insertIndex,
      text: ` ${SOURCE_ATTR}="${sourceFile}:${location.line}:${location.column}" ${SOURCE_NAME_ATTR}="${tagName}"`,
    });
  }

  return edits.length > 0 ? applyEdits(code, edits) : code;
};

const pinpoint = (options: SourceMetadataPluginOptions = {}): Plugin => {
  let root = options.root ? path.resolve(options.root) : process.cwd();
  let enabled = options.enabled ?? true;

  return {
    name: "pinpoint-source-metadata",
    enforce: "pre",
    configResolved(config) {
      root = options.root ? path.resolve(options.root) : config.root;
      enabled = options.enabled ?? config.mode !== "production";
    },
    transform(code, id) {
      if (!enabled) return null;
      const cleanId = normalizeId(id);
      const include = options.include ?? DEFAULT_INCLUDE;
      const exclude = options.exclude ?? DEFAULT_EXCLUDE;
      if (!include.test(cleanId) || exclude.test(cleanId)) return null;
      return {
        code: transformJsxSourceMetadata(code, cleanId, root),
        map: null,
      };
    },
  };
};

export { pinpoint, pinpoint as pinpointSourceMetadataPlugin };
export default pinpoint;
