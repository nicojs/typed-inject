// error: "Type 'string[]' is not assignable to type 'readonly InjectionToken<TChildContext<{}, number, \"bar\">>[]'"

import { createInjector } from '../src/index';

class Foo {
  constructor(bar: number) {}
  public static inject = ['bar'];
}
createInjector().provideValue('bar', 42).injectClass(Foo).then((foo: Foo) => {});
