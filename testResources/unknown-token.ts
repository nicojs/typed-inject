// error: "Type '[\"not-exists\"]' is not assignable to type 'readonly InjectionToken<{}>[]"

import { createInjector, tokens } from '../src/index';

function foo(bar: string) {}
foo.inject = tokens('not-exists');

createInjector().injectFunction(foo);
