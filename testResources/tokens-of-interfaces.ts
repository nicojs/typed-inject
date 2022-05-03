// error: "Property 'sayFoo' is missing in type 'Bar' but required in type 'FooLike'."
import { createInjector } from '../src/index.js';

const rootInjector = createInjector();

interface FooLike {
  sayFoo(): void;
}

class FooPrinter implements FooLike {
  sayFoo(): void {
    console.log("foo!");
  }
}

class Bar {}

class Baz {
  static inject = ["foo"] as const
  constructor(private foo: FooLike) { }
  callFoo(): void {
    this.foo.sayFoo();
  }
}

const fooInjector = rootInjector.provideClass('foo', Bar);
const baz: Baz = fooInjector.injectClass(Baz);
