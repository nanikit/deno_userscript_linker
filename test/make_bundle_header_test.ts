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
  const scriptPath = resolve(directory, "data", "main_script.ts");
  const script1Path = resolve(directory, "data", "dependency1_script.js");
  const script2Url = `${
    toFileUrl(resolve(directory, "data", "dependency2_script.js"))
  }`;

  const kyStub = stub(
    _internals,
    "ky",
    mockLibraryHttps as typeof _internals.ky,
  );

  await test.step("when bundle", async (test) => {
    const header = await makeBundleHeader(scriptPath);

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
          "library1         https://library1",
          `library2         ${script2Url}`,
          "react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
        ],
      });
    });
  });

  kyStub.restore();

  function mockLibraryHttps(url: string) {
    switch (url) {
      case "https://library1":
        return { text: getModifiedScript1 };
      default:
        return { text: () => "" };
    }
  }

  async function getModifiedScript1() {
    const script1 = await Deno.readTextFile(script1Path);
    const modified = script1.replace("file://library2", script2Url);
    return modified;
  }
});
