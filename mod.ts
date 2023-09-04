import { main } from "./lib/main.ts";
export { default } from "./lib/rollup_plugin_userscript_link.ts";

if (import.meta.main) {
  main();
}
