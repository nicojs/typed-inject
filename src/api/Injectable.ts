import { CorrespondingTypes } from './CorrespondingType';
import { InjectionToken } from './InjectionToken';

export type InjectableClass<TContext, R, Tokens extends readonly InjectionToken<TContext>[]> =
  | ClassWithInjections<TContext, R, Tokens>
  | ClassWithoutInjections<R>;

export type InjectableAsyncClass<TContext, R, Tokens extends readonly InjectionToken<TContext>[]> = () =>
  | AsyncClassWithInjections<TContext, R, Tokens>
  | AsyncClassWithoutInjections<R>;

export interface ClassWithInjections<TContext, R, Tokens extends readonly InjectionToken<TContext>[]> {
  new (...args: CorrespondingTypes<TContext, Tokens>): R;
  readonly inject: Tokens;
}
export type AsyncClassWithInjections<TContext, R, Tokens extends readonly InjectionToken<TContext>[]> = PromiseLike<
  ClassWithInjections<TContext, R, Tokens>
>;

export type ClassWithoutInjections<R> = new () => R;
export type AsyncClassWithoutInjections<R> = PromiseLike<ClassWithoutInjections<R>>;

export type InjectableFunction<TContext, R, Tokens extends readonly InjectionToken<TContext>[]> =
  | InjectableFunctionWithInject<TContext, R, Tokens>
  | InjectableFunctionWithoutInject<R>;

export interface InjectableFunctionWithInject<TContext, R, Tokens extends readonly InjectionToken<TContext>[]> {
  (...args: CorrespondingTypes<TContext, Tokens>): R | PromiseLike<R>;
  readonly inject: Tokens;
}

export type InjectableFunctionWithoutInject<R> = () => R | PromiseLike<R>;

export type Injectable<TContext, R, Tokens extends readonly InjectionToken<TContext>[]> =
  | InjectableClass<TContext, R, Tokens>
  | InjectableFunction<TContext, R, Tokens>;
