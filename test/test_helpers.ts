import { ky } from "../lib/deps.ts";
import { _internals } from "../lib/make_bundle_header.ts";
import { dirname, fromFileUrl, resolve, toFileUrl } from "./deps.ts";

const directory = dirname(fromFileUrl(import.meta.url));

export const scriptPaths = {
  example: resolve(directory, "data", "example.user.tsx"),
  library1: resolve(directory, "data", "library1.user.js"),
  library2: resolve(directory, "static", "library2.user.js"),
  expectedExample: resolve(directory, "data", "expected_example.user.js"),
  expectedLibrary1: resolve(directory, "data", "expected_library1.user.js"),
  deps: resolve(directory, "data", "deps.ts"),
};

export async function setupExampleScript() {
  const kyi = ky.create({
    hooks: {
      beforeRequest: [async (request) => {
        if (request.url === "http://localhost:8080/library2.user.js") {
          return new Response(await Deno.readTextFile(scriptPaths.library2));
        }
        return new Response('"mocked"');
      }],
    },
  });
  const originalKy = _internals.ky;
  _internals.ky = kyi;
  const temporaryDirectory = await Deno.makeTempDir();
  const [patchedPath] = await Promise.all([
    patchScriptFileUrl(scriptPaths, temporaryDirectory),
    Deno.copyFile(scriptPaths.deps, resolve(temporaryDirectory, "deps.ts")),
  ]);

  return {
    temporaryDirectory,
    patchedPath,
    dispose: async () => {
      _internals.ky = originalKy;
      await Deno.remove(temporaryDirectory, { recursive: true });
    },
  };
}

async function patchScriptFileUrl(
  paths: { example: string; library1: string },
  temporaryDirectory: string,
) {
  const script1 = await Deno.readTextFile(paths.example);
  const patched = script1.replace(
    "file://library1.user.js",
    `${toFileUrl(paths.library1)}`,
  );
  const patchedPath = resolve(temporaryDirectory, "example.user.tsx");
  await Deno.writeTextFile(patchedPath, patched);

  return patchedPath;
}
