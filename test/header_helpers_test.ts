import { extractUserscriptHeader, mergeHeader } from "../lib/header_helpers.ts";
import {
  renderAppHeaderSnippet,
  renderBundleHeader,
  renderLibHeaderSnippet,
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
// deno-fmt-ignore-file
// deno-lint-ignore-file
'use strict';\n`,
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
// deno-fmt-ignore-file
// deno-lint-ignore-file
'use strict';\n`,
      );
    });
  });
});

Deno.test("Given requirejs library header renderer", async (test) => {
  const render = renderLibHeaderSnippet;

  await test.step("when input empty", async (test) => {
    const rendered = render({});

    await test.step("it should return empty string", () => {
      assertEquals(rendered, "");
    });
  });

  await test.step("when library script use GM_getValue", async (test) => {
    const rendered = render({
      "@grant": ["GM_getValue"],
    });

    await test.step("it should receive it from config", () => {
      assertEquals(rendered, `var { GM_getValue } = module.config();\n`);
    });
  });

  await test.step("when input empty grant", async (test) => {
    const rendered = render({ "@grant": [] });

    await test.step("it should return empty string", () => {
      assertEquals(rendered, "");
    });
  });
});

Deno.test("Given requirejs application header renderer", async (test) => {
  const render = renderAppHeaderSnippet;

  await test.step("when input null", async (test) => {
    const rendered = render({});

    await test.step("it should return template", () => {
      assertEquals(
        rendered,
        `requirejs.config({
  skipDataMain: true
});

define('main', (require, exports, module) => {`,
      );
    });
  });

  await test.step("when input a grant", async (test) => {
    const rendered = render({ library1: { "@grant": ["GM_getValue"] } });

    await test.step("it should write it to config", () => {
      assertEquals(
        rendered,
        `requirejs.config({
  config: {
    "library1": { GM_getValue },
  },
  skipDataMain: true
});

define('main', (require, exports, module) => {`,
      );
    });
  });

  await test.step("when input grants", async (test) => {
    const rendered = render({
      library1: { "@grant": ["GM_getValue"] },
      library2: { "@grant": ["GM_setValue", "GM_xmlhttpRequest"] },
    });

    await test.step("it should write it to config", () => {
      assertEquals(
        rendered,
        `requirejs.config({
  config: {
    "library1": { GM_getValue },
    "library2": { GM_setValue, GM_xmlhttpRequest },
  },
  skipDataMain: true
});

define('main', (require, exports, module) => {`,
      );
    });
  });
});
