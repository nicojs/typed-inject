import process from 'process';
import { fileURLToPath } from 'url';
import { createInjector } from '../../src/index.js';

/**
 * Memory leak worker.
 * Run with "node --max-old-space-size=100 memory-leak-worker.js" to test wether or not typed inject has a memory leak.
 */

const rootInjector = createInjector();
const ONE_KB = 1024;
const ONE_MB = ONE_KB * ONE_KB;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

function stringFactory() {
  return new Array(ONE_MB).fill('f').join('');
}

async function main() {
  for (let i = 0; i < 200; i++) {
    const fooInjector = rootInjector.provideFactory('foo', stringFactory);
    const foo = fooInjector.resolve('foo');
    if (i % 10 === 0) {
      console.log(
        `\tIteration ${i}, foo used ${Math.floor((foo.length * i) / ONE_MB)} MB. (heap total: ${Math.floor(
          process.memoryUsage().heapTotal / ONE_MB,
        )} MB)`,
      );
    }
    await fooInjector.dispose();
  }
}
