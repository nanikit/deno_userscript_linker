import { getOrCreate, getUserscriptMap, PathMap, writeMetaJson } from "../lib/sync_map.ts";
import {
  assert,
  assertEquals,
  assertMatch,
  assertRejects,
  FakeTime,
  join,
  resolve,
} from "./deps.ts";

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
  const { name, path, metaPath } = await writeScript(directory, { name: "example" });

  await test.step("when get userscript map", async (test) => {
    const pathMap = await getUserscriptMap(directory);

    await test.step("it should return that", () => {
      assertEquals(
        pathMap,
        new Map([[null, new Map([[name, { path, metaPath }]])]]),
      );
    });
  });

  await Deno.remove(directory, { recursive: true });
});

Deno.test("Given sync directory containing an userscript having namespace", async (test) => {
  const directory = await Deno.makeTempDir();
  const { name, namespace, path, metaPath } = await writeScript(directory, {
    name: "example",
    namespace: "https://example",
  });

  await test.step("when get userscript map", async (test) => {
    const pathMap = await getUserscriptMap(directory);

    await test.step("it should return that", () => {
      assertEquals(
        pathMap,
        new Map([[namespace!, new Map([[name, { path, metaPath }]])]]),
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
          [null, new Map([[script1.name, { path: script1.path, metaPath: script1.metaPath }]])],
          [
            script2.namespace,
            new Map([[script2.name, { path: script2.path, metaPath: script2.metaPath }]]),
          ],
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

    await test.step("it should throw", async () => {
      await assertRejects(get, Error, "Duplicate userscript name: example1");
    });
  });

  await Deno.remove(directory, { recursive: true });
});

Deno.test("Given sync directory containing removed userscript", async (test) => {
  const directory = await Deno.makeTempDir();
  const uuid = "e0919104-ed19-4eb9-89fd-6b20a18572cd";
  const path = resolve(directory, `${uuid}.user.js`);
  const metaPath = resolve(directory, `${uuid}.meta.json`);
  await Promise.all([
    Deno.writeTextFile(
      path,
      `// ==UserScript==
// @name         ${uuid}
// ==/UserScript==
`,
    ),
    Deno.writeTextFile(
      metaPath,
      `{"uuid":"${uuid}","name":"${uuid}","options":{"removed":1695759428000},"lastModified":1695759428000}`,
    ),
  ]);

  await test.step("when get userscript map", async (test) => {
    const pathMap = await getUserscriptMap(directory);

    await test.step("it should return empty", () => {
      assertEquals(pathMap, new Map());
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
  const item = { path: "D:\\dav\\example.user.js", metaPath: "D:\\dav\\example.meta.json" };
  const syncMap = new Map([[null, new Map([["example", item]])]]);

  await test.step("when add same userscript", async (test) => {
    const path = getOrCreate(syncMap, {
      header: { ["@name"]: ["example"] },
      directory: "",
    });

    await test.step("it should return existing path", () => {
      assertEquals(path, item);
    });
  });
});

Deno.test("Given empty sync map", async (test) => {
  const syncMap = new Map() as PathMap;

  await test.step("when add new userscript", async (test) => {
    const { path, metaPath } = getOrCreate(syncMap, {
      header: { ["@name"]: ["example"] },
      directory: join("D:", "dav"),
    })!;

    await test.step("it should add it", () => {
      assertEquals(syncMap.size, 1);
      assertEquals(syncMap.get(null)!.size, 1);
    });

    await test.step("it should return it", () => {
      const item = syncMap.get(null)!.get("example")!;
      assertEquals(path, item.path);
      assertEquals(metaPath, item.metaPath);
    });

    await test.step("added item should contain uuid", () => {
      assert(path.startsWith(join("D:", "dav")));
      assertMatch(path, /[/\\][0-9a-f-]{36}\.user\.js$/);
      assert(metaPath.startsWith(join("D:", "dav")));
      assertMatch(metaPath, /[/\\][0-9a-f-]{36}\.meta\.json$/);
    });
  });
});

Deno.test("Given no meta.json", async (test) => {
  const time = new FakeTime(1695759428000);

  const directory = await Deno.makeTempDir();
  const path = join(directory, "example.meta.json");

  await test.step("when touch meta.json", async (test) => {
    await writeMetaJson(path, "example");

    await test.step("it should create", async () => {
      const json = await Deno.readTextFile(path);
      assertEquals(
        json,
        `{"uuid":"example","name":"example","options":{},"lastModified":${time.now}}`,
      );
    });
  });

  await Deno.remove(directory, { recursive: true });
  time.restore();
});

Deno.test("Given removed meta.json", async (test) => {
  const time = new FakeTime(1695759428000);

  const directory = await Deno.makeTempDir();
  const path = join(directory, "example.meta.json");
  await Deno.writeTextFile(
    path,
    `{"uuid":"example","name":"example","options":{"removed":1695759420000},"lastModified":0}`,
  );

  await test.step("when touch meta.json", async (test) => {
    await writeMetaJson(path, "example");

    await test.step("it should update timestamp", async () => {
      const json = await Deno.readTextFile(path);
      assertEquals(
        json,
        `{"uuid":"example","name":"example","options":{"removed":1695759420000},"lastModified":1695759428000}`,
      );
    });
  });

  await Deno.remove(directory, { recursive: true });
  time.restore();
});

async function writeScript(
  directory: string,
  { name, namespace, fileName }: { name: string; namespace?: string; fileName?: string },
) {
  const baseName = fileName ?? name;
  const path = resolve(directory, `${baseName}.user.js`);
  const metaPath = resolve(directory, `${baseName}.meta.json`);
  await Promise.all([
    Deno.writeTextFile(
      path,
      `// ==UserScript==
// @name         ${name}
${namespace ? `// @namespace    ${namespace}\n` : ""}// ==/UserScript==
`,
    ),
    Deno.writeTextFile(
      metaPath,
      `{"uuid":"${baseName}","name":"${name}","options":{},"lastModified":1695759428000}`,
    ),
  ]);

  return { name, namespace, path, metaPath };
}
