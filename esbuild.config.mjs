import {build} from 'esbuild'

await build({
   entryPoints: ['src/index.ts'],
   bundle: true,
   platform: 'node',
   target: 'node24',
   outfile: 'lib/index.js',
   format: 'esm',
   banner: {
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);"
   },
   sourcemap: false,
   minify: false
})
