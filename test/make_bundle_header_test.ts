import { makeBundleHeader } from "../lib/make_bundle_header.ts";
import { assertEquals, toFileUrl } from "./deps.ts";
import { scriptPaths, setupExampleScript } from "./test_helpers.ts";

Deno.test("Given script address referencing other script having header", async (test) => {
  const setup = await setupExampleScript();

  try {
    await test.step("when bundle", async (test) => {
      const header = await makeBundleHeader(setup.patchedPath);

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
            "@stitches/react https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs",
            "fflate          https://cdn.jsdelivr.net/npm/fflate@0.7.4/lib/browser.cjs",
            `library1        ${toFileUrl(scriptPaths.library1)}`,
            "library2        http://localhost:8080/library2.user.js",
            "react           https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
            "react-dom       https://cdn.jsdelivr.net/npm/react-dom@18.2.0/cjs/react-dom.production.min.js",
          ],
        });
      });
    });
  } finally {
    await setup.dispose();
  }
});
