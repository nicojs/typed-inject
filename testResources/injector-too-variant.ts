// error: "Property 'foo' is missing in type '{}' but required in type '{ foo: string; }"

import { createInjector, Injector } from '../src/index';

const fooInjector: Injector<{ foo: string }> = createInjector();
console.log(fooInjector);
