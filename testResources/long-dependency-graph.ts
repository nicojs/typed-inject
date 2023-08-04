// error: false
import { createInjector, tokens } from '../src/index.js';

const rootInjector = createInjector();

class Foo {
  constructor(public qux: boolean) {}
  public static inject = tokens('qux');
}

const fooInjector = rootInjector
  .provideValue('qux', true)
  .provideClass('foo1', Foo)
  .provideClass('foo2', Foo)
  .provideClass('foo3', Foo)
  .provideClass('foo4', Foo)
  .provideClass('foo5', Foo)
  .provideClass('foo6', Foo)
  .provideClass('foo7', Foo)
  .provideClass('foo8', Foo)
  .provideClass('foo9', Foo)
  .provideClass('foo10', Foo)
  .provideClass('foo11', Foo)
  .provideClass('foo12', Foo)
  .provideClass('foo13', Foo)
  .provideClass('foo14', Foo)
  .provideClass('foo15', Foo)
  .provideClass('foo16', Foo)
  .provideClass('foo17', Foo)
  .provideClass('foo18', Foo)
  .provideClass('foo19', Foo)
  .provideClass('foo20', Foo)
  .provideClass('foo21', Foo)
  .provideClass('foo22', Foo)
  .provideClass('foo23', Foo)
  .provideClass('foo24', Foo)
  .provideClass('foo25', Foo)
  .provideClass('foo26', Foo)
  .provideClass('foo27', Foo)
  .provideClass('foo28', Foo)
  .provideClass('foo29', Foo)
  .provideClass('foo30', Foo)
  .provideClass('foo41', Foo)
  .provideClass('foo42', Foo)
  .provideClass('foo43', Foo)
  .provideClass('foo44', Foo)
  .provideClass('foo45', Foo)
  .provideClass('foo46', Foo)
  .provideClass('foo47', Foo)
  .provideClass('foo48', Foo)
  .provideClass('foo49', Foo)
  .provideClass('foo50', Foo);

const foo = fooInjector.resolve('foo50');
