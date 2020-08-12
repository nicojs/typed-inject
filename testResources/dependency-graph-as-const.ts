// error: false
import { createInjector } from '../src/index';

class Baz {
  public baz = 'baz';
}

function bar(baz: Baz) {
  return { baz };
}
bar.inject = ['baz'] as const;

class Foo {
  constructor(public bar: { baz: Baz }, public baz: Baz, public qux: boolean) {}
  public static inject = ['bar', 'baz', 'qux'] as const;
}

const fooInjector = createInjector().provideValue('qux', true).provideClass('baz', Baz).provideFactory('bar', bar);

const foo: Foo = fooInjector.injectClass(Foo);
