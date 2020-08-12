// error: "Property 'inject' is missing in type 'typeof Foo'"
import { createInjector, Injector } from '../src/index';

createInjector().injectClass(
  class Foo {
    constructor(public injector: Function | Injector<{}> | undefined) {}
  }
);
