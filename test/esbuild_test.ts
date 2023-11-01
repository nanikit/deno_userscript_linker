import { fromFileUrl, join, ky } from "../lib/deps.ts";
import { run } from "../lib/esbuild_plugin.ts";
import { _internals } from "../lib/make_bundle_header.ts";
import { assertEquals, basename, copy, dirname, FakeTime, resolve, toFileUrl } from "./deps.ts";

const dataDirectory = resolve(dirname(fromFileUrl(import.meta.url)), "data");

Deno.test({
  name: "Given example user script",
  fn: async (test) => {
    const { clone, restore } = await setup(join(dataDirectory, "complex"));

    await Promise.all([
      patchScriptFileUrl({
        example: join(clone, "input/file/example.user.tsx"),
        library1: join(clone, "input/file/library1.user.js"),
      }),
      copyForCheckNop(clone),
      Deno.mkdir(join(clone, "output/build"), { recursive: true }),
    ]);

    await test.step("when build", async (test) => {
      await run([
        `${join(clone, "input/file")}/*.user.{tsx,js}`,
        ...["--output", join(clone, "output/build")],
        ...["--output-sync", join(clone, "output/sync")],
      ]);

      await test.step({
        name: "build should match expectation",
        fn: async () => {
          const examplePath = join(clone, "output/build/example.user.js");
          const example = await Deno.readTextFile(examplePath);
          const [, result] = example.match(/@resource.*?(file:\/\/\S+)/)!;
          await Deno.stat(fromFileUrl(result!));

          // Match with template
          await Deno.writeTextFile(
            examplePath,
            example.replace(/file:\/\/\S+/, "file://library1.user.js"),
          );

          await assertDirectoryEquals(
            join(dataDirectory, "complex/output/build"),
            join(clone, "output/build"),
          );
        },
      });

      await test.step({
        name: "sync should match expectation",
        fn: async () => {
          const examplePath = join(
            clone,
            "output/sync/9e61de4e-18b0-46c6-8656-892faae3815b.user.js",
          );
          const example = await Deno.readTextFile(examplePath);
          const [, result] = example.match(/@resource.*?(file:\/\/\S+)/)!;
          await Deno.stat(fromFileUrl(result!));

          // Match with template
          await Deno.writeTextFile(
            examplePath,
            example.replace(/file:\/\/\S+/, "file://library1.user.js"),
          );

          await assertDirectoryEquals(
            join(dataDirectory, "complex/output/sync"),
            join(clone, "output/sync"),
          );
        },
      });
    });

    await restore();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

async function setup(project: string) {
  const restoreKy = mockKy(project);
  const time = new FakeTime("2023-09-01T01:02:03Z");

  const clone = await cloneDirectory(project);
  const cwd = Deno.cwd();
  Deno.chdir(join(clone, "input"));

  return {
    time,
    clone,
    restore: async () => {
      Deno.chdir(cwd);
      time.restore();
      restoreKy();
      await Deno.remove(clone, { recursive: true });
    },
  };
}

function mockKy(project: string) {
  const kyi = ky.create({
    hooks: {
      beforeRequest: [
        async (request) => {
          if (request.url.startsWith("http://localhost:8080/")) {
            const relative = new URL(request.url).pathname;
            const absolute = join(project, "input/http", relative);
            return new Response(await Deno.readTextFile(absolute));
          }
          return new Response('"mocked"');
        },
      ],
    },
  });
  const originalKy = _internals.ky;
  _internals.ky = kyi;

  return function restoreKy() {
    _internals.ky = originalKy;
  };
}

async function copyForCheckNop(clone: string) {
  await Deno.mkdir(join(clone, "output/sync"), { recursive: true });

  const uuid = "9e61de4e-18b0-46c6-8656-892faae3815b";
  await Promise.all([
    Deno.copyFile(
      join(dataDirectory, "complex/input/file/example.user.tsx"),
      join(clone, `output/sync/${uuid}.user.js`),
    ),
    Deno.writeTextFile(
      join(clone, `output/sync/${uuid}.meta.json`),
      `{"uuid":"${uuid}","name":"main userscript","options":{},"lastModified":1693530123000}`,
    ),
  ]);
}

async function patchScriptFileUrl(paths: { example: string; library1: string }) {
  const script1 = await Deno.readTextFile(paths.example);
  const patched = script1.replace("file://library1.user.js", `${toFileUrl(paths.library1)}`);
  await Deno.writeTextFile(paths.example, patched);
}

async function cloneDirectory(original: string) {
  await Deno.mkdir(resolve(dataDirectory, "tmp"), { recursive: true });
  const directory = await Deno.makeTempDir({
    dir: resolve(dataDirectory, "tmp"),
    prefix: basename(original),
  });
  await copy(original, directory, { overwrite: true });
  return directory;
}

async function assertDirectoryEquals(actual: string, expected: string) {
  const [actualFiles, expectedFiles] = await Promise.all([
    snapshotDirectory(actual),
    snapshotDirectory(expected),
  ]);
  assertEquals(actualFiles, expectedFiles);
}

// It returns name and file content recursively.
async function snapshotDirectory(directory: string) {
  const result = new Map<string, string>();

  const promises = [];
  for await (const file of Deno.readDir(directory)) {
    promises.push(insert(file));
  }
  await Promise.all(promises);

  return result;

  async function insert(file: Deno.DirEntry) {
    const path = join(directory, file.name);
    if (file.isDirectory) {
      const subResult = await snapshotDirectory(path);
      for (const [name, content] of subResult) {
        result.set(join(file.name, name), content);
      }
    } else {
      result.set(file.name, await Deno.readTextFile(path));
    }
  }
}
