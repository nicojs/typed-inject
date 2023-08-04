// error: "Type 'string[]' is not assignable to type 'readonly InjectionToken<{ bar: number; }>[]'"

import { createInjector } from '../src/index.js';

class Foo {
  constructor(bar: number) {}
  public static inject = ['bar'];
}
const foo: Foo = createInjector().provideValue('bar', 42).injectClass(Foo);
