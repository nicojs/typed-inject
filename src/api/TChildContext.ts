// Forces typescript to explicitly calculate the complicated type
import { TokenType } from './Token.js';

export type Simplify<T> = {} & { [K in keyof T]: T[K] };

// Merges two contexts where TContext (current) has priority over TImportedContext
export type TImportContext<TContext, TImportedContext> = Simplify<
  Omit<TImportedContext, keyof TContext> & TContext
>;

export type TChildContext<
  TParentContext,
  TProvided,
  CurrentToken extends TokenType,
> = Simplify<{
  [K in keyof TParentContext | CurrentToken]: K extends CurrentToken //
    ? TProvided
    : K extends keyof TParentContext
      ? TParentContext[K]
      : never;
}>;
