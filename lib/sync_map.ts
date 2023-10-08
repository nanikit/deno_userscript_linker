import { join, resolve } from "./deps.ts";
import { extractUserscriptHeader } from "./header_helpers.ts";
import { Header } from "./header_helpers/internal.ts";

type PathMap = Map<string | null, Map<string, string>>;

export class SyncMap {
  #paths = new Map<string | null, Map<string, string>>();

  #directory: string;

  constructor(tamperDavPath: string) {
    this.#directory = tamperDavPath;
  }

  load = async () => {
    this.#paths = await getUserscriptMap(this.#directory);
    return this;
  };

  getOrCreate = (header: Header) => {
    return getOrCreate(this.#paths, { header, directory: this.#directory });
  };
}

/** @returns Map of namespace to map of name to path */
export async function getUserscriptMap(path: string) {
  const paths = new Map() as PathMap;

  for await (const file of Deno.readDir(path)) {
    if (!file.isFile) {
      continue;
    }

    const metaPath = resolve(path, file.name);
    const script = await Deno.readTextFile(metaPath);
    const header = extractUserscriptHeader(script);
    const name = header?.["@name"]?.[0];
    if (!name) {
      continue;
    }

    const namespaceMap = getNamespaceMap(paths, header);
    if (namespaceMap.has(name)) {
      throw new Error(`Duplicate userscript name: ${name}`);
    }

    namespaceMap.set(name, metaPath);
  }

  return paths;
}

export function getOrCreate(
  syncMap: PathMap,
  { header, directory }: { header: Header; directory: string },
) {
  const name = header["@name"]?.[0];
  if (!name) {
    return null;
  }

  const namespaceMap = getNamespaceMap(syncMap, header);
  return namespaceMap?.get(name) ?? (() => {
    const path = join(directory, `${crypto.randomUUID()}.user.js`);
    namespaceMap.set(name, path);
    return path;
  })();
}

function getNamespaceMap(syncMap: PathMap, header: Header) {
  const namespace = header["@namespace"]?.[0] ?? null;
  return syncMap.get(namespace) ?? (() => {
    const map = new Map<string, string>();
    syncMap.set(namespace, map);
    return map;
  })();
}
