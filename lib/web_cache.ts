import { fromFileUrl, ky, resolve } from "./deps.ts";

/** @internal */
export const _internals = {
  ky,
  readTextFile: Deno.readTextFile,
};

export class WebCache {
  cache = new Map<string, string>();

  getOrFetch = async (id: string) => {
    const { type, path } = getSourceKey(id);
    switch (type) {
      case "file":
        try {
          return await _internals.readTextFile(path);
        } catch (error) {
          if (error instanceof Deno.errors.NotFound) {
            return null;
          }
          throw error;
        }
      case "url": {
        const cached = this.cache.get(path);
        if (cached) {
          return cached;
        }

        const script = await _internals.ky(path).text();
        this.cache.set(path, script);
        return script;
      }
    }
  };
}

function getSourceKey(path: string): { type: "url" | "file"; path: string } {
  if (path.startsWith("http")) {
    return { type: "url", path };
  }

  const relative = path.startsWith("file:") ? fromFileUrl(path) : path;
  const absolute = resolve(relative);
  return { type: "file", path: absolute };
}
