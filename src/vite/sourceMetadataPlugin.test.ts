import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Plugin } from "vite";
import pinpoint from "./sourceMetadataPlugin.js";

type TestablePlugin = Plugin & {
  configResolved: (config: { readonly root: string; readonly mode: string }) => void;
  transform: (code: string, id: string) => { readonly code: string; readonly map: null } | null;
};

const makePlugin = (mode = "development") => {
  const root = path.resolve("/repo");
  const plugin = pinpoint({ root }) as TestablePlugin;
  plugin.configResolved({ root, mode });
  return { plugin, root };
};

describe("pinpoint Vite plugin", () => {
  it("injects source metadata into JSX opening tags", () => {
    const { plugin, root } = makePlugin();
    const code = [
      "export const Demo = () => (",
      "  <section>",
      "    <button>Save</button>",
      "  </section>",
      ");",
    ].join("\n");

    const result = plugin.transform(code, path.join(root, "src/Demo.tsx"));

    expect(result?.code).toContain('data-ui-context-source="src/Demo.tsx:2:3" data-ui-context-name="section"');
    expect(result?.code).toContain('data-ui-context-source="src/Demo.tsx:3:5" data-ui-context-name="button"');
  });

  it("does not inject metadata in production mode", () => {
    const { plugin, root } = makePlugin("production");
    const result = plugin.transform("<button>Save</button>", path.join(root, "src/Demo.tsx"));

    expect(result).toBeNull();
  });
});
