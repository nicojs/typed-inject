// error: "Unused '@ts-expect-error' directive."

import { createInjector, Injector } from '../src/index';

// @ts-expect-error Property 'foo' is missing in type '{}' but required in type '{ foo: string; }'
const fooInjector: Injector<{ foo: string }> = createInjector();
console.log(fooInjector);
