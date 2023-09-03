import { extractUserscriptHeader, mergeHeader } from "../lib/header_helpers.ts";
import { assertEquals, dirname, fromFileUrl, resolve } from "./deps.ts";

Deno.test("Given user script", async (test) => {
  const directory = dirname(fromFileUrl(import.meta.url));
  const scriptPath = resolve(directory, "data", "main_script.ts");
  const script = await Deno.readTextFile(scriptPath);

  await test.step("when parse the header", async (test) => {
    const parsed = extractUserscriptHeader(script);

    await test.step("it should be correct", () => {
      assertEquals(parsed, {
        "@name": ["main userscript"],
        "@description": ["for test"],
        "@version": ["1.0.0"],
        "@namespace": ["https://greasyfork.org/en/users/713014-nanikit"],
        "@exclude": ["*"],
        "@match": ["http://unused-field.space/"],
        "@author": ["nanikit"],
        "@grant": ["GM_getValue"],
        "@resource": [
          "@stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs",
          "react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
          "library1         https://library1",
        ],
      });
    });
  });

  await test.step("when append the header", async (test) => {
    const script1Path = resolve(directory, "data", "dependency1_script.js");
    const script1 = await Deno.readTextFile(script1Path);

    const first = extractUserscriptHeader(script);
    const second = extractUserscriptHeader(script1);
    const merged = mergeHeader(first!, second!);

    await test.step("it should be correct", () => {
      assertEquals(merged, {
        "@name": ["main userscript"],
        "@description": ["for test"],
        "@version": ["1.0.0"],
        "@namespace": ["https://greasyfork.org/en/users/713014-nanikit"],
        "@exclude": ["*"],
        "@match": ["http://unused-field.space/"],
        "@author": ["nanikit"],
        "@grant": [
          "GM_getValue",
          "GM_setValue",
        ],
        "@resource": [
          "@stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs",
          "library1         https://library1",
          "library2         file://library2",
          "react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
        ],
      });
    });
  });
});
