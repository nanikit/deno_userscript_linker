# deno_userscript_linker

Bundle userscript with deno while leaving aside dependencies at @resource.

Simply put, it bundles [this typescript](./test/sample_project/example.user.tsx) to
[javascript](./test/expected_output/example.user.js).

## Usage

```
deno run -A https://raw.githubusercontent.com/nanikit/deno_userscript_bundler/main/mod.ts --watch target.user.ts
```

## Contributing

For now it's for personal usage, opinions are welcome.
