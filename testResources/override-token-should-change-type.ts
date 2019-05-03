// error: "Type 'string' is not assignable to type 'number'"

import { rootInjector } from '../src/index';

const fooProvider = rootInjector
  .provideValue('foo', 42)
  .provideValue('foo', 'bar');

const foo: number = fooProvider.resolve('foo');
