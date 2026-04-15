import {build} from 'esbuild'

await build({
   entryPoints: ['src/index.ts'],
   bundle: true,
   platform: 'node',
   target: 'node20',
   outfile: 'lib/index.js',
   format: 'esm',
   banner: {
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);"
   },
   sourcemap: false,
   minify: false
})
