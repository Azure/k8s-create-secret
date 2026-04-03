import {build} from 'esbuild'

await build({
   entryPoints: ['src/index.ts'],
   bundle: true,
   platform: 'node',
   target: 'node24',
   outdir: 'lib',
   format: 'esm',
   sourcemap: false,
   minify: false
})
