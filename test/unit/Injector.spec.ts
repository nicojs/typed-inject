/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-empty-function */
import { expect } from 'chai';
import { Injector } from '../../src/api/Injector';
import { tokens } from '../../src/tokens';
import { createInjector } from '../../src/InjectorImpl';
import { TARGET_TOKEN, INJECTOR_TOKEN } from '../../src/api/InjectionToken';
import { InjectionError, InjectorDisposedError } from '../../src/errors';
import { Scope } from '../../src/api/Scope';
import * as sinon from 'sinon';
import { Disposable } from '../../src/api/Disposable';
import { Task, tick } from '../helpers/Task';

describe('InjectorImpl', () => {
  let rootInjector: Injector<{}>;

  beforeEach(() => {
    rootInjector = createInjector();
  });

  describe('AbstractInjector', () => {
    it('should be able to inject injector and target in a class', async () => {
      // Arrange
      class Injectable {
        constructor(public readonly target: Function | undefined, public readonly injector: Injector<{}>) {}
        public static inject = tokens(TARGET_TOKEN, INJECTOR_TOKEN);
      }

      // Act
      const actual = await rootInjector.injectClass(Injectable);

      // Assert
      expect(actual.target).undefined;
      expect(actual.injector).eq(rootInjector);
    });

    it('should be able to inject injector and target in a lazy class', async () => {
      // Arrange
      class Injectable {
        constructor(public readonly target: Function | undefined, public readonly injector: Injector<{}>) {}
        public static inject = tokens(TARGET_TOKEN, INJECTOR_TOKEN);
      }

      const classLoader = () => Promise.resolve(Injectable);

      // Act
      const actual = await rootInjector.injectAsyncClass(classLoader);

      // Assert
      expect(actual.target).undefined;
      expect(actual.injector).eq(rootInjector);
    });

    it('should be able to inject injector and target in a function', async () => {
      // Arrange
      let actualTarget: Function | undefined;
      let actualInjector: Injector<{}> | undefined;
      const expectedResult = { result: 42 };
      function injectable(t: Function | undefined, i: Injector<{}>) {
        actualTarget = t;
        actualInjector = i;
        return expectedResult;
      }
      injectable.inject = tokens(TARGET_TOKEN, INJECTOR_TOKEN);

      // Act
      const actualResult: { result: number } = await rootInjector.injectFunction(injectable);

      // Assert
      expect(actualTarget).undefined;
      expect(actualInjector).eq(rootInjector);
      expect(actualResult).eq(expectedResult);
    });

    it('should be able to inject injector and target in an async function', async () => {
      // Arrange
      let actualTarget: Function | undefined;
      let actualInjector: Injector<{}> | undefined;
      const expectedResult = { result: 42 };
      function asyncInjectable(t: Function | undefined, i: Injector<{}>) {
        actualTarget = t;
        actualInjector = i;
        return Promise.resolve(expectedResult);
      }
      asyncInjectable.inject = tokens(TARGET_TOKEN, INJECTOR_TOKEN);

      // Act
      const actualResult: { result: number } = await rootInjector.injectFunction(asyncInjectable);

      // Assert
      expect(actualTarget).undefined;
      expect(actualInjector).eq(rootInjector);
      expect(actualResult).eq(expectedResult);
    });

    it('should be able to provide a target into a function', async () => {
      // Arrange
      function fooFactory(target: undefined | Function) {
        return `foo -> ${target && target.name}`;
      }
      fooFactory.inject = tokens(TARGET_TOKEN);
      function barFactory(target: undefined | Function, fooName: string) {
        return `${fooName} -> bar -> ${target && target.name}`;
      }
      barFactory.inject = tokens(TARGET_TOKEN, 'fooName');
      class Foo {
        constructor(public name: string) {}
        public static inject = tokens('name');
      }

      // Act
      const actualFoo = await rootInjector.provideFactory('fooName', fooFactory).provideFactory('name', barFactory).injectClass(Foo);

      // Assert
      expect(actualFoo.name).eq('foo -> barFactory -> bar -> Foo');
    });

    it('should be able to provide a target into an async function', async () => {
      // Arrange
      function fooAsyncFactory(target: undefined | Function) {
        return Promise.resolve(`foo -> ${target && target.name}`);
      }
      fooAsyncFactory.inject = tokens(TARGET_TOKEN);
      function barAsyncFactory(target: undefined | Function, fooName: string) {
        return Promise.resolve(`${fooName} -> bar -> ${target && target.name}`);
      }
      barAsyncFactory.inject = tokens(TARGET_TOKEN, 'fooName');
      class Foo {
        constructor(public name: string) {}
        public static inject = tokens('name');
      }

      // Act
      const actualFoo = await rootInjector.provideFactory('fooName', fooAsyncFactory).provideFactory('name', barAsyncFactory).injectClass(Foo);

      // Assert
      expect(actualFoo.name).eq('foo -> barAsyncFactory -> bar -> Foo');
    });

    it('should be able to provide a target into a class', async () => {
      // Arrange
      class Foo {
        constructor(public target: undefined | Function) {}
        public static inject = tokens(TARGET_TOKEN);
      }
      class Bar {
        constructor(public target: undefined | Function, public foo: Foo) {}
        public static inject = tokens(TARGET_TOKEN, 'foo');
      }

      class Baz {
        constructor(public bar: Bar, public target: Function | undefined) {}
        public static inject = tokens('bar', TARGET_TOKEN);
      }

      // Act
      const actualBaz = await rootInjector.provideClass('foo', Foo).provideClass('bar', Bar).injectClass(Baz);

      // Assert
      expect(actualBaz.target).undefined;
      expect(actualBaz.bar.target).eq(Baz);
      expect(actualBaz.bar.foo.target).eq(Bar);
    });

    it('should be able to provide a target into an async class', async () => {
      // Arrange
      class Foo {
        constructor(public target: undefined | Function) {}
        public static inject = tokens(TARGET_TOKEN);
      }
      class Bar {
        constructor(public target: undefined | Function, public foo: Foo) {}
        public static inject = tokens(TARGET_TOKEN, 'foo');
      }

      class Baz {
        constructor(public bar: Bar, public target: Function | undefined) {}
        public static inject = tokens('bar', TARGET_TOKEN);
      }

      const fooAsyncLoader = () => Promise.resolve(Foo);
      const barAsyncLoader = () => Promise.resolve(Bar);
      const bazAsyncLoader = () => Promise.resolve(Baz);

      // Act
      const actualBaz = await rootInjector
        .provideAsyncClass('foo', fooAsyncLoader)
        .provideAsyncClass('bar', barAsyncLoader)
        .injectAsyncClass(bazAsyncLoader);

      // Assert
      expect(actualBaz.target).undefined;
      expect(actualBaz.bar.target).eq(Baz);
      expect(actualBaz.bar.foo.target).eq(Bar);
    });

    it('should throw when no provider was found for a class', async () => {
      class FooInjectable {
        constructor(public foo: string) {}
        public static inject = tokens('foo');
      }
      await expect(rootInjector.injectClass(FooInjectable as any)).to.be.rejectedWith(
        InjectionError,
        'Could not inject [class FooInjectable]. Cause: No provider found for "foo"!'
      );
    });

    it('should throw when no provider was found for an async class', async () => {
      class FooInjectable {
        constructor(public foo: string) {}
        public static inject = tokens('foo');
      }

      const fooInjectableAsyncLoader = () => Promise.resolve(FooInjectable);

      await expect(rootInjector.injectAsyncClass(fooInjectableAsyncLoader as any)).to.be.rejectedWith(
        InjectionError,
        'Could not inject [function fooInjectableAsyncLoader]. Cause: No provider found for "foo"!'
      );
    });

    it('should throw when no provider was found for a function', async () => {
      function foo(bar: string) {
        return bar;
      }
      foo.inject = ['bar'];
      await expect(rootInjector.injectFunction(foo as any)).to.be.rejectedWith(
        InjectionError,
        'Could not inject [function foo]. Cause: No provider found for "bar"!'
      );
    });

    it('should be able to provide an Injector for a partial context', async () => {
      class Foo {
        constructor(public injector: Injector<{ bar: number }>) {}
        public static inject = tokens(INJECTOR_TOKEN);
      }
      const barBazInjector = rootInjector.provideValue('bar', 42).provideValue('baz', 'qux');
      const actualFoo = await barBazInjector.injectClass(Foo);
      expect(actualFoo.injector).eq(barBazInjector);
    });
  });

  describe('ChildInjector', () => {
    it('should cache the value if scope = Singleton', async () => {
      // Arrange
      let n = 0;
      function count() {
        return n++;
      }
      count.inject = tokens();
      const countInjector = rootInjector.provideFactory('count', count);
      class Injectable {
        constructor(public count: number) {}
        public static inject = tokens('count');
      }

      // Act
      const first = await countInjector.injectClass(Injectable);
      const second = await countInjector.injectClass(Injectable);

      // Assert
      expect(first.count).eq(second.count);
    });

    it('should _not_ cache the value if scope = Transient', async () => {
      // Arrange
      let n = 0;
      function count() {
        return n++;
      }
      count.inject = tokens();
      const countInjector = rootInjector.provideFactory('count', count, Scope.Transient);
      class Injectable {
        constructor(public count: number) {}
        public static inject = tokens('count');
      }

      // Act
      const first = await countInjector.injectClass(Injectable);
      const second = await countInjector.injectClass(Injectable);

      // Assert
      expect(first.count).eq(0);
      expect(second.count).eq(1);
    });
  });

  describe('ValueProvider', () => {
    it('should be able to provide a value', async () => {
      const sut = rootInjector.provideValue('foo', 42);
      const actual = await sut.injectClass(
        class {
          constructor(public foo: number) {}
          public static inject = tokens('foo');
        }
      );
      expect(actual.foo).eq(42);
    });
    it('should be able to provide a value from the parent injector', async () => {
      const sut = rootInjector.provideValue('foo', 42).provideValue('bar', 'baz');
      expect(await sut.resolve('bar')).eq('baz');
      expect(await sut.resolve('foo')).eq(42);
    });
    it('should throw after disposed', async () => {
      const sut = rootInjector.provideValue('foo', 42);
      await sut.dispose();
      await expect(sut.resolve('foo')).to.be.rejectedWith(
        InjectorDisposedError,
        'Injector is already disposed. Please don\'t use it anymore. Tried to resolve [token "foo"].'
      );
      await expect(sut.injectClass(class Bar {})).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [class Bar]."
      );
      await expect(sut.injectFunction(function baz() {})).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [function baz]."
      );
    });
  });

  describe('FactoryProvider', () => {
    it('should be able to provide the return value of the factoryMethod', async () => {
      const expectedValue = { foo: 'bar' };
      function foobar() {
        return expectedValue;
      }

      const actual = await rootInjector.provideFactory('foobar', foobar).injectClass(
        class {
          constructor(public foobar: { foo: string }) {}
          public static inject = tokens('foobar');
        }
      );
      expect(actual.foobar).eq(expectedValue);
    });

    it('should be able to provide the return value of the async factoryMethod', async () => {
      const expectedValue = { foo: 'bar' };
      function foobar() {
        return Promise.resolve(expectedValue);
      }

      const actual = await rootInjector.provideFactory('foobar', foobar).injectClass(
        class {
          constructor(public foobar: { foo: string }) {}
          public static inject = tokens('foobar');
        }
      );
      expect(actual.foobar).eq(expectedValue);
    });

    it('should be able to provide parent injector values', async () => {
      function answer() {
        return 42;
      }
      const factoryProvider = rootInjector.provideFactory('answer', answer);
      const actual = await factoryProvider.injectClass(
        class {
          constructor(public injector: Injector<{ answer: number }>, public answer: number) {}
          public static inject = tokens(INJECTOR_TOKEN, 'answer');
        }
      );
      expect(actual.injector).eq(factoryProvider);
      expect(actual.answer).eq(42);
    });

    it('should be able to provide parent injector values (async)', async () => {
      function answer() {
        return Promise.resolve(42);
      }
      const factoryProvider = rootInjector.provideFactory('answer', answer);
      const actual = await factoryProvider.injectClass(
        class {
          constructor(public injector: Injector<{ answer: number }>, public answer: number) {}
          public static inject = tokens(INJECTOR_TOKEN, 'answer');
        }
      );
      expect(actual.injector).eq(factoryProvider);
      expect(actual.answer).eq(42);
    });

    it('should throw after disposed', async () => {
      const sut = rootInjector.provideFactory('answer', function answer() {
        return 42;
      });
      await sut.dispose();
      await expect(sut.resolve('answer')).to.be.rejectedWith(
        InjectorDisposedError,
        'Injector is already disposed. Please don\'t use it anymore. Tried to resolve [token "answer"].'
      );
      await expect(sut.injectClass(class Bar {})).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [class Bar]."
      );
      await expect(sut.injectFunction(function baz() {})).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [function baz]."
      );
    });

    it('should be able to decorate an existing token', async () => {
      function incrementDecorator(n: number) {
        return ++n;
      }
      incrementDecorator.inject = tokens('answer');

      const answerProvider = rootInjector
        .provideValue('answer', 40)
        .provideFactory('answer', incrementDecorator)
        .provideFactory('answer', incrementDecorator);

      expect(await answerProvider.resolve('answer')).eq(42);
      expect(await answerProvider.resolve('answer')).eq(42);
    });

    it('should be able to change the type of a token', async () => {
      const answerProvider = rootInjector.provideValue('answer', 42).provideValue('answer', '42');
      expect(await answerProvider.resolve('answer')).eq('42');
      expect(typeof (await answerProvider.resolve('answer'))).eq('string');
    });
  });

  describe('ClassProvider', () => {
    it('should throw after disposed', async () => {
      const sut = rootInjector.provideClass('foo', class Foo {});
      await sut.dispose();
      await expect(sut.resolve('foo')).to.be.rejectedWith(
        InjectorDisposedError,
        'Injector is already disposed. Please don\'t use it anymore. Tried to resolve [token "foo"].'
      );
      await expect(sut.injectClass(class Bar {})).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [class Bar]."
      );
      await expect(sut.injectFunction(function baz() {})).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [function baz]."
      );
    });

    it('should be able to decorate an existing token', async () => {
      class Foo {
        public static inject = tokens('answer');
        constructor(innerFoo: { answer: number }) {
          this.answer = innerFoo.answer + 1;
        }
        public answer: number;
      }

      const answerProvider = rootInjector.provideValue('answer', { answer: 40 }).provideClass('answer', Foo).provideClass('answer', Foo);
      const answerService = await answerProvider.resolve('answer');

      expect(answerService.answer).eq(42);
    });
  });

  describe('AsyncClassProvider', () => {
    it('should throw after disposed', async () => {
      class Foo {}
      const classLoader = () => Promise.resolve(Foo);
      const sut = rootInjector.provideAsyncClass('foo', classLoader);
      await sut.dispose();
      await expect(sut.resolve('foo')).to.be.rejectedWith(
        InjectorDisposedError,
        'Injector is already disposed. Please don\'t use it anymore. Tried to resolve [token "foo"].'
      );
      await expect(sut.injectClass(class Bar {})).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [class Bar]."
      );
      await expect(sut.injectFunction(function baz() {})).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [function baz]."
      );
      await expect(sut.injectAsyncClass(classLoader)).to.be.rejectedWith(
        InjectorDisposedError,
        "Injector is already disposed. Please don't use it anymore. Tried to inject [function classLoader]."
      );
    });

    it('should be able to decorate an existing token', async () => {
      class Foo {
        public static inject = tokens('answer');
        constructor(innerFoo: { answer: number }) {
          this.answer = innerFoo.answer + 1;
        }
        public answer: number;
      }
      const classLoader = () => Promise.resolve(Foo);

      const answerProvider = rootInjector
        .provideValue('answer', { answer: 40 })
        .provideAsyncClass('answer', classLoader)
        .provideAsyncClass('answer', classLoader);

      const answerService = await answerProvider.resolve('answer');
      expect(answerService.answer).eq(42);
    });
  });

  describe('dispose', () => {
    it('should dispose all disposable singleton dependencies', async () => {
      // Arrange
      class Foo {
        public dispose2 = sinon.stub();
        public dispose = sinon.stub();
      }
      function barFactory(): Disposable & { dispose3(): void } {
        return { dispose: sinon.stub(), dispose3: sinon.stub() };
      }
      class Baz {
        constructor(public readonly bar: Disposable & { dispose3(): void }, public readonly foo: Foo) {}
        public static inject = tokens('bar', 'foo');
      }
      const baz = await rootInjector.provideClass('foo', Foo).provideFactory('bar', barFactory).injectClass(Baz);

      // Act
      await rootInjector.dispose();

      // Assert
      expect(baz.bar.dispose).called;
      expect(baz.foo.dispose).called;
      expect(baz.foo.dispose2).not.called;
      expect(baz.bar.dispose3).not.called;
    });

    it('should also dispose transient dependencies', async () => {
      class Foo {
        public dispose = sinon.stub();
      }
      function barFactory(): Disposable {
        return { dispose: sinon.stub() };
      }
      class Baz {
        constructor(public readonly bar: Disposable, public readonly foo: Foo) {}
        public static inject = tokens('bar', 'foo');
      }
      const baz = await rootInjector.provideClass('foo', Foo, Scope.Transient).provideFactory('bar', barFactory, Scope.Transient).injectClass(Baz);

      // Act
      await rootInjector.dispose();

      // Assert
      expect(baz.bar.dispose).called;
      expect(baz.foo.dispose).called;
    });

    it('should dispose dependencies in correct order (child first)', async () => {
      class Grandparent {
        public dispose = sinon.stub();
      }
      class Parent {
        public dispose = sinon.stub();
      }
      class Child {
        constructor(public readonly parent: Parent, public readonly grandparent: Grandparent) {}
        public static inject = tokens('parent', 'grandparent');
        public dispose = sinon.stub();
      }
      const bazProvider = rootInjector
        .provideClass('grandparent', Grandparent, Scope.Transient)
        .provideClass('parent', Parent)
        .provideClass('child', Child);
      const child = await bazProvider.resolve('child');
      const newGrandparent = await bazProvider.resolve('grandparent');

      // Act
      await rootInjector.dispose();

      // Assert
      expect(child.parent.dispose).calledBefore(child.grandparent.dispose);
      expect(child.parent.dispose).calledBefore(newGrandparent.dispose);
      expect(child.dispose).calledBefore(child.parent.dispose);
    });

    it('should not dispose injected classes or functions', async () => {
      class Foo {
        public dispose = sinon.stub();
      }
      function barFactory(): Disposable {
        return { dispose: sinon.stub() };
      }
      const foo = await rootInjector.injectClass(Foo);
      const bar = await rootInjector.injectFunction(barFactory);
      await rootInjector.dispose();
      expect(foo.dispose).not.called;
      expect(bar.dispose).not.called;
    });

    it('should not dispose providedValues', async () => {
      const disposable: Disposable = { dispose: sinon.stub() };
      const disposableProvider = rootInjector.provideValue('disposable', disposable);
      await disposableProvider.resolve('disposable');
      await disposableProvider.dispose();
      expect(disposable.dispose).not.called;
    });

    it('should not break on non-disposable dependencies', async () => {
      class Foo {
        public dispose = true;
      }
      function barFactory(): { dispose: string } {
        return { dispose: 'no-fn' };
      }
      class Baz {
        constructor(public readonly bar: { dispose: string }, public readonly foo: Foo) {}
        public static inject = tokens('bar', 'foo');
      }
      const bazInjector = rootInjector.provideClass('foo', Foo).provideFactory('bar', barFactory);
      const baz = await bazInjector.injectClass(Baz);

      // Act
      await bazInjector.dispose();

      // Assert
      expect(baz.bar.dispose).eq('no-fn');
      expect(baz.foo.dispose).eq(true);
    });

    it('should not dispose dependencies twice', async () => {
      const fooProvider = rootInjector.provideClass(
        'foo',
        class Foo implements Disposable {
          public dispose = sinon.stub();
        }
      );
      const foo = await fooProvider.resolve('foo');
      await fooProvider.dispose();
      await fooProvider.dispose();
      expect(foo.dispose).calledOnce;
    });

    it('should await dispose()', async () => {
      // Arrange
      const fooStub = sinon.stub();
      class Foo {
        public task = new Task();
        public dispose() {
          fooStub();
          return this.task.promise;
        }
      }
      const fooProvider = rootInjector.provideClass('foo', Foo);
      const foo = await fooProvider.resolve('foo');
      let resolved = false;

      // Act
      const promise = fooProvider.dispose().then(() => {
        resolved = true;
      });
      await tick(); // make sure it has a chance to fail.

      // Assert
      expect(fooStub).called;
      expect(resolved).false;
      foo.task.resolve();
      await promise;
      expect(resolved).true;
    });

    it("should dispose it's child providers", async () => {
      // Arrange
      const fooDisposeStub = sinon.stub();
      class Foo {
        public dispose() {
          fooDisposeStub();
        }
      }
      const fooProvider = rootInjector.provideClass('foo', Foo);
      await fooProvider.resolve('foo');

      // Act
      await rootInjector.dispose();

      // Assert
      expect(fooDisposeStub).called;
    });

    it('should be removed from parent on disposal', async () => {
      const root = createInjector();
      const child = root.provideValue('a', 'a');
      await child.dispose();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((root as any).childInjectors.size).eq(0);
    });

    it("should not dispose it's parent provider", async () => {
      // Arrange
      class Grandparent {
        public dispose = sinon.stub();
      }
      class Parent {
        public dispose = sinon.stub();
      }
      class Child {
        constructor(public readonly parent: Parent, public readonly grandparent: Grandparent) {}
        public static inject = tokens('parent', 'grandparent');
        public dispose = sinon.stub();
      }
      const parentProvider = rootInjector.provideClass('grandparent', Grandparent, Scope.Transient).provideClass('parent', Parent);
      const childProvider = parentProvider.provideClass('child', Child);
      const child = await childProvider.resolve('child');

      // Act
      await childProvider.dispose();

      // Assert
      expect(child.dispose).called;
      expect(child.parent.dispose).not.called;
    });
  });

  describe('dependency tree', () => {
    it('should be able to inject a dependency tree', async () => {
      // Arrange
      class Logger {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        public info(_msg: string) {}
      }
      class GrandChild {
        public baz = 'qux';
        constructor(public log: Logger) {}
        public static inject = tokens('logger');
      }
      class Child1 {
        public bar = 'foo';
        constructor(public log: Logger, public grandchild: GrandChild) {}
        public static inject = tokens('logger', 'grandChild');
      }
      class Child2 {
        public foo = 'bar';
        constructor(public log: Logger) {}
        public static inject = tokens('logger');
      }
      class Parent {
        constructor(public readonly child: Child1, public readonly child2: Child2, public readonly log: Logger) {}
        public static inject = tokens('child1', 'child2', 'logger');
      }
      const expectedLogger = new Logger();

      // Act
      const actual = await rootInjector
        .provideValue('logger', expectedLogger)
        .provideClass('grandChild', GrandChild)
        .provideClass('child1', Child1)
        .provideClass('child2', Child2)
        .injectClass(Parent);

      // Assert
      expect(actual.child.bar).eq('foo');
      expect(actual.child2.foo).eq('bar');
      expect(actual.child.log).eq(expectedLogger);
      expect(actual.child2.log).eq(expectedLogger);
      expect(actual.child.grandchild.log).eq(expectedLogger);
      expect(actual.child.grandchild.baz).eq('qux');
      expect(actual.log).eq(expectedLogger);
    });

    it('should throw an Injection error with correct message when injection failed with a runtime error', async () => {
      // Arrange
      const expectedCause = Error('Expected error');
      class GrandChild {
        public baz = 'baz';
        constructor() {
          throw expectedCause;
        }
      }
      class Child {
        public bar = 'foo';
        constructor(public grandchild: GrandChild) {}
        public static inject = tokens('grandChild');
      }
      class Parent {
        constructor(public readonly child: Child) {}
        public static inject = tokens('child');
      }

      // Act
      const act = () => rootInjector.provideClass('grandChild', GrandChild).provideClass('child', Child).injectClass(Parent);

      // Assert
      await expect(act())
        .to.eventually.be.rejected.and.be.an.instanceOf(Error)
        .and.deep.include({
          message:
            'Could not inject [class Parent] -> [token "child"] -> [class Child] -> [token "grandChild"] -> [class GrandChild]. Cause: Expected error',
          path: [Parent, 'child', Child, 'grandChild', GrandChild],
        });
    });
  });
});
