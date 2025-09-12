/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/unbound-method */

import { expect } from 'chai';
import * as sinon from 'sinon';

import { Injector } from '../../src/api/Injector.js';
import { tokens } from '../../src/tokens.js';
import { createInjector } from '../../src/InjectorImpl.js';
import { TARGET_TOKEN, INJECTOR_TOKEN } from '../../src/api/InjectionToken.js';
import { InjectionError, InjectorDisposedError } from '../../src/errors.js';
import { Scope } from '../../src/api/Scope.js';
import { Disposable } from '../../src/api/Disposable.js';
import { Task, tick } from '../helpers/Task.js';

describe('InjectorImpl', () => {
  let rootInjector: Injector<{}>;

  beforeEach(() => {
    rootInjector = createInjector();
  });

  describe('AbstractInjector', () => {
    it('should be able to inject injector and target in a class', () => {
      // Arrange
      class Injectable {
        constructor(
          public readonly target: Function | undefined,
          public readonly injector: Injector<{}>,
        ) {}
        public static inject = tokens(TARGET_TOKEN, INJECTOR_TOKEN);
      }

      // Act
      const actual = rootInjector.injectClass(Injectable);

      // Assert
      expect(actual.target).undefined;
      expect(actual.injector).eq(rootInjector);
    });

    it('should be able to inject injector and target in a function', () => {
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
      const actualResult: { result: number } =
        rootInjector.injectFunction(injectable);

      // Assert
      expect(actualTarget).undefined;
      expect(actualInjector).eq(rootInjector);
      expect(actualResult).eq(expectedResult);
    });

    it('should be able to provide a target into a function', () => {
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
      const actualFoo = rootInjector
        .provideFactory('fooName', fooFactory)
        .provideFactory('name', barFactory)
        .injectClass(Foo);

      // Assert
      expect(actualFoo.name).eq('foo -> barFactory -> bar -> Foo');
    });

    it('should be able to provide a target into a class', () => {
      // Arrange
      class Foo {
        constructor(public target: undefined | Function) {}
        public static inject = tokens(TARGET_TOKEN);
      }
      class Bar {
        constructor(
          public target: undefined | Function,
          public foo: Foo,
        ) {}
        public static inject = tokens(TARGET_TOKEN, 'foo');
      }

      class Baz {
        constructor(
          public bar: Bar,
          public target: Function | undefined,
        ) {}
        public static inject = tokens('bar', TARGET_TOKEN);
      }

      // Act
      const actualBaz = rootInjector
        .provideClass('foo', Foo)
        .provideClass('bar', Bar)
        .injectClass(Baz);

      // Assert
      expect(actualBaz.target).undefined;
      expect(actualBaz.bar.target).eq(Baz);
      expect(actualBaz.bar.foo.target).eq(Bar);
    });

    it('should throw when no provider was found for a class', () => {
      class FooInjectable {
        constructor(public foo: string) {}
        public static inject = tokens('foo');
      }
      expect(() => rootInjector.injectClass(FooInjectable as any)).throws(
        InjectionError,
        'Could not inject [class FooInjectable]. Cause: No provider found for "foo"!',
      );
    });

    it('should throw when no provider was found for a function', () => {
      function foo(bar: string) {
        return bar;
      }
      foo.inject = ['bar'];
      expect(() => rootInjector.injectFunction(foo as any)).throws(
        InjectionError,
        'Could not inject [function foo]. Cause: No provider found for "bar"!',
      );
    });

    it('should be able to provide an Injector for a partial context', () => {
      class Foo {
        constructor(public injector: Injector<{ bar: number }>) {}
        public static inject = tokens(INJECTOR_TOKEN);
      }
      const barBazInjector = rootInjector
        .provideValue('bar', 42)
        .provideValue('baz', 'qux');
      const actualFoo = barBazInjector.injectClass(Foo);
      expect(actualFoo.injector).eq(barBazInjector);
    });

    it('should be able to create a child injector with its own scope', async () => {
      // Arrange
      const parentInjector = rootInjector.provideValue('foo', 42);
      let fooDisposed = false;
      class Foo implements Disposable {
        constructor(public foo: number) {}
        public static inject = tokens('foo');
        public dispose(): void {
          fooDisposed = true;
        }
      }

      // Act
      const actualChildInjector = parentInjector.createChildInjector();
      const appInjector = actualChildInjector.provideClass('foo', Foo);
      appInjector.resolve('foo');

      // Assert
      await actualChildInjector.dispose();
      expect(fooDisposed).true;
      expect(() =>
        parentInjector.createChildInjector().injectFunction(() => {}),
      ).not.throw();
    });
  });

  describe('ChildInjector', () => {
    it('should cache the value if scope = Singleton', () => {
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
      const first = countInjector.injectClass(Injectable);
      const second = countInjector.injectClass(Injectable);

      // Assert
      expect(first.count).eq(second.count);
    });

    it('should _not_ cache the value if scope = Transient', () => {
      // Arrange
      let n = 0;
      function count() {
        return n++;
      }
      count.inject = tokens();
      const countInjector = rootInjector.provideFactory(
        'count',
        count,
        Scope.Transient,
      );
      class Injectable {
        constructor(public count: number) {}
        public static inject = tokens('count');
      }

      // Act
      const first = countInjector.injectClass(Injectable);
      const second = countInjector.injectClass(Injectable);

      // Assert
      expect(first.count).eq(0);
      expect(second.count).eq(1);
    });
  });

  describe('ValueProvider', () => {
    it('should be able to provide a value', () => {
      const sut = rootInjector.provideValue('foo', 42);
      const actual = sut.injectClass(
        class {
          constructor(public foo: number) {}
          public static inject = tokens('foo');
        },
      );
      expect(actual.foo).eq(42);
    });
    it('should be able to provide a value from the parent injector', () => {
      const sut = rootInjector
        .provideValue('foo', 42)
        .provideValue('bar', 'baz');
      expect(sut.resolve('bar')).eq('baz');
      expect(sut.resolve('foo')).eq(42);
    });
    it('should throw after disposed', async () => {
      const sut = rootInjector.provideValue('foo', 42);
      await sut.dispose();
      expect(() => sut.resolve('foo'))
        .throws(InjectorDisposedError)
        .which.includes({
          message:
            'Injector is already disposed. Please don\'t use it anymore. Tried to resolve [token "foo"].',
        });
      expect(() => sut.injectClass(class Bar {}))
        .throws(InjectorDisposedError)
        .which.includes({
          message:
            "Injector is already disposed. Please don't use it anymore. Tried to inject [class Bar].",
        });
      expect(() => sut.injectFunction(function baz() {}))
        .throws(InjectorDisposedError)
        .which.includes({
          message:
            "Injector is already disposed. Please don't use it anymore. Tried to inject [function baz].",
        });
    });
  });

  describe('FactoryProvider', () => {
    it('should be able to provide the return value of the factoryMethod', () => {
      const expectedValue = { foo: 'bar' };
      function foobar() {
        return expectedValue;
      }

      const actual = rootInjector.provideFactory('foobar', foobar).injectClass(
        class {
          constructor(public foobar: { foo: string }) {}
          public static inject = tokens('foobar');
        },
      );
      expect(actual.foobar).eq(expectedValue);
    });

    it('should be able to provide parent injector values', () => {
      function answer() {
        return 42;
      }
      const factoryProvider = rootInjector.provideFactory('answer', answer);
      const actual = factoryProvider.injectClass(
        class {
          constructor(
            public injector: Injector<{ answer: number }>,
            public answer: number,
          ) {}
          public static inject = tokens(INJECTOR_TOKEN, 'answer');
        },
      );
      expect(actual.injector).eq(factoryProvider);
      expect(actual.answer).eq(42);
    });

    it('should throw after disposed', async () => {
      const sut = rootInjector.provideFactory('answer', function answer() {
        return 42;
      });
      await sut.dispose();
      expect(() => sut.resolve('answer')).throws(
        'Injector is already disposed. Please don\'t use it anymore. Tried to resolve [token "answer"].',
      );
      expect(() => sut.injectClass(class Bar {})).throws(
        "Injector is already disposed. Please don't use it anymore. Tried to inject [class Bar].",
      );
      expect(() => sut.injectFunction(function baz() {})).throws(
        "Injector is already disposed. Please don't use it anymore. Tried to inject [function baz].",
      );
    });

    it('should be able to decorate an existing token', () => {
      function incrementDecorator(n: number) {
        return ++n;
      }
      incrementDecorator.inject = tokens('answer');

      const answerProvider = rootInjector
        .provideValue('answer', 40)
        .provideFactory('answer', incrementDecorator)
        .provideFactory('answer', incrementDecorator);

      expect(answerProvider.resolve('answer')).eq(42);
      expect(answerProvider.resolve('answer')).eq(42);
    });

    it('should be able to change the type of a token', () => {
      const answerProvider = rootInjector
        .provideValue('answer', 42)
        .provideValue('answer', '42');
      expect(answerProvider.resolve('answer')).eq('42');
      expect(typeof answerProvider.resolve('answer')).eq('string');
    });
  });

  describe('ClassProvider', () => {
    it('should throw after disposed', async () => {
      const sut = rootInjector.provideClass('foo', class Foo {});
      await sut.dispose();
      expect(() => sut.resolve('foo')).throws(
        'Injector is already disposed. Please don\'t use it anymore. Tried to resolve [token "foo"].',
      );
      expect(() => sut.injectClass(class Bar {})).throws(
        "Injector is already disposed. Please don't use it anymore. Tried to inject [class Bar].",
      );
      expect(() => sut.injectFunction(function baz() {})).throws(
        "Injector is already disposed. Please don't use it anymore. Tried to inject [function baz].",
      );
    });

    it('should be able to decorate an existing token', () => {
      class Foo {
        public static inject = tokens('answer');
        constructor(innerFoo: { answer: number }) {
          this.answer = innerFoo.answer + 1;
        }
        public answer: number;
      }

      const answerProvider = rootInjector
        .provideValue('answer', { answer: 40 })
        .provideClass('answer', Foo)
        .provideClass('answer', Foo);

      expect(answerProvider.resolve('answer').answer).eq(42);
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
        constructor(
          public readonly bar: Disposable & { dispose3(): void },
          public readonly foo: Foo,
        ) {}
        public static inject = tokens('bar', 'foo');
      }
      const baz = rootInjector
        .provideClass('foo', Foo)
        .provideFactory('bar', barFactory)
        .injectClass(Baz);

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
        constructor(
          public readonly bar: Disposable,
          public readonly foo: Foo,
        ) {}
        public static inject = tokens('bar', 'foo');
      }
      const baz = rootInjector
        .provideClass('foo', Foo, Scope.Transient)
        .provideFactory('bar', barFactory, Scope.Transient)
        .injectClass(Baz);

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
        constructor(
          public readonly parent: Parent,
          public readonly grandparent: Grandparent,
        ) {}
        public static inject = tokens('parent', 'grandparent');
        public dispose = sinon.stub();
      }
      const bazProvider = rootInjector
        .provideClass('grandparent', Grandparent, Scope.Transient)
        .provideClass('parent', Parent)
        .provideClass('child', Child);
      const child = bazProvider.resolve('child');
      const newGrandparent = bazProvider.resolve('grandparent');

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
      const foo = rootInjector.injectClass(Foo);
      const bar = rootInjector.injectFunction(barFactory);
      await rootInjector.dispose();
      expect(foo.dispose).not.called;
      expect(bar.dispose).not.called;
    });

    it('should not dispose providedValues', async () => {
      const disposable: Disposable = { dispose: sinon.stub() };
      const disposableProvider = rootInjector.provideValue(
        'disposable',
        disposable,
      );
      disposableProvider.resolve('disposable');
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
        constructor(
          public readonly bar: { dispose: string },
          public readonly foo: Foo,
        ) {}
        public static inject = tokens('bar', 'foo');
      }
      const bazInjector = rootInjector
        .provideClass('foo', Foo)
        .provideFactory('bar', barFactory);
      const baz = bazInjector.injectClass(Baz);

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
        },
      );
      const foo = fooProvider.resolve('foo');
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
      const foo = fooProvider.resolve('foo');
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
      fooProvider.resolve('foo');

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
        constructor(
          public readonly parent: Parent,
          public readonly grandparent: Grandparent,
        ) {}
        public static inject = tokens('parent', 'grandparent');
        public dispose = sinon.stub();
      }
      const parentProvider = rootInjector
        .provideClass('grandparent', Grandparent, Scope.Transient)
        .provideClass('parent', Parent);
      const childProvider = parentProvider.provideClass('child', Child);
      const child = childProvider.resolve('child');

      // Act
      await childProvider.dispose();

      // Assert
      expect(child.dispose).called;
      expect(child.parent.dispose).not.called;
    });
  });

  describe('resolveAll', () => {
    it('should pre-cache all singleton instances in the current scope', async () => {
      // Arrange
      const singletonSpy = sinon.spy();
      const transientSpy = sinon.spy();

      class SingletonService {
        constructor() {
          singletonSpy();
        }
      }

      function createTransientService() {
        transientSpy();
        return { transient: true };
      }

      // Create separate injectors to test resolveAll on each
      const singletonInjector = rootInjector.provideClass(
        'singleton',
        SingletonService,
        Scope.Singleton,
      );

      const bothInjector = singletonInjector.provideFactory(
        'transient',
        createTransientService,
        Scope.Transient,
      );

      // Act - resolveAll on the singleton injector
      await singletonInjector.resolveAll();

      // Assert - singleton should be cached
      expect(singletonSpy.called).to.be.true;

      // Verify cached by resolving again
      singletonInjector.resolve('singleton');
      expect(singletonSpy.callCount).to.equal(1); // Still only called once

      // Act - resolveAll on the transient injector
      await bothInjector.resolveAll();

      // Assert - transient should not be cached
      expect(transientSpy.called).to.be.false;
    });

    it('should work with nested injectors', async () => {
      // Arrange
      const service1Spy = sinon.spy();
      const service2Spy = sinon.spy();
      const service3Spy = sinon.spy();

      class Service1 {
        constructor() {
          service1Spy();
        }
      }

      class Service2 {
        constructor() {
          service2Spy();
        }
      }

      class Service3 {
        constructor() {
          service3Spy();
        }
      }

      // Create a chain of injectors
      const injector1 = rootInjector.provideClass(
        'service1',
        Service1,
        Scope.Singleton,
      );

      const injector2 = injector1.provideClass(
        'service2',
        Service2,
        Scope.Singleton,
      );

      const injector3 = injector2.provideClass(
        'service3',
        Service3,
        Scope.Singleton,
      );

      // Act - resolveAll on the last injector only resolves itself
      await injector3.resolveAll();

      // Assert - only service3 should be resolved
      expect(service3Spy.called).to.be.true;
      expect(service2Spy.called).to.be.false;
      expect(service1Spy.called).to.be.false;

      // Act - resolveAll on the middle injector
      await injector2.resolveAll();

      // Assert - service2 should now be resolved
      expect(service2Spy.called).to.be.true;
      expect(service1Spy.called).to.be.false;

      // Act - resolveAll on the first injector
      await injector1.resolveAll();

      // Assert - service1 should now be resolved
      expect(service1Spy.called).to.be.true;
    });

    it('should handle dependencies between services', async () => {
      // Arrange
      const databaseSpy = sinon.spy();
      const loggerSpy = sinon.spy();
      const serviceSpy = sinon.spy();

      class Database {
        constructor() {
          databaseSpy();
        }
      }

      class Logger {
        constructor() {
          loggerSpy();
        }
      }

      class Service {
        constructor(
          public readonly db: Database,
          public readonly logger: Logger,
        ) {
          serviceSpy();
        }
        public static inject = tokens('database', 'logger');
      }

      const injector = rootInjector
        .provideClass('database', Database, Scope.Singleton)
        .provideClass('logger', Logger, Scope.Singleton)
        .provideClass('service', Service, Scope.Singleton);

      // Act
      await injector.resolveAll();

      // Assert
      expect(databaseSpy.called).to.be.true;
      expect(loggerSpy.called).to.be.true;
      expect(serviceSpy.called).to.be.true;

      // Verify the service got correct dependencies
      const service = injector.resolve('service');
      expect(service.db).to.be.instanceOf(Database);
      expect(service.logger).to.be.instanceOf(Logger);
    });

    it('should not fail if singleton resolution throws an error', async () => {
      // Arrange
      class FailingService {
        constructor() {
          throw new Error('Service initialization failed');
        }
      }

      class WorkingService {
        constructor() {
          // This one works
        }
      }

      const injector = rootInjector
        .provideClass('failing', FailingService, Scope.Singleton)
        .provideClass('working', WorkingService, Scope.Singleton);

      // Act & Assert - should not throw
      await injector.resolveAll();

      // The working service should still be cached
      const working = injector.resolve('working');
      expect(working).to.be.instanceOf(WorkingService);

      // The failing service should still throw when accessed directly
      expect(() => injector.resolve('failing')).to.throw(
        'Service initialization failed',
      );
    });

    it('should work with factory providers', async () => {
      // Arrange
      const factorySpy = sinon.spy();
      let instanceCount = 0;

      function createService() {
        factorySpy();
        return { id: ++instanceCount };
      }

      const injector = rootInjector.provideFactory(
        'service',
        createService,
        Scope.Singleton,
      );

      // Act
      await injector.resolveAll();

      // Assert
      expect(factorySpy.called).to.be.true;

      // Verify cached
      const service1 = injector.resolve('service');
      const service2 = injector.resolve('service');
      expect(service1).to.equal(service2);
      expect(service1.id).to.equal(1);
    });

    it('should work with value providers', async () => {
      // Arrange
      const value = { config: 'test' };
      const injector = rootInjector.provideValue('config', value);

      // Act & Assert - should not throw
      await injector.resolveAll();

      // Value providers are not cached, but should not cause issues
      const config = injector.resolve('config');
      expect(config).to.equal(value);
    });

    it('should work with child injectors created via createChildInjector', async () => {
      // Arrange
      const parentSpy = sinon.spy();
      const childSpy = sinon.spy();

      class ParentService {
        constructor() {
          parentSpy();
        }
      }

      class ChildService {
        constructor() {
          childSpy();
        }
      }

      const parentInjector = rootInjector.provideClass(
        'parentService',
        ParentService,
        Scope.Singleton,
      );
      const childInjector = parentInjector.createChildInjector();
      const childWithService = childInjector.provideClass(
        'childService',
        ChildService,
        Scope.Singleton,
      );

      // Act - resolveAll on child injector should not resolve parent's providers
      await childInjector.resolveAll();

      // Assert - parent's singletons should NOT be resolved
      expect(parentSpy.called).to.be.false;

      // Act - resolveAll on parent injector
      await parentInjector.resolveAll();

      // Assert - parent's singleton should now be resolved
      expect(parentSpy.called).to.be.true;

      // Act - resolveAll on child with service
      await childWithService.resolveAll();

      // Assert - child's singleton should be resolved
      expect(childSpy.called).to.be.true;
    });
  });

  describe('dependency tree', () => {
    it('should be able to inject a dependency tree', () => {
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
        constructor(
          public log: Logger,
          public grandchild: GrandChild,
        ) {}
        public static inject = tokens('logger', 'grandChild');
      }
      class Child2 {
        public foo = 'bar';
        constructor(public log: Logger) {}
        public static inject = tokens('logger');
      }
      class Parent {
        constructor(
          public readonly child: Child1,
          public readonly child2: Child2,
          public readonly log: Logger,
        ) {}
        public static inject = tokens('child1', 'child2', 'logger');
      }
      const expectedLogger = new Logger();

      // Act
      const actual = rootInjector
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

    it('should throw an Injection error with correct message when injection failed with a runtime error', () => {
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
      const act = () =>
        rootInjector
          .provideClass('grandChild', GrandChild)
          .provideClass('child', Child)
          .injectClass(Parent);

      // Assert
      expect(act)
        .throws(InjectionError)
        .which.deep.includes({
          message:
            'Could not inject [class Parent] -> [token "child"] -> [class Child] -> [token "grandChild"] -> [class GrandChild]. Cause: Expected error',
          path: [Parent, 'child', Child, 'grandChild', GrandChild],
        });
    });
  });
});
