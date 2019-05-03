// error: "Type 'string[]' is not assignable to type 'InjectionToken<TChildContext<{}, number, \"bar\">>[]'"

import { rootInjector } from '../src/index';

class Foo {
  constructor(bar: number) { }
  public static inject = ['bar'];
}
const foo: Foo = rootInjector
  .provideValue('bar', 42)
  .injectClass(Foo);
