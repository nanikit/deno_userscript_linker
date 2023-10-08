import { getOrCreate, getUserscriptMap, SyncMap } from "../lib/sync_map.ts";
import { assert, assertEquals, assertMatch, assertRejects, join, resolve } from "./deps.ts";

Deno.test("Given empty sync directory", async (test) => {
  const directory = await Deno.makeTempDir();

  await test.step("when get userscript map", async (test) => {
    const pathMap = await getUserscriptMap(directory);

    await test.step("it should return empty", () => {
      assertEquals(pathMap, new Map());
    });
  });

  await Deno.remove(directory);
});

Deno.test("Given directory containing an empty directory", async (test) => {
  const directory = await Deno.makeTempDir();
  await Deno.mkdir(resolve(directory, "empty"));

  await test.step("when get userscript map", async (test) => {
    const pathMap = await getUserscriptMap(directory);

    await test.step("it should return empty", () => {
      assertEquals(pathMap, new Map());
    });
  });

  await Deno.remove(directory, { recursive: true });
});

Deno.test("Given sync directory containing an userscript", async (test) => {
  const directory = await Deno.makeTempDir();
  const { name, path } = await writeScript(directory, { name: "example" });

  await test.step("when get userscript map", async (test) => {
    const pathMap = await getUserscriptMap(directory);

    await test.step("it should return that", () => {
      assertEquals(
        pathMap,
        new Map([[null, new Map([[name, path]])]]),
      );
    });
  });

  await test.step("when get userscript map by sync map", async (test) => {
    const syncMap = await new SyncMap(directory).load();
    const result = syncMap.getOrCreate({ ["@name"]: ["example"] });

    await test.step("it should return that", () => {
      assertEquals(result, path);
    });
  });

  await Deno.remove(directory, { recursive: true });
});

Deno.test("Given sync directory containing an userscript having namespace", async (test) => {
  const directory = await Deno.makeTempDir();
  const { name, namespace, path } = await writeScript(directory, {
    name: "example",
    namespace: "https://example",
  });

  await test.step("when get userscript map", async (test) => {
    const pathMap = await getUserscriptMap(directory);

    await test.step("it should return that", () => {
      assertEquals(
        pathMap,
        new Map([[namespace!, new Map([[name, path]])]]),
      );
    });
  });

  await Deno.remove(directory, { recursive: true });
});

Deno.test("Given sync directory containing two different userscripts", async (test) => {
  const directory = await Deno.makeTempDir();
  const [script1, script2] = await Promise.all([
    writeScript(directory, { name: "example1" }),
    writeScript(directory, { name: "example2", namespace: "https://example2" }),
  ]);

  await test.step("when get userscript map", async (test) => {
    const pathMap = await getUserscriptMap(directory);

    await test.step("it should return that", () => {
      assertEquals(
        pathMap,
        new Map([
          [null, new Map([[script1.name, script1.path]])],
          [script2.namespace, new Map([[script2.name, script2.path]])],
        ]),
      );
    });
  });

  await Deno.remove(directory, { recursive: true });
});

Deno.test("Given sync directory containing two same userscripts", async (test) => {
  const directory = await Deno.makeTempDir();
  await Promise.all([
    writeScript(directory, { name: "example1" }),
    writeScript(directory, { name: "example1", fileName: "example1_copy" }),
  ]);

  await test.step("when get userscript map", async (test) => {
    const get = () => getUserscriptMap(directory);

    await test.step("it should return that", async () => {
      await assertRejects(get, Error, "Duplicate userscript name: example1");
    });
  });

  await Deno.remove(directory, { recursive: true });
});

Deno.test("Given empty sync map", async (test) => {
  const syncMap = new Map();

  await test.step("when add no header", async (test) => {
    const path = getOrCreate(syncMap, { header: {}, directory: "" });

    await test.step("it should not modify map", () => {
      assertEquals(syncMap, new Map([]));
    });

    await test.step("it should return null", () => {
      assertEquals(path, null);
    });
  });
});

Deno.test("Given sync map containing userscript", async (test) => {
  const syncMap = new Map([[null, new Map([["example", "D:\\dav\\example.user.js"]])]]);

  await test.step("when add same userscript", async (test) => {
    const path = getOrCreate(syncMap, {
      header: { ["@name"]: ["example"] },
      directory: "",
    });

    await test.step("it should return existing path", () => {
      assertEquals(path, "D:\\dav\\example.user.js");
    });
  });
});

Deno.test("Given empty sync map", async (test) => {
  const syncMap = new Map();

  await test.step("when add new userscript", async (test) => {
    const path = getOrCreate(syncMap, {
      header: { ["@name"]: ["example"] },
      directory: join("D:", "dav"),
    });

    await test.step("it should add it", () => {
      assertEquals(syncMap.size, 1);
      assertEquals(syncMap.get(null).size, 1);
    });

    await test.step("it should generate uuid", () => {
      const path = syncMap.get(null).get("example");
      assert(path.startsWith(join("D:", "dav")));
      assertMatch(path, /[/\\][0-9a-f-]{36}\.user\.js/);
    });

    await test.step("it should return it", () => {
      assert(path!.startsWith(join("D:", "dav")));
      assertMatch(path!, /[/\\][0-9a-f-]{36}\.user\.js/);
    });
  });
});

async function writeScript(
  directory: string,
  { name, namespace, fileName }: { name: string; namespace?: string; fileName?: string },
) {
  const path = resolve(directory, `${fileName ?? name}.user.js`);
  await Deno.writeTextFile(
    path,
    `// ==UserScript==
// @name         ${name}
${namespace ? `// @namespace    ${namespace}\n` : ""}// ==/UserScript==
`,
  );

  return { name, namespace, path };
}
