// error: "Types of parameters 'bar' and 'args_0' are incompatible"
import { createInjector, tokens } from '../src/index';

class Foo {
  constructor(bar: string, baz: number) {}
  public static inject = tokens('baz', 'bar');
}

createInjector().provideValue('bar', 'bar').provideValue('baz', 42).injectClass(Foo).then((foo: Foo) => {});
