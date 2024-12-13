// Forces typescript to explicitly calculate the complicated type
export type Simplify<T> = {} & { [K in keyof T]: T[K] };

export type TChildContext<
  TParentContext,
  TProvided,
  CurrentToken extends string,
> = Simplify<{
  [K in keyof TParentContext | CurrentToken]: K extends CurrentToken //
    ? TProvided
    : K extends keyof TParentContext
      ? TParentContext[K]
      : never;
}>;
