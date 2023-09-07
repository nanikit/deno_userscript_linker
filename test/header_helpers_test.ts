import { extractUserscriptHeader, mergeHeader } from "../lib/header_helpers.ts";
import { assertEquals } from "./deps.ts";
import { scriptPaths } from "./test_helpers.ts";

Deno.test("Given user script", async (test) => {
  const script = await Deno.readTextFile(scriptPaths.example);

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
          "react-dom        https://cdn.jsdelivr.net/npm/react-dom@18.2.0/cjs/react-dom.production.min.js",
          "react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
          "library1         file://library1.user.js",
        ],
      });
    });
  });

  await test.step("when append the header", async (test) => {
    const script1 = await Deno.readTextFile(scriptPaths.library1);

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
          "@stitches/react https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs",
          "library1        file://library1.user.js",
          "library2        http://localhost:8080/library2.user.js",
          "react           https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
          "react-dom       https://cdn.jsdelivr.net/npm/react-dom@18.2.0/cjs/react-dom.production.min.js",
        ],
      });
    });
  });
});
