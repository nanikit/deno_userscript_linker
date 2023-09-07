export type Header = Record<string, string[]>;

export function mergeHeader(main: Header, sub: Header): Header {
  const grantKey = "@grant";
  const grants = mergeAndSort(main[grantKey], sub[grantKey]);

  const requireKey = "@require";
  const requires = mergeAndSort(main[requireKey], sub[requireKey]);

  const resourceKey = "@resource";
  const resourceTable = [
    ...(main[resourceKey] ?? []).map((x) => x.split(/\s+/)),
    ...(sub[resourceKey] ?? []).map((x) => x.split(/\s+/)),
  ];
  const maxKeyLength = Math.max(
    ...resourceTable.map((x) => x[0]?.length ?? -Infinity),
  );
  const rows = resourceTable.map((x) =>
    `${x[0]?.padEnd(maxKeyLength)} ${x.slice(1)}`
  );
  const resources = mergeAndSort(rows, []);

  return {
    ...main,
    ...(requires.length ? { [requireKey]: requires } : {}),
    ...(grants.length ? { [grantKey]: grants } : {}),
    ...(resources.length ? { [resourceKey]: resources } : {}),
  };
}

export function extractUserscriptHeader(
  code: string,
): Header | undefined {
  const header = code.match(
    /(?:^\s*\/\/.*?==UserScript==.*?\r?\n)(?:^\s*\/\/.*\r?\n)+/m,
  )?.[0];
  if (!header) {
    return;
  }

  const matches = header.matchAll(/^\s*\/\/\s*(@\w+)\s+(.+)/gm);
  const record: Record<string, string[]> = {};
  for (const [, key, value] of matches) {
    if (record[key!]) {
      record[key!]!.push(value!);
    } else {
      record[key!] = [value!];
    }
  }

  return record;
}

function mergeAndSort(a?: string[], b?: string[]) {
  return [...new Set([...a ?? [], ...b ?? []])].sort();
}
