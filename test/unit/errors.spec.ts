import { expect } from 'chai';
import { InjectorDisposedError, InjectionError } from '../../src/index.js';

describe(InjectorDisposedError.name, () => {
  it('should be instanceof Error', () => {
    expect(new InjectorDisposedError('foo')).instanceOf(Error);
  });

  it('should format a correct message', () => {
    expect(new InjectorDisposedError('foo').message).eq(
      'Injector is already disposed. Please don\'t use it anymore. Tried to resolve [token "foo"].',
    );
    expect(new InjectorDisposedError(class Baz {}).message).eq(
      "Injector is already disposed. Please don't use it anymore. Tried to inject [class Baz].",
    );
    expect(
      new InjectorDisposedError(() => {
        // idle
      }).message,
    ).eq(
      "Injector is already disposed. Please don't use it anymore. Tried to inject [function <anonymous>].",
    );
    expect(new InjectorDisposedError(class {}).message).eq(
      "Injector is already disposed. Please don't use it anymore. Tried to inject [class <anonymous>].",
    );
    expect(
      new InjectorDisposedError(function bar() {
        // idle
      }).message,
    ).eq(
      "Injector is already disposed. Please don't use it anymore. Tried to inject [function bar].",
    );
  });
});

describe(InjectionError.name, () => {
  it('should format a correct message', () => {
    const cause = new Error('expected cause');
    function bar() {
      // idle
    }
    expect(new InjectionError([class Foo {}, bar, 'baz'], cause).message).eq(
      'Could not inject [class Foo] -> [function bar] -> [token "baz"]. Cause: expected cause',
    );
  });

  describe(InjectionError.create.name, () => {
    it('should create a new injection error for a given cause', () => {
      const cause = new Error('Expected cause');
      const actual = InjectionError.create('foo', cause);
      expect(actual.cause).eq(cause);
      expect(actual.path).deep.eq(['foo']);
    });
    it('should prepend to the path for given InjectionError', () => {
      const cause = new Error('Expected cause');
      class Foo {}
      const err = new InjectionError(['foo', Foo], cause);
      const actual = InjectionError.create('bar', err);
      expect(actual.cause).eq(cause);
      expect(actual.path).deep.eq(['bar', 'foo', Foo]);
    });
  });
});
