import { expect } from 'chai';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

describe('typed-inject memory', () => {
  it('should not leak memory when creating and disposing child injectors', () => {
    expect(() =>
      execSync('node --max-old-space-size=100  memory-leak-worker.js', {
        cwd: dirname(fileURLToPath(import.meta.url)),
        stdio: 'inherit',
      }),
    ).not.throws();
  });
});
