import { InjectableClass, InjectableFunction } from './Injectable.js';
import { InjectionToken } from './InjectionToken.js';
import { Scope } from './Scope.js';
import { TChildContext } from './TChildContext.js';

export interface Injector<TContext = {}> {
  /**
   * This method creates a new instance of class `injectable` by populating its constructor arguments from the injector and returns it.
   * @param Class The class to instantiate.
   */
  injectClass<R, Tokens extends readonly InjectionToken<TContext>[]>(
    Class: InjectableClass<TContext, R, Tokens>,
  ): R;
  /**
   * This method injects the function with requested tokens from the injector, invokes it and returns the result.
   * @param fn The function to inject.
   */
  injectFunction<R, Tokens extends readonly InjectionToken<TContext>[]>(
    fn: InjectableFunction<TContext, R, Tokens>,
  ): R;
  /**
   * Resolve tokens by hand.
   * @param token The token to resolve.
   */
  resolve<Token extends keyof TContext>(token: Token): TContext[Token];
  /**
   * Create a child injector that can provide a value using `value` for token `'token'`. The new child injector can resolve all tokens the parent injector can, as well as the new `'token'`.
   * @param token The token to associate with the value.
   * @param value The value to provide.
   */
  provideValue<Token extends string, R>(
    token: Token,
    value: R,
  ): Injector<TChildContext<TContext, R, Token>>;
  /**
   * Create a child injector that can provide a value using instances of `Class` for token `'token'`. The new child injector can resolve all tokens the parent injector can, as well as the new `'token'`.
   * @param token The token to associate with the value.
   * @param Class The class to instantiate to provide the value.
   * @param scope Decide whether the value must be cached after the factory is invoked once. Use `Scope.Singleton` to enable caching (default), or `Scope.Transient` to disable caching.
   */
  provideClass<
    Token extends string,
    R,
    Tokens extends readonly InjectionToken<TContext>[],
  >(
    token: Token,
    Class: InjectableClass<TContext, R, Tokens>,
    scope?: Scope,
  ): Injector<TChildContext<TContext, R, Token>>;
  /**
   * Create a child injector that can provide a value using `factory` for token `'token'`. The new child injector can resolve all tokens the parent injector can and the new `'token'`.
   * @param token The token to associate with the value.
   * @param factory A function that creates a value using instances of the tokens in `'Tokens'`.
   * @param scope Decide whether the value must be cached after the factory is invoked once. Use `Scope.Singleton` to enable caching (default), or `Scope.Transient` to disable caching.
   */
  provideFactory<
    Token extends string,
    R,
    Tokens extends readonly InjectionToken<TContext>[],
  >(
    token: Token,
    factory: InjectableFunction<TContext, R, Tokens>,
    scope?: Scope,
  ): Injector<TChildContext<TContext, R, Token>>;

  /**
   * Create a child injector that can provide exactly the same as the parent injector.
   * Contrary to its `provideXxx` counterparts,this will create a new disposable scope without providing additional injectable values.
   * @example
   * ```ts
   * const parentInjector = createInjector().provideValue('foo', 'bar');
   * for(const task of tasks) {
   *   try {
   *     const scope = parentInjector.createChildInjector();
   *     const foo = scope.provideClass('baz', DisposableBaz).injectClass(Foo);
   *     foo.handle(task);
   *   } finally {
   *     await scope.dispose(); // Dispose the scope, including instances of DisposableBaz
   *     // Next task gets a fresh scope
   *   }
   * }
   * ```
   **/
  createChildInjector(): Injector<TContext>;

  /**
   * Explicitly dispose the `injector`.
   * @see {@link https://github.com/nicojs/typed-inject?tab=readme-ov-file#disposing-provided-stuff}
   */
  dispose(): Promise<void>;
}
