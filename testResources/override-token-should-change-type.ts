// error: "Type 'string' is not assignable to type 'number'"

import { createInjector } from '../src/index';

const fooProvider = createInjector().provideValue('foo', 42).provideValue('foo', 'bar');

fooProvider.resolve('foo').then((foo: number) => {});

