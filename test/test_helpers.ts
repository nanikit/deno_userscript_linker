import { _internals } from "../lib/web_cache.ts";
import { dirname, fromFileUrl, resolve, stub, toFileUrl } from "./deps.ts";

const directory = dirname(fromFileUrl(import.meta.url));

export const scriptPaths = {
  example: resolve(directory, "data", "example.user.ts"),
  script1: resolve(directory, "data", "library1.user.js"),
  script2: resolve(directory, "static", "library2.user.js"),
};

export async function setupExampleScript() {
  const kyStub = stub(
    _internals,
    "ky",
    mockLibraryHttps as typeof _internals.ky,
  );
  const temporaryDirectory = await Deno.makeTempDir();
  const patchedPath = await patchScriptFileUrl(scriptPaths, temporaryDirectory);

  return {
    temporaryDirectory,
    patchedPath,
    dispose: async () => {
      kyStub.restore();
      await Deno.remove(temporaryDirectory, { recursive: true });
    },
  };
}

function mockLibraryHttps(url: string) {
  switch (url) {
    case "http://localhost:8080/library2.user.js":
      return { text: () => Deno.readTextFile(scriptPaths.script2) };
    default:
      return { text: () => "'mocked'" };
  }
}

async function patchScriptFileUrl(
  paths: { example: string; script1: string },
  temporaryDirectory: string,
) {
  const script1 = await Deno.readTextFile(paths.example);
  const patched = script1.replace(
    "file://library1.user.js",
    `${toFileUrl(paths.script1)}`,
  );
  const patchedPath = resolve(temporaryDirectory, "example.user.ts");
  await Deno.writeTextFile(patchedPath, patched);

  return patchedPath;
}
