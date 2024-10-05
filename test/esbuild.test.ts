import { join } from "../lib/deps.ts";
import { run } from "../lib/esbuild_plugin.ts";
import { assertDirectoryEquals, mockKy, setup } from "./commons.ts";
import { toFileUrl } from "./deps.ts";

Deno.test({
  name: "Given example user script",
  fn: async (test) => {
    const { paths, clear } = await complexSetup("complex");
    const { output, tmpInput, tmpOutput } = paths;

    await Promise.all([
      patchScriptFileUrl({
        example: join(tmpInput, "file/example.user.tsx"),
        library1: join(tmpInput, "file/library1.user.js"),
      }),
      clearBuildDirectory(tmpOutput),
    ]);

    await test.step("when build", async (test) => {
      await run([
        `${join(tmpInput, "file")}/*.user.{tsx,js}`,
        ...["--output", join(tmpOutput, "build")],
        ...["--output-sync", join(tmpOutput, "sync")],
      ]);

      await test.step({
        name: "build should match expectation",
        fn: async () => {
          const examplePath = join(tmpOutput, "build/example.user.js");
          const example = await Deno.readTextFile(examplePath);

          // Match with template
          await Deno.writeTextFile(
            examplePath,
            example.replace(/file:\/\/\S+/, "file://library1.user.js"),
          );

          await assertDirectoryEquals(join(output, "build"), join(tmpOutput, "build"));
        },
      });

      await test.step({
        name: "sync should match expectation",
        fn: async () => {
          const examplePath = join(tmpOutput, "sync/9e61de4e-18b0-46c6-8656-892faae3815b.user.js");
          const example = await Deno.readTextFile(examplePath);

          // Match with template
          await Deno.writeTextFile(
            examplePath,
            example.replace(/file:\/\/\S+/, "file://library1.user.js"),
          );

          await assertDirectoryEquals(join(output, "sync"), join(tmpOutput, "sync"));
        },
      });
    });

    await clear();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

async function complexSetup(name: string) {
  const suite = await setup(name);
  const restoreKy = mockKy(join(suite.paths.input, "http"));

  return {
    paths: suite.paths,
    clear: async () => {
      restoreKy();
      await suite.clear();
    },
  };
}

async function patchScriptFileUrl(paths: { example: string; library1: string }) {
  const script1 = await Deno.readTextFile(paths.example);
  const patched = script1.replace("file://library1.user.js", `${toFileUrl(paths.library1)}`);
  await Deno.writeTextFile(paths.example, patched);
}

async function clearBuildDirectory(tmpOutput: string) {
  await Deno.remove(join(tmpOutput, "build"), { recursive: true });
  await Deno.mkdir(join(tmpOutput, "build"), { recursive: true });
}
