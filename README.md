# rollup_plugin_userscript_link

Bundle userscript with deno while leaving aside dependencies at @resource.

Simply put, it bundles [this typescript](./test/data/example.user.ts) to
[javascript](./test/data/output_expected.user.js).

## Usage

```
deno run -A https://raw.githubusercontent.com/nanikit/deno_userscript_bundler/main/mod.ts --watch target.user.ts
```

or

```
deno run -A npm:rollup -p https://raw.githubusercontent.com/nanikit/deno_userscript_bundler/main/mod.ts -i target.user.ts -o target.user.js
```

## Contributing

For now it's for personal usage, opinions are welcome.
