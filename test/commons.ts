import { _internals } from "../lib/make_bundle_header.ts";
import { assertEquals, copy, dirname, FakeTime, fromFileUrl, join, ky, resolve } from "./deps.ts";

export const dataDirectory = resolve(dirname(fromFileUrl(import.meta.url)), "data");

export async function setup(projectName: string) {
  const time = new FakeTime("2023-09-01T01:02:03Z", { advanceRate: 1, advanceFrequency: 200 });
  const cwd = Deno.cwd();

  const tmp = await Deno.makeTempDir({ prefix: projectName });
  const project = join(dataDirectory, projectName);
  const paths = {
    input: join(project, "input"),
    output: join(project, "output"),
    tmp,
    tmpInput: join(tmp, "input"),
    tmpOutput: join(tmp, "output"),
  };

  await copy(project, tmp, { overwrite: true });
  Deno.chdir(paths.tmpInput);

  return {
    time,
    paths,
    clear: async () => {
      Deno.chdir(cwd);
      time.restore();
      await Deno.remove(paths.tmp, { recursive: true });
    },
  };
}

export function mockKy(httpRoot: string) {
  const kyi = ky.create({
    hooks: {
      beforeRequest: [
        async (request) => {
          if (request.url.startsWith("http://localhost:8080/")) {
            const relative = new URL(request.url).pathname;
            const absolute = join(httpRoot, relative);
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

export async function assertDirectoryEquals(actual: string, expected: string) {
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
