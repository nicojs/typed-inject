[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2Fnicojs%2Ftyped-inject%2Fmaster)](https://dashboard.stryker-mutator.io/reports/github.com/nicojs/typed-inject/master)
[![Build Status](https://travis-ci.org/nicojs/typed-inject.svg?branch=master)](https://travis-ci.org/nicojs/typed-inject)
[![NPM](https://img.shields.io/npm/dm/typed-inject.svg)](https://www.npmjs.com/package/typed-inject)
[![Node version](https://img.shields.io/node/v/typed-inject.svg)](https://img.shields.io/node/v/stryker-utils.svg)
[![Gitter](https://badges.gitter.im/stryker-mutator/stryker.svg)](https://gitter.im/stryker-mutator/stryker?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

# Typed Inject

> Type safe dependency injection for TypeScript

A tiny, 100% type safe dependency injection framework for TypeScript. You can inject classes, interfaces or primitives. If your project compiles, you know for sure your dependencies are resolved at runtime and have their declared types.

_If you are new to 'Dependency Injection'/'Inversion of control', please read up on it [in this blog article about it](https://medium.com/@samueleresca/inversion-of-control-and-dependency-injection-in-typescript-3040d568aabe)_

_If you want to know more about how typed-inject works, please read [my blog article about it](https://medium.com/@jansennico/advanced-typescript-type-safe-dependency-injection-873426e2cc96)_

## 🗺️ Installation

Install typed-inject locally within your project folder, like so:

```shell
npm i typed-inject
```

Or with yarn:

```shell
yarn add typed-inject
```

_Note: this package uses advanced TypeScript features. Only TS 3.0 and above is supported!_

## 🎁 Usage

An example:

```ts
import { rootInjector, tokens } from 'typed-inject';

interface Logger {
    info(message: string): void;
}

const logger: Logger = {
  info(message: string) {
    console.log(message);
  }
};

class HttpClient {
    constructor(private log: Logger) { }
    public static inject = tokens('logger');
}

class MyService {
    constructor(private http: HttpClient, private log: Logger) { }
    public static inject = tokens('httpClient', 'logger');
}

const appInjector = rootInjector
  .provideValue('logger', logger)
  .provideClass('httpClient', HttpClient);

const myService = appInjector.injectClass(MyService);
// Dependencies for MyService validated and injected
```

In this example: 

* The `logger` is injected into a new instance of `HttpClient` by value.
* The instance of `HttpClient` and the `logger` are injected into a new instance of `MyService`.

Dependencies are resolved using the static `inject` property on their classes. They must match the names given to the dependencies when configuring the injector with `provideXXX` methods. 

Expect compiler errors when you mess up the order of tokens or forget it completely.

```ts
import { rootInjector, tokens } from 'typed-inject';

// Same logger as before

class HttpClient {
    constructor(private log: Logger) { }
    // ERROR! Property 'inject' is missing in type 'typeof HttpClient' but required
}

class MyService {
    constructor(private http: HttpClient, private log: Logger) { }
    public static inject = tokens('logger', 'httpClient');
    // ERROR! Types of parameters 'http' and 'args_0' are incompatible
}

const appInjector = rootInjector
  .provideValue('logger', logger)
  .provideClass('httpClient', HttpClient);

const myService = appInjector.injectClass(MyService);
```

The error messages are a bit cryptic at times, but it sure is better than running into them at runtime.


## 💭 Motivation

JavaScript and TypeScript development already has a great dependency injection solution with [InversifyJS](https://github.com/inversify/InversifyJS). However, InversifyJS comes with 2 caveats.

### InversifyJS uses Reflect-metadata

InversifyJS works with a nice API using decorators. Decorators is in Stage 2 of ecma script proposal at the moment of writing this, so will most likely land in ESNext. However, it also is opinionated in that it requires you to use [reflect-metadata](https://rbuckton.github.io/reflect-metadata/), which [is supposed to be an ecma script proposal, but isn't yet (at the moment of writing this)](https://github.com/rbuckton/reflect-metadata/issues/96). It might take years for reflect-metadata to land in Ecma script, if it ever does.

### InversifyJS is not type-safe

InversifyJS is also _not_ type-safe. There is no check to see of the injected type is actually injectable or that the corresponding type adheres to the expected type.

## 🗝️ Type safe? How?

Type safe dependency injection works by combining awesome TypeScript features. Some of those features are:

* [Literal types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#string-literal-types)
* [Intersection types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#intersection-types)
* [Mapped types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#mapped-types)
* [Conditional types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#conditional-types)
* [Rest parameters with tuple types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#rest-parameters-with-tuple-types)

Please read [my blog article on Medium](https://medium.com/@jansennico/advanced-typescript-type-safe-dependency-injection-873426e2cc96) if you want to know how this works.

## 👶 Creating child injectors

The `Injector` interface is responsible for injecting classes or functions. However, `typed-inject` only comes with one implementation: the `rootInjector`. It can't provide any dependencies directly (expect for [magic tokens](#-magic-tokens)).

In order to do anything useful with the `rootInjector`, you'll need to create child injectors. This what you do with the `provideXXX` methods.

```ts
import { rootInjector, tokens } from 'typed-inject';
function barFactory(foo: number){ return foo + 1};
barFactory.inject = tokens('foo');
class Baz {
  constructor(bar: number){ console.log(`bar is: ${bar}`)};
  static inject = tokens('bar');
}

const childInjector = rootInjector
  .provideValue('foo', 42)
  .provideFactory('bar', barFactory)
  .provideClass('baz', Baz);
```

In the example above, a child injector is created. It can provide values for the tokens `'foo'`, `'bar'` and `'baz'`. You can create as many child injectors as you want.

The `rootInjector` always remains stateless. So don't worry about reusing it in your tests or reusing it for different parts of your application. However,
any ChildInjector _is stateful_. For example, it can [cache the injected value](#-control-lifecycle) or [keep track of stuff to dispose](#-disposing-provided-stuff)

## 🎄 Decorate your dependencies

A common use case for dependency injection is the [decorator design pattern](https://en.wikipedia.org/wiki/Decorator_pattern). It is used to dynamically add functionality to existing dependencies. Typed inject supports decoration of existing dependencies using its `provideFactory` and `provideClass` methods.

```ts
import { tokens, rootInjector } from 'typed-inject';

class Foo {
  public bar() {
    console.log ('bar!');
  }
}

function fooDecorator(foo: Foo) {
  return {
    bar() {
      console.log('before call');
      foo.bar();
      console.log('after call');
    }
  };
}
fooDecorator.inject = tokens('foo');

const fooProvider = rootInjector
  .provideClass('foo', Foo)
  .provideFactory('foo', fooDecorator);
const foo = fooProvider.resolve('foo');

foo.bar();
// => "before call"
// => "bar!"
// => "after call"
```

In this example above the `Foo` class is decorated by the `fooDecorator`.

## ♻ Control lifecycle

You can determine the lifecycle of dependencies with the third `Scope` parameter of `provideFactory` and `provideClass` methods.

```ts
function loggerFactory(target: Function | null){
  return getLogger((target && target.name) || 'UNKNOWN');
}
loggerFactory.inject('target');
class Foo {
  constructor(public log: Logger) { log.info('Foo created'); }
  static inject = tokens('log');
}

const fooProvider = injector
  .provideFactory('log', loggerFactory, Scope.Transient)
  .provideClass('foo', Foo, Scope.Singleton);
const foo = fooProvider.resolve('foo');
const fooCopy = fooProvider.resolve('foo');
const log = fooProvider.resolve('log');
console.log(foo === fooCopy); // => true
console.log(log === foo.log); // => false
```

A scope has 2 possible values. 

* `Scope.Singleton` (default value)  
Use `Scope.Singleton` to enable caching. Every time the dependency needs to be provided by the injector, the same instance is returned. Other injectors will still create their own instances, so it's only a `Singleton` for the specific injector (and child injectors created from it). In other words, 
the instance will be _scoped to the `Injector`_
* `Scope.Transient`  
Use `Scope.Transient` to completely disable cashing. You'll always get fresh instances.

## 🚮 Disposing provided stuff

Memory in JavaScript is garbage collected, so usually we don't care about cleaning up after ourselves. However, there might be a need to explicit clean up. For example removing a temp folder, or killing a child process.

As `typed-inject` is responsible for creating (providing) your dependencies, it only makes sense it is also responsible for the disposing of them. 

Any `Injector` has a `dispose` method. If you call it, the injector in turn will call `dispose` on any instance that he provided (if it has one). 

```ts
import { rootInjector } from 'typed-inject';

class Foo { 
  constructor() { console.log('Foo created'); }
  dispose(){ console.log('Foo disposed');} 
}
const fooProvider = rootInjector.provideClass('foo', Foo);
fooProvider.resolve('foo'); // => "Foo created"
await fooProvider.dispose() // => "Foo disposed"
fooProvider.resolve('foo'); // Error: Injector already disposed
```

To help you implementing the `dispose` method correctly, `typed-inject` exports the `Disposable` interface for convenience:

```ts
import { Disposable } from 'typed-inject';
class Foo implements Disposable { 
  dispose(){ } 
}
```

Dispose methods are typically `async`. For example, you might need to clean up some files or get rid of a child process. 
If you do so, your dependencies should return a promise from the `dispose` method. In turn, calling `dispose` on an `Injector` is always async.
You are responsible for the correct handling of the async behavior of the `dispose` method.
This means you should either `await` the result or attach `then`/`catch` handlers.

```ts
import { rootInjector, Disposable } from 'typed-inject';
class Foo implements Disposable { 
  dispose(): Promise<void> { 
    return Promise.resolve();
  } 
}
const fooProvider = rootInjector
  .provideClass('foo', Foo);
const foo = fooProvider.resolve('foo');
async function disposeFoo() {
  await fooProvider.dispose();
}
disposeFoo()
  .then(() => console.log('Foo disposed'))
  .catch(err => console.error('Foo disposal resulted in an error', err);
```

Using `dispose` on an injector will automatically dispose it's parent injectors as well:

```ts
import { rootInjector } from 'typed-inject';
class Foo { }
class Bar { }
const fooProvider = rootInjector.provideClass('foo', Foo);
const barProvider = fooProvider.provideClass('bar', Bar);
await barProvider.dispose(); // => fooProvider is also disposed!
fooProvider.resolve('foo'); // => Error: Injector already disposed
```

Disposing of provided values is done in order of child first. So they are disposed in the opposite order of respective `providedXXX` calls (like a stack):

```ts
import { rootInjector, tokens } from 'typed-inject';

class Foo { dispose(){ console.log('Foo disposed');} }
class Bar { dispose(){ console.log('Bar disposed');} }
class Baz { 
  static inject = tokens('foo', 'bar');
  constructor(public foo: Foo, public bar: Bar) { }
}
rootInjector
  .provideClass('foo', Foo)
  .provideClass('bar', Bar)
  .injectClass(Baz);
await fooProvider.dispose(); 
// => "Foo disposed"
// => "Bar disposed",
```

Any instance created with `injectClass` or `injectFactory` will _not_ be disposed when `dispose` is called. You were responsible for creating it, so you are also responsible for the disposing of it. In the same vain, anything provided as a value with `providedValue` will also _not_ be disposed when `dispose` is called on it's injector.

## ✨ Magic tokens

Any `Injector` instance can always inject the following tokens:

| Token name | Token value | Description |
| - | - | - | 
| `INJECTOR_TOKEN` | `'$injector'` | Injects the current injector |
| `TARGET_TOKEN` | `'$target'` | The class or function in which the current values is injected, or `undefined` if resolved directly |  

An example:

```ts
import { rootInjector, Injector, tokens, TARGET_TOKEN, INJECTOR_TOKEN } from 'typed-inject';

class Foo {
    constructor(injector: Injector<{}>, target: Function | undefined) {}
    static inject = tokens(INJECTOR_TOKEN, TARGET_TOKEN);
}

const foo = rootInjector.inject(Foo);
```


## 📖 API reference

_Note: some generic parameters are omitted for clarity._

### `Injector<TContext>`

The `Injector<TContext>` is the core interface of typed-inject. It provides the ability to inject your class or function with `injectClass` and `injectFunction` respectively. You can create new _child injectors_ from it using the `provideXXX` methods.

The `TContext` generic arguments is a [lookup type](https://blog.mariusschulz.com/2017/01/06/typescript-2-1-keyof-and-lookup-types). The keys in this type are the tokens that can be injected, the values are the exact types of those tokens. For example, if `TContext extends { foo: string, bar: number }`, you can let a token `'foo'` be injected of type `string`, and a token `'bar'` of type `number`.

Typed inject comes with only one implementation. The `rootInjector`. It implements `Injector<{}>` interface, meaning that it does not provide any tokens (except for [magic tokens](#-magic-tokens)). Import it with `import { rootInjector } from 'typed-inject'`. From the `rootInjector`, you can create child injectors. See [creating child injectors](#-creating-child-injectors) for more information.

Don't worry about reusing the `rootInjector` in your application. It is stateless and read-only, so safe for concurrent use.

#### `injector.injectClass(injectable: InjectableClass)`

This method creates a new instance of class `injectable` and returns it. 
When there are any problems in the dependency graph, it gives a compiler error.

```ts
class Foo {
    constructor(bar: number) { }
    static inject = tokens('bar');
}
const foo /*: Foo*/ = injector.injectClass(Foo);
```

#### `injector.injectFunction(fn: InjectableFunction)`

This methods injects the function with requested tokens and returns the return value of the function.
When there are any problems in the dependency graph, it gives a compiler error.

```ts
function foo(bar: number) {
    return bar + 1;
}
foo.inject = tokens('bar');
const baz /*: number*/ = injector.injectFunction(Foo);
```

#### `injector.resolve(token: Token): CorrespondingType<TContext, Token>`

The `resolve` method lets you resolve tokens by hand. 

```ts
const foo = injector.resolve('foo');
// Equivalent to:
function retrieveFoo(foo: number){
    return foo;
}
retrieveFoo.inject = tokens('foo');
const foo2 = injector.injectFunction(retrieveFoo);
```

#### `injector.provideValue(token: Token, value: R): Injector<ChildContext<TContext, Token, R>>`

Create a child injector that can provide value `value` for token `'token'`. The new child injector can resolve all tokens the parent injector can as well as `'token'`.

```ts
const fooInjector = injector.provideValue('foo', 42);
```

#### `injector.provideFactory(token: Token, factory: InjectableFunction<TContext>, scope = Scope.Singleton): Injector<ChildContext<TContext, Token, R>>`

Create a child injector that can provide a value using `factory` for token `'token'`. The new child injector can resolve all tokens the parent injector can, as well as the new `'token'`.

With `scope` you can decide whether the value must be cached after the factory is invoked once. Use `Scope.Singleton` to enable caching (default), or `Scope.Transient` to disable caching.

```ts
const fooInjector = injector.provideFactory('foo', () => 42);
function loggerFactory(target: Function | undefined) {
    return new Logger((target && target.name) || '');
}
loggerFactory.inject = tokens(TARGET_TOKEN);
const fooBarInjector = fooInjector.provideFactory('logger', loggerFactory, Scope.Transient)
```

#### `injector.provideFactory(token: Token, Class: InjectableClass<TContext>, scope = Scope.Singleton): Injector<ChildContext<TContext, Token, R>>`

Create a child injector that can provide a value using instances of `Class` for token `'token'`. The new child injector can resolve all tokens the parent injector can, as well as the new `'token'`.

Scope is also supported here, for more info, see `provideFactory`.

#### `injector.dispose(): Promise<void>`

Use `dispose` to explicitly dispose the `injector`. It will call  `dispose` on any dependency created by the injector (if it exists) using `provideClass` or `provideFactory` (**not** `provideValue` or `injectXXX`). It will also await any promise that might have been returned by `dispose`. After that, it will `dispose` it's parent injector as well.

_Note: this behavior changed since v2. Before v2, the parent injector was always disposed before the child injector._

After a child injector is disposed, you cannot us it any more. Any attempt to use it will result in a `Injector already disposed` error.

The `rootInjector` will never be disposed.

Disposing of your dependencies is always done asynchronously. You should take care to handle this appropriately. The best way to do that is to `await` the result of `myInjector.dispose()`. 

### `Scope`

The `Scope` enum indicates the scope of a provided injectable (class or factory). Possible values: `Scope.Transient` (new injection per resolve) or `Scope.Singleton` (inject once, and reuse values). It generally defaults to `Singleton`. 

### `tokens`

The `tokens` function is a simple helper method that makes sure that an `inject` array is filled with a [tuple type filled with literal strings](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#rest-parameters-with-tuple-types).

```ts
const inject = tokens('foo', 'bar');
// Equivalent to:
const inject: ['foo', 'bar'] = ['foo', 'bar'].
```

_Note: hopefully [TypeScript will introduce explicit tuple syntax](https://github.com/Microsoft/TypeScript/issues/16656), so this helper method can be removed_

### `InjectableClass<TContext, R, Tokens extends InjectionToken<TContext>[]>`

The `InjectableClass` interface is used to identify the (static) interface of classes that can be injected. It is defined as follows:

```ts
{
  new(...args: CorrespondingTypes<TContext, Tokens>): R;
  readonly inject: Tokens;
}
```

In other words, it makes sure that the `inject` tokens is corresponding with the constructor types.

### `InjectableFunction<TContext, R, Tokens extends InjectionToken<TContext>[]>`

Comparable to `InjectableClass`, but for (non-constructor) functions.

### `Disposable`

You can implement the `Disposable` interface in your dependencies. It looks like this:

```ts
interface Disposable { 
  dispose(): void;
}
```

With this, you can let the `Injector` call [your dispose method](#-disposing-provided-stuff). 

_Note:_ This is just a convenience interface. Due to TypeScripts structural typing system `typed-inject` calls your `dispose` method without you having to explicitly implement it.

## 🤝 Commendation

This entire framework would not be possible without the awesome guys working on TypeScript. Guys like [Ryan](https://github.com/RyanCavanaugh), [Anders](https://github.com/ahejlsberg) and the rest of the team: a heartfelt thanks! 💖

Inspiration for the API with static `inject` method comes from years long AngularJS development. Special thanks to the Angular team.

