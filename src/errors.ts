import type { InjectionTarget } from './api/InjectionTarget.js';

/*

                    ┏━━━━━━━━━━━━━━━━━━┓
                    ┃ TypedInjectError ┃
                    ┗━━━━━━━━━━━━━━━━━━┛
                              ▲
                              ┃
               ┏━━━━━━━━━━━━━━┻━━━━━━━━━━━━━┓
               ┃                            ┃
 ┏━━━━━━━━━━━━━┻━━━━━━━━━━┓        ┏━━━━━━━━┻━━━━━━━┓
 ┃ InjectorDisposedError  ┃        ┃ InjectionError ┃
 ┗━━━━━━━━━━━━━━━━━━━━━━━━┛        ┗━━━━━━━━━━━━━━━━┛
*/

export abstract class TypedInjectError extends Error {}

function describeInjectAction(target: InjectionTarget) {
  if (typeof target === 'function') {
    return 'inject';
  } else {
    return 'resolve';
  }
}

function name(target: InjectionTarget) {
  if (typeof target === 'function') {
    if (target.toString().startsWith('class')) {
      return `[class ${target.name || '<anonymous>'}]`;
    } else {
      return `[function ${target.name || '<anonymous>'}]`;
    }
  } else {
    return `[token "${String(target)}"]`;
  }
}

export class InjectorDisposedError extends TypedInjectError {
  constructor(target: InjectionTarget) {
    super(
      `Injector is already disposed. Please don't use it anymore. Tried to ${describeInjectAction(target)} ${name(target)}.`,
    );
  }
}

export class InjectionError extends TypedInjectError {
  constructor(
    public readonly path: InjectionTarget[],
    cause: Error,
  ) {
    super(
      `Could not ${describeInjectAction(path[0])} ${path.map(name).join(' -> ')}. Cause: ${cause.message}`,
      { cause },
    );
  }

  static create(target: InjectionTarget, error: Error): InjectionError {
    if (error instanceof InjectionError) {
      return new InjectionError([target, ...error.path], error.cause as Error);
    } else {
      return new InjectionError([target], error);
    }
  }
}
