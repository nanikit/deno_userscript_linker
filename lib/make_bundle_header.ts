import {
  extractUserscriptHeader,
  type Header,
  mergeHeader,
} from "./header_helpers.ts";
import { nonNullable } from "./utils.ts";
import { WebCache } from "./web_cache.ts";

const cache = new WebCache();

export async function makeBundleHeader(
  id: string,
): Promise<Header> {
  const script = await cache.getOrFetch(id);
  if (!script) {
    console.warn(`Cannot get ${id}`);
    return {};
  }
  const header = extractUserscriptHeader(script);
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
