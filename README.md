[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2Fnicojs%2Ftyped-inject%2Fmaster)](https://dashboard.stryker-mutator.io/reports/github.com/nicojs/typed-inject/master)
[![Build Status](https://travis-ci.org/nicojs/typed-inject.svg?branch=master)](https://travis-ci.org/nicojs/typed-inject)
[![NPM](https://img.shields.io/npm/dm/typed-inject.svg)](https://www.npmjs.com/package/typed-inject)
[![Node version](https://img.shields.io/node/v/typed-inject.svg)](https://img.shields.io/node/v/stryker-utils.svg)
[![Gitter](https://badges.gitter.im/stryker-mutator/stryker.svg)](https://gitter.im/stryker-mutator/stryker?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

# Typed Inject

> Typesafe dependency injection for TypeScript

A tiny, 100% typesafe dependency injection framework for TypeScript. You can inject classes, interfaces, or primitives. If your project compiles, you know your dependencies are resolved at runtime and have their declared types.

_If you are new to 'Dependency Injection'/'Inversion of control', please read up on it [in this blog article about it](https://medium.com/@samueleresca/inversion-of-control-and-dependency-injection-in-typescript-3040d568aabe)_

_If you want to know more about how typed-inject works, please read [my blog article about it](https://medium.com/@jansennico/advanced-typescript-type-safe-dependency-injection-873426e2cc96)_

- [🗺️ Installation](#installation)
- [🎁 Usage](#usage)
- [💭 Motivation](#motivation)
- [🗝️ Typesafe? How?](#typesafe-how)
- [👶 Child injectors](#child-injectors)
- [🎄 Decorate your dependencies](#decorate-your-dependencies)
- [♻ Lifecycle control](#lifecycle-control)
- [🚮 Disposing provided stuff](#disposing-provided-stuff)
- [✨ Magic tokens](#magic-tokens)
- [😬 Error handling](#error-handling)
- [📖 API reference](#api-reference)
- [🤝 Commendation](#commendation)

<a name="installation"></a>

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

_Note: due to a [bug in TypeScript >3.8 <4.5](https://github.com/microsoft/TypeScript/issues/37400) there is a small chance that the compiler [doesn't catch all errors](https://github.com/nicojs/typed-inject/issues/20) (as well as you might experience some performance issues)._

_Note: projects must enable [`--strictFunctionTypes`](https://www.typescriptlang.org/tsconfig#strictFunctionTypes) (or `--strict`) in their Typescript config or some type errors may not be caught._

<a name="usage"></a>

## 🎁 Usage

An example:

```ts
import { createInjector } from 'typed-inject';

interface Logger {
  info(message: string): void;
}

const logger: Logger = {
  info(message: string) {
    console.log(message);
  },
};

class HttpClient {
  constructor(private log: Logger) {}
  public static inject = ['logger'] as const;
}

class MyService {
  constructor(
    private http: HttpClient,
    private log: Logger,
  ) {}
  public static inject = ['httpClient', 'logger'] as const;
}

const appInjector = createInjector()
  .provideValue('logger', logger)
  .provideClass('httpClient', HttpClient);

const myService = appInjector.injectClass(MyService);
// Dependencies for MyService validated and injected
```

In this example:

- The `logger` is injected into a new instance of `HttpClient` by value.
- The instance of `HttpClient` and the `logger` are injected into a new instance of `MyService`.

Dependencies are resolved using the static `inject` property in their classes. They must match the names given to the dependencies when configuring the injector with `provideXXX` methods.

Expect compiler errors when you mess up the order of tokens or forget it completely.

```ts
import { createInjector } from 'typed-inject';

// Same logger as before

class HttpClient {
  constructor(private log: Logger) {}
  // ERROR! Property 'inject' is missing in type 'typeof HttpClient' but required
}

class MyService {
  constructor(
    private http: HttpClient,
    private log: Logger,
  ) {}
  public static inject = ['logger', 'httpClient'] as const;
  // ERROR! Types of parameters 'http' and 'args_0' are incompatible
}

const appInjector = createInjector()
  .provideValue('logger', logger)
  .provideClass('httpClient', HttpClient);

const myService = appInjector.injectClass(MyService);
```

The error messages are a bit cryptic at times, but it sure is better than running into them at runtime.

<a name="motivation"></a>

## 💭 Motivation

JavaScript and TypeScript development already has a great dependency injection solution with [InversifyJS](https://github.com/inversify/InversifyJS). However, InversifyJS comes with 2 caveats.

### InversifyJS uses Reflect-metadata

InversifyJS works with a nice API using decorators. Decorators are in Stage 2 of ecma script proposal at the moment of writing this, so they will most likely land in ESNext. However, it also is opinionated in that it requires you to use [reflect-metadata](https://rbuckton.github.io/reflect-metadata/), which [is supposed to be an ecma script proposal, but isn't yet (at the moment of writing this)](https://github.com/rbuckton/reflect-metadata/issues/96). It might take years for reflect-metadata to land in JavaScript, if it ever does.

### InversifyJS is not typesafe

InversifyJS is also _not_ typesafe. There is no check to see of the injected type is actually injectable or that the corresponding type adheres to the expected type.

<a name="typesafe-how"></a>

## 🗝️ Typesafe? How?

Type safe dependency injection works by combining excellent TypeScript features. Some of those features are:

- [Literal types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#string-literal-types)
- [Intersection types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#intersection-types)
- [Mapped types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#mapped-types)
- [Conditional types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#conditional-types)
- [Rest parameters with tuple types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#rest-parameters-with-tuple-types)

Please read [my blog article on Medium](https://medium.com/@jansennico/advanced-typescript-type-safe-dependency-injection-873426e2cc96) if you want to know how this works.

<a name="child-injectors"></a>

## 👶 Child injectors

The `Injector` interface is responsible for injecting classes or functions. You start off with an empty injector after calling `createInjector`. It can't provide any dependencies directly (except for [magic tokens](#-magic-tokens)).

To do anything useful with your injector, you'll need to create child injectors. This what you do with the `provideXXX` methods.

```ts
import { createInjector } from 'typed-inject';
function barFactory(foo: number) {
  return foo + 1;
}
barFactory.inject = ['foo'] as const;
class Baz {
  constructor(bar: number) {
    console.log(`bar is: ${bar}`);
  }
  static inject = ['bar'] as const;
}

// Create 3 child injectors here
const childInjector = createInjector()
  .provideValue('foo', 42) // child injector can provide 'foo'
  .provideFactory('bar', barFactory) // child injector can provide both 'bar' and 'foo'
  .provideClass('baz', Baz); // child injector can provide 'baz', 'bar' and 'foo'

// Now use it here
function run(baz: Baz) {
  // baz is created!
}
run.inject = ['baz'] as const;
childInjector.injectFunction(run);
```

In the example above, a child injector is created. It can provide values for the tokens `'foo'`, `'bar'` and `'baz'`. You can create as many child injectors as you want.

Injectors keep track of their child injectors and values they've injected. This way it can provide functionality like [cache the injected value](#-control-lifecycle) or [keep track of stuff to dispose](#-disposing-provided-stuff).

<a name="decorate-your-dependencies"></a>

## 🎄 Decorate your dependencies

A common use case for dependency injection is the [decorator design pattern](https://en.wikipedia.org/wiki/Decorator_pattern). It is used to dynamically add functionality to existing dependencies. Typed inject supports decoration of existing dependencies using its `provideFactory` and `provideClass` methods.

```ts
import { createInjector } from 'typed-inject';

class Foo {
  public bar() {
    console.log('bar!');
  }
}

function fooDecorator(foo: Foo) {
  return {
    bar() {
      console.log('before call');
      foo.bar();
      console.log('after call');
    },
  };
}
fooDecorator.inject = ['foo'] as const;

const fooProvider = createInjector()
  .provideClass('foo', Foo)
  .provideFactory('foo', fooDecorator);
const foo = fooProvider.resolve('foo');

foo.bar();
// => "before call"
// => "bar!"
// => "after call"
```

In this example above the `Foo` class is decorated by the `fooDecorator`.

<a name="lifecycle-control"></a>

## ♻ Lifecycle control

You can determine the lifecycle of dependencies with the third `Scope` parameter of `provideFactory` and `provideClass` methods.

```ts
function loggerFactory(target: Function | null) {
  return getLogger((target && target.name) || 'UNKNOWN');
}
loggerFactory.inject = ['target'] as const;

class Foo {
  constructor(public log: Logger) {
    log.info('Foo created');
  }
  static inject = ['log'] as const;
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

- `Scope.Singleton` (default value)  
  Use `Scope.Singleton` to enable caching. Every time the dependency needs to be provided by the injector, the same instance is returned. Other injectors will still create their own instances, so it's only a `Singleton` for the specific injector (and child injectors created from it). In other words,
  the instance will be _scoped to the `Injector`_
- `Scope.Transient`  
  Use `Scope.Transient` to altogether disable cashing. You'll always get fresh instances.

<a name="disposing-provided-stuff"></a>

## 🚮 Disposing provided stuff

Memory in JavaScript is garbage collected, so, we usually don't care about cleaning up after ourselves. However, there might be a need to explicit cleanup. For example removing a temp folder, or killing a child process.

As `typed-inject` is responsible for creating (providing) your dependencies, it only makes sense it is also responsible for the disposing of them.

Any `Injector` has a `dispose` method. Calling it will call `dispose` on any instance that was ever provided from it, as well as any child injectors that were created from it.

```ts
import { createInjector } from 'typed-inject';

class Foo {
  constructor() {
    console.log('Foo created');
  }
  dispose() {
    console.log('Foo disposed');
  }
}
const rootInjector = createInjector();
const fooProvider = rootInjector.provideClass('foo', Foo);
fooProvider.resolve('foo'); // => "Foo created"
await rootInjector.dispose(); // => "Foo disposed"
fooProvider.resolve('foo'); // Error: Injector already disposed
```

_Note: Always dispose from the top down! In this example, the `rootInjector` is disposed, which in turn disposes everything that was ever provided from one if it's child injectors._

To help you implementing the `dispose` method correctly, `typed-inject` exports the `Disposable` interface for convenience:

```ts
import { Disposable } from 'typed-inject';
class Foo implements Disposable {
  dispose() {}
}
```

Dispose methods are typically `async`. For example, you might need to clean up some files or get rid of a child process.
If you do so, your dependencies should return a promise from the `dispose` method. In turn, calling `dispose` on an `Injector` is always async.
You are responsible for the correct handling of the async behavior of the `dispose` method.
This means you should either `await` the result or attach `then`/`catch` handlers.

```ts
import { createInjector, Disposable } from 'typed-inject';
class Foo implements Disposable {
  dispose(): Promise<void> {
    return Promise.resolve();
  }
}
const rootInjector = createInjector();
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

Using `dispose` on the rootInjector will automatically dispose it's child injectors as well:

```ts
import { createInjector } from 'typed-inject';
class Foo {}
class Bar {}
const rootInjector = createInjector();
const fooProvider = rootInjector.provideClass('foo', Foo);
const barProvider = fooProvider.provideClass('bar', Bar);
await rootInjector.dispose(); // => fooProvider is also disposed!
fooProvider.resolve('foo'); // => Error: Injector already disposed
```

Disposing of provided values is done in order of child first. So they are disposed in the opposite order of respective `providedXXX` calls (like a stack):

```ts
import { createInjector } from 'typed-inject';

class Foo {
  dispose() {
    console.log('Foo disposed');
  }
}
class Bar {
  dispose() {
    console.log('Bar disposed');
  }
}
class Baz {
  static inject = ['foo', 'bar'] as const;
  constructor(
    public foo: Foo,
    public bar: Bar,
  ) {}
}
const rootInjector = createInjector();
rootInjector.provideClass('foo', Foo).provideClass('bar', Bar).injectClass(Baz);
await fooProvider.dispose();
// => "Foo disposed"
// => "Bar disposed",
```

Any instance created with `injectClass` or `injectFactory` will _not_ be disposed when `dispose` is called. You were responsible for creating it, so you are also responsible for the disposing of it. In the same vain, anything provided as a value with `providedValue` will also _not_ be disposed when `dispose` is called on it's injector.

<a name="magic-tokens"></a>

## ✨ Magic tokens

Any `Injector` instance can always provide the following tokens:

| Token name       | Token value   | Description                                                                                         |
| ---------------- | ------------- | --------------------------------------------------------------------------------------------------- |
| `INJECTOR_TOKEN` | `'$injector'` | Injects the current injector                                                                        |
| `TARGET_TOKEN`   | `'$target'`   | The class or function in which the current values are injected, or `undefined` if resolved directly |

An example:

```ts
import {
  createInjector,
  Injector,
  TARGET_TOKEN,
  INJECTOR_TOKEN,
} from 'typed-inject';

class Foo {
  constructor(injector: Injector<{}>, target: Function | undefined) {}
  static inject = [INJECTOR_TOKEN, TARGET_TOKEN] as const;
}

const foo = createInjector().inject(Foo);
```

<a name="error-handling"></a>

## 😬 Error handling

When a runtime error occurs, typed inject will provide you with the exact path where the error occurred.

```ts
class GrandChild {
  public baz = 'baz';
  constructor() {
    throw expectedCause;
  }
}
class Child {
  public bar = 'foo';
  constructor(public grandchild: GrandChild) {}
  public static inject = ['grandChild'] as const;
}
class Parent {
  constructor(public readonly child: Child) {}
  public static inject = ['child'] as const;
}
createInjector()
  .provideClass('grandChild', GrandChild)
  .provideClass('child', Child)
  .injectClass(Parent);
// => Error: Could not inject [class Parent] -> [token "child"] -> [class Child] -> [token "grandChild"] -> [class GrandChild]. Cause: Expected error
```

When you handle the error, you will be able to capture the original `cause`.

```ts
import { InjectionError } from 'typed-inject';
try {
  createInjector()
    .provideClass('grandChild', GrandChild)
    .provideClass('child', Child)
    .injectClass(Parent);
} catch (err) {
  if (err instanceof InjectionError) {
    console.error(err.cause.stack);
  }
}
```

<a name="api-reference"></a>

## 📖 API reference

_Note: some generic parameters are omitted for clarity._

### `createInjector`

Create a new `Injector<{}>`. You generally want to create one per application/request. If you're using `typed-inject` also in your unit tests, you probably want to create a fresh one for each test, for example in global test setup.

### `Injector<TContext>`

The `Injector<TContext>` is the core interface of typed-inject. It provides the ability to inject your class or function with `injectClass` and `injectFunction` respectively. You can create new _child injectors_ from it using the `provideXXX` methods.

The `TContext` generic argument is a [lookup type](https://blog.mariusschulz.com/2017/01/06/typescript-2-1-keyof-and-lookup-types). The keys in this type are the tokens that can be injected, the values are the exact types of those tokens. For example, if `TContext extends { foo: string, bar: number }`, you can let a token `'foo'` be injected of type `string`, and a token `'bar'` of type `number`.

Typed inject comes with only one implementation. The `rootInjector`. It implements `Injector<{}>` interface, meaning that it does not provide any tokens (except for [magic tokens](#-magic-tokens)). Import it with `import { rootInjector } from 'typed-inject'`. From the `rootInjector`, you can create child injectors. See [creating child injectors](#-creating-child-injectors) for more information.

#### `injector.injectClass(injectable: InjectableClass)`

This method creates a new instance of class `injectable` by populating its constructor arguments from the injector and returns it.

Basically it is a shortcut for resolving values from the injector and creating a new instance with those values:

```ts
const logger = appInjector.resolve('logger');
const httpClient = appInjector.resolve('httpClient');
const service = new MyService(httpClient, logger);
```

Any instance created with `injectClass` will not be disposed when `dispose` is called. It is the caller's responsiblity to dispose it.

When there are any problems in the dependency graph, it gives a compiler error.

```ts
class Foo {
  constructor(bar: number) {}
  static inject = ['bar'] as const;
}
const foo /*: Foo*/ = injector.injectClass(Foo);
```

#### `injector.injectFunction(fn: InjectableFunction)`

This method injects the function with requested tokens from the injector, invokes it and returns the result.

It is a shortcut for calling the provided function with the values from the injector.

```ts
const logger = appInjector.resolve('logger');
const httpClient = appInjector.resolve('httpClient');
const request = doRequest(httpClient, logger);
```

When there are any problems in the dependency graph, it gives a compiler error.

```ts
function foo(bar: number) {
  return bar + 1;
}
foo.inject = ['bar'] as const;
const baz /*: number*/ = injector.injectFunction(Foo);
```

#### `injector.resolve(token: Token): CorrespondingType<TContext, Token>`

The `resolve` method lets you resolve tokens by hand.

```ts
const foo = injector.resolve('foo');
// Equivalent to:
function retrieveFoo(foo: number) {
  return foo;
}
retrieveFoo.inject = ['foo'] as const;
const foo2 = injector.injectFunction(retrieveFoo);
```

#### `injector.provideValue(token: Token, value: R): Injector<ChildContext<TContext, Token, R>>`

Create a child injector that can provide value `value` for token `'token'`. The new child injector can resolve all tokens the parent injector can as well as `'token'`.

```ts
const fooInjector = injector.provideValue('foo', 42);
```

#### `injector.provideFactory(token: Token, factory: InjectableFunction<TContext>, scope = Scope.Singleton): Injector<ChildContext<TContext, Token, R>>`

Create a child injector that can provide a value using `factory` for token `'token'`. The new child injector can resolve all tokens the parent injector can and the new `'token'`.

With `scope` you can decide whether the value must be cached after the factory is invoked once. Use `Scope.Singleton` to enable caching (default), or `Scope.Transient` to disable caching.

```ts
const fooInjector = injector.provideFactory('foo', () => 42);
function loggerFactory(target: Function | undefined) {
  return new Logger((target && target.name) || '');
}
loggerFactory.inject = [TARGET_TOKEN] as const;
const fooBarInjector = fooInjector.provideFactory(
  'logger',
  loggerFactory,
  Scope.Transient,
);
```

#### `injector.provideClass(token: Token, Class: InjectableClass<TContext>, scope = Scope.Singleton): Injector<ChildContext<TContext, Token, R>>`

Create a child injector that can provide a value using instances of `Class` for token `'token'`. The new child injector can resolve all tokens the parent injector can, as well as the new `'token'`.

Scope is also supported here, for more info, see `provideFactory`.

#### `injector.createChildInjector(): Injector<TContext>`

Create a child injector that can provide exactly the same as the parent injector. Contrary to its `provideXxx` counterparts,this will create a new disposable scope without providing additional injectable values.

```ts
const parentInjector = createInjector().provideValue('foo', 'bar');
for (const task of tasks) {
  try {
    const scope = parentInjector.createChildInjector();
    const foo = scope.provideClass('baz', DisposableBaz).injectClass(Foo);
    foo.handle(task);
  } finally {
    await scope.dispose(); // Dispose the scope, including instances of DisposableBaz
    // Next task gets a fresh scope
  }
}
```

#### `injector.dispose(): Promise<void>`

Use `dispose` to explicitly dispose the `injector`. This will result in the following (in order):

1. Call `dispose` on each child injector created from this injector.
2. It will call `dispose` on any dependency created by the injector (if it exists) using `provideClass` or `provideFactory` (**not** `provideValue` or `injectXXX`).
3. It will also await any promise that might have been returned by disposable dependencies.

_Note: this behavior changed since v2. Before v2, the parent injector was always disposed before the child injector._
_Note: this behavior changed again in v3, calling `dispose` on a child injector will **no longer** dispose it's parent injector and instead will dispose it's child injectors. The order of disposal is still child first._

After an injector is disposed, you cannot use it anymore. Any attempt to do so will result in an `InjectorDisposedError` error.

Disposing of your dependencies is always done asynchronously. You should take care to handle this appropriately. The best way to do that is to `await` the result of `myInjector.dispose()`.

### `Scope`

The `Scope` enum indicates the scope of a provided injectable (class or factory). Possible values: `Scope.Transient` (new injection per resolve) or `Scope.Singleton` (inject once, and reuse values). It generally defaults to `Singleton`.

### `tokens`

The `tokens` function is a simple helper method that makes sure that an `inject` array is filled with a [readonly tuple type filled with literal strings](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#rest-parameters-with-tuple-types). It is mostly there for backward compatibility reasons, since we can now use `as const`, but one might also simply prefer to use `tokens` instead.

```ts
const inject = tokens('foo', 'bar');
// Equivalent to:
const inject = ['foo', 'bar'] as const;
```

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

### `InjectionError`

The error class of which instances are thrown when an error occurs during injection or dependency resolving.

An example:

```ts
const explosion = new Error('boom!');
class Boom {
  constructor() {
    throw explosion;
  }
}
class Prison {
  constructor(public readonly child: Boom) {}
  public static inject = ['boom'] as const;
}
try {
  rootInjector.provideClass('boom', Boom).injectClass(Prison);
} catch (error) {
  if (error instanceof InjectionError) {
    error.path[0] === Prison;
    error.path[1] === 'boom';
    error.path[2] === Boom;
    error.cause === explosion;
  }
}
```

#### `InjectionError.path`

This will contain the path that was taken to get to the error.

#### `InjectionError.cause`

The original cause of the injection error.

<a name="commendation"></a>

## 🤝 Commendation

This entire framework would not be possible without the awesome guys working on TypeScript. Guys like [Ryan](https://github.com/RyanCavanaugh), [Anders](https://github.com/ahejlsberg) and the rest of the team: a heartfelt thanks! 💖

Inspiration for the API with static `inject` method comes from years-long AngularJS development. Special thanks to the Angular team.
