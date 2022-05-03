import { InjectableClass, InjectableFunction } from './Injectable.js';
import { InjectionToken } from './InjectionToken.js';
import { Scope } from './Scope.js';
import { TChildContext } from './TChildContext.js';

export interface Injector<TContext = {}> {
  injectClass<R, Tokens extends readonly InjectionToken<TContext>[]>(Class: InjectableClass<TContext, R, Tokens>): R;
  injectFunction<R, Tokens extends readonly InjectionToken<TContext>[]>(Class: InjectableFunction<TContext, R, Tokens>): R;
  resolve<Token extends keyof TContext>(token: Token): TContext[Token];
  provideValue<Token extends string, R>(token: Token, value: R): Injector<TChildContext<TContext, R, Token>>;
  provideClass<Token extends string, R, Tokens extends readonly InjectionToken<TContext>[]>(
    token: Token,
    Class: InjectableClass<TContext, R, Tokens>,
    scope?: Scope
  ): Injector<TChildContext<TContext, R, Token>>;
  provideFactory<Token extends string, R, Tokens extends readonly InjectionToken<TContext>[]>(
    token: Token,
    factory: InjectableFunction<TContext, R, Tokens>,
    scope?: Scope
  ): Injector<TChildContext<TContext, R, Token>>;
  dispose(): Promise<void>;
}
