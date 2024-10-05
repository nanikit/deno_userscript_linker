import { extractUserscriptHeader, mergeHeader } from "../lib/header_helpers.ts";
import {
  renderBundleHeader,
  renderFooterScript,
  renderHeaderScript,
} from "../lib/header_helpers/internal.ts";
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
      { "@grant": ["GM_getValue"] },
      { "@grant": ["GM_getValue"] },
    );

    await test.step("it should return one grants", () => {
      assertEquals(merged, { "@grant": ["GM_getValue"] });
    });
  });
});

Deno.test("Given userscript header renderer", async (test) => {
  const render = renderBundleHeader;

  await test.step("when input empty header", async (test) => {
    const rendered = render({});

    await test.step("it should return empty header", () => {
      assertEquals(
        rendered,
        `// ==UserScript==
// ==/UserScript==
"use strict";\n`,
      );
    });
  });

  await test.step("when input header having different key length", async (test) => {
    const rendered = render({
      "@name": ["main userscript"],
      "@description": ["for test"],
    });

    await test.step("it should align column", () => {
      assertEquals(
        rendered,
        `// ==UserScript==
// @name        main userscript
// @description for test
// ==/UserScript==
"use strict";\n`,
      );
    });
  });
});

Deno.test("Given requirejs script header renderer", async (test) => {
  const render = renderHeaderScript;

  await test.step("when input empty header", async (test) => {
    const rendered = render({});

    await test.step("it should return empty", () => {
      assertEquals(rendered, "");
    });
  });

  await test.step("when input library header", async (test) => {
    const rendered = render({
      "@resource": ["react https://cdn.jsdelivr.net/npm/react"],
      "@grant": ["GM_setValue", "window.close"],
    });

    await test.step("it should return empty", () => {
      assertEquals(rendered, "");
    });
  });

  await test.step("when input application header with no dependency", async (test) => {
    const rendered = render({
      "@require": ["https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js"],
      "@grant": ["GM_setValue"],
    });

    await test.step("it should return empty", () => {
      assertEquals(rendered, "");
    });
  });

  await test.step("when input application header with dependency", async (test) => {
    const rendered = render({
      "@require": ["https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js"],
      "@resource": ["react https://cdn.jsdelivr.net/npm/react"],
    });

    await test.step("it should return define snippet", () => {
      assertEquals(
        rendered,
        `define("main", (require, exports, module) => {`,
      );
    });
  });
});

Deno.test("Given requirejs script footer renderer", async (test) => {
  const render = renderFooterScript;

  await test.step("when input empty header", async (test) => {
    const rendered = render({});

    await test.step("it should return empty", () => {
      assertEquals(rendered, "");
    });
  });

  await test.step("when input application header with no dependency", async (test) => {
    const rendered = render({
      "@require": ["https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js"],
      "@grant": ["GM_setValue"],
    });

    await test.step("it should return empty", () => {
      assertEquals(rendered, "");
    });
  });

  await test.step("when input application header having a dependency", async (test) => {
    const rendered = render({
      "@require": ["https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js"],
      "@resource": ["react https://cdn.jsdelivr.net/npm/react"],
    });

    await test.step("it should import it", () => {
      assertEquals(
        rendered,
        `});

for (const { name } of GM.info.script.resources.filter(x => x.name.startsWith("link:"))) {
  define(name.replace("link:", ""), Function("require", "exports", "module", GM_getResourceText(name)));
}

require(["main"], () => {}, console.error);`,
      );
    });
  });
});
