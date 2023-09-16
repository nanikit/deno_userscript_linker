import { extractUserscriptHeader, mergeHeader } from "../lib/header_helpers.ts";
import { assertEquals } from "./deps.ts";

Deno.test("Given userscript header parser", async (test) => {
  const parse = extractUserscriptHeader;

  await test.step("when parse no userscript", async (test) => {
    const parsed = parse(`console.log('hello world')`);

    await test.step("it should be undefined", () => {
      assertEquals(parsed, undefined);
    });
  });

  await test.step("when parse header including name", async (test) => {
    const parsed = parse(`// ==UserScript==
// @name main userscript
// ==/UserScript==`);

    await test.step("it should include name", () => {
      assertEquals(parsed, { "@name": ["main userscript"] });
    });
  });

  await test.step("when parse header including grants", async (test) => {
    const parsed = parse(`// ==UserScript==
// @grant GM_getValue
// @grant GM_setValue
// ==/UserScript==`);

    await test.step("it should include grants", () => {
      assertEquals(parsed, { "@grant": ["GM_getValue", "GM_setValue"] });
    });
  });
});

Deno.test("Given userscript header merger", async (test) => {
  const merge = mergeHeader;

  await test.step("when merge two empties", async (test) => {
    const merged = merge({}, {});

    await test.step("it should return empty", () => {
      assertEquals(merged, {});
    });
  });

  await test.step("when merge a header having name and an empty", async (test) => {
    const merged = merge({ "@name": ["main userscript"] }, {});

    await test.step("it should return name", () => {
      assertEquals(merged, { "@name": ["main userscript"] });
    });
  });

  await test.step("when merge two headers having name", async (test) => {
    const merged = merge({ "@name": ["main userscript"] }, {
      name: ["sub userscript"],
    });

    await test.step("it should return first name", () => {
      assertEquals(merged, { "@name": ["main userscript"] });
    });
  });

  await test.step("when merge two headers having resource", async (test) => {
    const merged = merge({
      "@resource": [
        "react https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
      ],
    }, {
      "@resource": [
        "react-dom https://cdn.jsdelivr.net/npm/react-dom@18.2.0/cjs/react-dom.production.min.js",
      ],
    });

    await test.step("it should align column and return all resources", () => {
      assertEquals(merged, {
        "@resource": [
          "react     https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js",
          "react-dom https://cdn.jsdelivr.net/npm/react-dom@18.2.0/cjs/react-dom.production.min.js",
        ],
      });
    });
  });

  await test.step("when merge two headers having same grants", async (test) => {
    const merged = merge(
      { "@grants": ["GM_getValue"] },
      { "@grants": ["GM_getValue"] },
    );

    await test.step("it should return one grants", () => {
      assertEquals(merged, { "@grants": ["GM_getValue"] });
    });
  });
});
