import { fromFileUrl, ky, resolve } from "./deps.ts";
import {
  extractUserscriptHeader,
  type Header,
  mergeHeader,
} from "./header_helpers.ts";
import { nonNullable } from "./utils.ts";

const cache = new Map<string, Response>();
export const _internals = {
  ky: ky.create({
    hooks: {
      beforeRequest: [(request) => {
        return cache.get(request.url)?.clone();
      }],
    },
  }),
};

export async function makeBundleHeader(
  id: string,
): Promise<Header> {
  const js = await readOrFetch(id);
  if (!js) {
    console.warn(`Cannot get ${id}`);
    return {};
  }

  const header = extractUserscriptHeader(js);
  if (!header) {
    return {};
  }

  const resources = header["@resource"];
  if (resources) {
    const urls = resources.map((x) => x.split(/\s+/)[1]).filter(nonNullable);
    const headers = await Promise.all(urls.map(makeBundleHeader));
    const merged = headers.reduce(mergeHeader, header);
    return merged;
  }

  return header;
}

async function readOrFetch(id: string) {
  const { type, path } = getSourceKey(id);
  switch (type) {
    case "file":
      try {
        return await Deno.readTextFile(path);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          return null;
        }
        throw error;
      }
    case "url": {
      return await _internals.ky.get(id).text();
    }
  }
}

function getSourceKey(path: string): { type: "url" | "file"; path: string } {
  if (path.startsWith("http")) {
    return { type: "url", path };
  }

  const relative = path.startsWith("file:") ? fromFileUrl(path) : path;
  const absolute = resolve(relative);
  return { type: "file", path: absolute };
}
