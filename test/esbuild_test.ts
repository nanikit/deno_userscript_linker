import { ky } from "../lib/deps.ts";
import { run } from "../lib/esbuild_plugin.ts";
import { _internals } from "../lib/make_bundle_header.ts";
import {
  assertEquals,
  basename,
  dirname,
  FakeTime,
  fromFileUrl,
  resolve,
  toFileUrl,
} from "./deps.ts";

const directory = dirname(fromFileUrl(import.meta.url));

const paths = {
  deps: resolve(directory, "sample_project", "deps.ts"),
  example: resolve(directory, "sample_project", "example.user.tsx"),
  library1: resolve(directory, "static", "library1.user.js"),
  library2: resolve(directory, "static", "library2.user.js"),
  expectedExample: resolve(directory, "expected_output", "example.user.js"),
  expectedLibrary1: resolve(directory, "expected_output", "library1.user.js"),
  tmp: resolve(directory, "tmp"),
  tmpInput: resolve(directory, "tmp", "input"),
  tmpOutput: resolve(directory, "tmp", "output"),
  tmpSync: resolve(directory, "tmp", "sync"),
  tmpSyncExample: resolve(directory, "tmp", "sync", "9e61de4e-18b0-46c6-8656-892faae3815b.user.js"),
  tmpSyncExampleMeta: resolve(
    directory,
    "tmp",
    "sync",
    "9e61de4e-18b0-46c6-8656-892faae3815b.meta.json",
  ),
  actualExample: resolve(directory, "tmp", "output", "example.user.js"),
  actualLibrary1: resolve(directory, "tmp", "output", "library1.user.js"),
};

Deno.test({
  name: "Given example user script",
  fn: async (test) => {
    const { time, restore } = await setup();

    await test.step("when build", async (test) => {
      await run([
        `${paths.tmpInput}/*.user.{tsx,js}`,
        ...["--output", paths.tmpOutput],
        ...["--output-sync", paths.tmpSync],
      ]);

      await test.step({
        name: "main script should match expectation",
        fn: async () => {
          const [actual, template] = await Promise.all([
            Deno.readTextFile(paths.actualExample),
            Deno.readTextFile(paths.expectedExample),
          ]);
          const expectation = template.replace(
            "{{library1}}",
            `${toFileUrl(paths.library1)}`,
          );
          assertEquals(actual, expectation);
        },
      });

      await test.step({
        name: "script 1 should match expectation",
        fn: async () => {
          const [actual, template] = await Promise.all([
            Deno.readTextFile(paths.actualLibrary1),
            Deno.readTextFile(paths.expectedLibrary1),
          ]);
          const expectation = template.replace(
            "{{library1}}",
            `${toFileUrl(paths.library1)}`,
          );
          assertEquals(actual, expectation);
        },
      });

      await test.step({
        name: "sync should contain all built scripts",
        fn: async () => {
          const [actualExample, tmpSyncExample, metaJson] = await Promise.all([
            Deno.readTextFile(paths.actualExample),
            Deno.readTextFile(paths.tmpSyncExample),
            Deno.readTextFile(paths.tmpSyncExampleMeta),
          ]);

          assertEquals(actualExample, tmpSyncExample);
          assertEquals(
            metaJson,
            `{"uuid":"9e61de4e-18b0-46c6-8656-892faae3815b","name":"main userscript","options":{},"lastModified":${time.now}}`,
          );
        },
      });
    });

    restore();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

async function setup() {
  const restoreKy = mockKy();
  const time = new FakeTime("2023-09-01T01:02:03Z");
  await prepareInput();

  return {
    time,
    restore: () => {
      time.restore();
      restoreKy();
    },
  };
}

function mockKy() {
  const kyi = ky.create({
    hooks: {
      beforeRequest: [async (request) => {
        if (request.url === "http://localhost:8080/library2.user.js") {
          return new Response(await Deno.readTextFile(paths.library2));
        }
        return new Response('"mocked"');
      }],
    },
  });
  const originalKy = _internals.ky;
  _internals.ky = kyi;

  return function restoreKy() {
    _internals.ky = originalKy;
  };
}

async function prepareInput() {
  try {
    await Deno.remove(paths.tmp, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  const inputDirectory = paths.tmpInput;
  await Deno.mkdir(inputDirectory, { recursive: true });

  await Promise.all([
    patchScriptFileUrl(paths, inputDirectory),
    Deno.copyFile(paths.deps, resolve(inputDirectory, "deps.ts")),
    Deno.copyFile(paths.library1, resolve(inputDirectory, "library1.user.js")),
    Deno.mkdir(paths.tmpOutput),
    prepareSyncDirectory(),
  ]);
}

async function prepareSyncDirectory() {
  await Deno.mkdir(paths.tmpSync);

  const uuid = basename(paths.tmpSyncExample, ".user.js");
  await Promise.all([
    Deno.copyFile(paths.example, paths.tmpSyncExample),
    Deno.writeTextFile(
      paths.tmpSyncExampleMeta,
      `{"uuid":"${uuid}","name":"main userscript","options":{},"lastModified":1693530123000}`,
    ),
  ]);
}

async function patchScriptFileUrl(
  paths: { example: string; library1: string },
  temporaryDirectory: string,
) {
  const script1 = await Deno.readTextFile(paths.example);
  const patched = script1.replace(
    "file://library1.user.js",
    `${toFileUrl(paths.library1)}`,
  );
  const patchedPath = resolve(temporaryDirectory, "example.user.tsx");
  await Deno.writeTextFile(patchedPath, patched);

  return patchedPath;
}
