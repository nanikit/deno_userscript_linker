import { run } from "./lib/esbuild_plugin.ts";
export { createPlugin, run } from "./lib/esbuild_plugin.ts";

if (import.meta.main) {
  main().catch(console.error);
}

async function main() {
  try {
    await run(Deno.args);
  } catch (error) {
    console.error(error);
    Deno.exit(1);
  }
}
