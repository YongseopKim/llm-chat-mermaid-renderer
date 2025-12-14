import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

async function build() {
  const context = await esbuild.context({
    entryPoints: ['src/content/index.ts'],
    outfile: 'dist/content.js',
    bundle: true,
    minify: !isWatch,
    sourcemap: isWatch,
    target: ['chrome90'],
    format: 'iife',
    loader: { '.json': 'json' },
  });

  if (isWatch) {
    console.log('Watching for changes...');
    await context.watch();
  } else {
    await context.rebuild();
    await context.dispose();
    console.log('Build complete: dist/content.js');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
