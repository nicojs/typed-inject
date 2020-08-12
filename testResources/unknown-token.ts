// error: "Type '[\"not-exists\"]' is not assignable to type 'readonly InjectionToken<{}>[]"

import { rootInjector, tokens } from '../src/index';

function foo(bar: string) {}
foo.inject = tokens('not-exists');

rootInjector.injectFunction(foo);
