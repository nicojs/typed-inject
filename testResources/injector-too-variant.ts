// error: "Property 'foo' is missing in type '{}' but required in type '{ foo: string; }'"

import { rootInjector, Injector } from '../src/index';

const fooInjector: Injector<{ foo: string}> = rootInjector;
console.log(fooInjector);
