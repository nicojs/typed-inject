// error: "Property 'inject' is missing in type '(injector: Function | Injector<{}> | undefined) => void' but required"
import { createInjector, Injector } from '../src/index.js';
function foo(injector: Function | Injector<{}> | undefined) {}
createInjector().injectFunction(foo);
