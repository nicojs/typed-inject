import { expect } from 'chai';
import { execSync } from 'child_process';
describe('typed-inject memory', () => {
  it('should not leak memory when creating and disposing child injectors', () => {
    expect(() =>
      execSync('node --max-old-space-size=100  memory-leak-worker.js', {
        cwd: __dirname,
        stdio: 'inherit',
      })
    ).not.throws();
  });
});
