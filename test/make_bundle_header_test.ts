import { makeBundleHeader } from "../lib/make_bundle_header.ts";
import { _internals } from "../lib/web_cache.ts";
import {
  assertEquals,
  dirname,
  fromFileUrl,
  resolve,
  stub,
  toFileUrl,
} from "./deps.ts";

Deno.test("Given script address referencing other script having header", async (test) => {
  const directory = dirname(fromFileUrl(import.meta.url));
  const paths = {
    example: resolve(directory, "data", "example.user.ts"),
    script1: resolve(directory, "data", "library1.user.js"),
    script2: resolve(directory, "static", "library2.user.js"),
  };

  const kyStub = stub(
    _internals,
    "ky",
    mockLibraryHttps as typeof _internals.ky,
  );
  const temporaryDirectory = await Deno.makeTempDir();
  const patchedPath = await patchScriptFileUrl(paths, temporaryDirectory);

  try {
    await test.step("when bundle", async (test) => {
      const header = await makeBundleHeader(patchedPath);

      await test.step("it should emit merged header", () => {
        assertEquals(header, {
          "@name": ["main userscript"],
          "@description": ["for test"],
          "@version": ["1.0.0"],
          "@namespace": ["https://greasyfork.org/en/users/713014-nanikit"],
          "@exclude": ["*"],
          "@match": ["http://unused-field.space/"],
          "@author": ["nanikit"],
          "@grant": ["GM_getValue", "GM_setValue", "GM_xmlhttpRequest"],
          "@resource": [
            "@stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs",
            "fflate           https://cdn.jsdelivr.net/npm/fflate@0.7.4/lib/browser.cjs",
            `library1         ${toFileUrl(paths.script1)}`,
            "library2         http://localhost:8080/library2.user.js",
            "react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
          ],
        });
      });
    });
  } finally {
    kyStub.restore();
    await Deno.remove(temporaryDirectory, { recursive: true });
  }

  function mockLibraryHttps(url: string) {
    switch (url) {
      case "http://localhost:8080/library2.user.js":
        return { text: () => Deno.readTextFile(paths.script2) };
      default:
        return { text: () => "'mocked'" };
    }
  }
});

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
