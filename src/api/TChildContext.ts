export type TChildContext<TParentContext, TProvided, CurrentToken extends string> = {
  [K in keyof (TParentContext & { [K in CurrentToken]: TProvided })]: K extends CurrentToken
    ? TProvided
    : K extends keyof TParentContext
    ? TParentContext[K]
    : never;
};
