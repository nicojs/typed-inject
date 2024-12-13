import {
  InjectionToken,
  InjectorToken,
  TargetToken,
} from './InjectionToken.js';
import { Injector } from './Injector.js';

export type CorrespondingType<
  TContext,
  T extends InjectionToken<TContext>,
> = T extends InjectorToken
  ? Injector<TContext>
  : T extends TargetToken
    ? Function | undefined
    : T extends keyof TContext
      ? TContext[T]
      : never;

export type CorrespondingTypes<
  TContext,
  TS extends readonly InjectionToken<TContext>[],
> = {
  [K in keyof TS]: TS[K] extends InjectionToken<TContext>
    ? CorrespondingType<TContext, TS[K]>
    : never;
};
