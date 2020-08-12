/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Scope } from './api/Scope';
import { InjectionToken, INJECTOR_TOKEN, TARGET_TOKEN } from './api/InjectionToken';
import { InjectableClass, InjectableFunction, Injectable } from './api/Injectable';
import { Injector } from './api/Injector';
import { InjectionError, InjectorDisposedError } from './errors';
import { Disposable } from './api/Disposable';
import { isDisposable } from './utils';
import { TChildContext } from './api/TChildContext';
import { InjectionTarget } from './api/InjectionTarget';

const DEFAULT_SCOPE = Scope.Singleton;

/*

# Composite design pattern:

         ┏━━━━━━━━━━━━━━━━━━┓
         ┃ AbstractInjector ┃
         ┗━━━━━━━━━━━━━━━━━━┛
                   ▲
                   ┃
          ┏━━━━━━━━┻━━━━━━━━┓
          ┃                 ┃
 ┏━━━━━━━━┻━━━━━┓   ┏━━━━━━━┻━━━━━━━┓
 ┃ RootInjector ┃   ┃ ChildInjector ┃
 ┗━━━━━━━━━━━━━━┛   ┗━━━━━━━━━━━━━━━┛
                            ▲
                            ┃
          ┏━━━━━━━━━━━━━━━━━┻━┳━━━━━━━━━━━━━━━━┓
 ┏━━━━━━━━┻━━━━━━━━┓ ┏━━━━━━━━┻━━━━━━┓ ┏━━━━━━━┻━━━━━━━┓
 ┃ FactoryInjector ┃ ┃ ClassInjector ┃ ┃ ValueInjector ┃
 ┗━━━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━┛
*/

abstract class AbstractInjector<TContext> implements Injector<TContext> {
  private childInjectors: Injector<any>[] = [];

  public injectClass<R, Tokens extends InjectionToken<TContext>[]>(Class: InjectableClass<TContext, R, Tokens>, providedIn?: Function): R {
    this.throwIfDisposed(Class);
    try {
      const args: any[] = this.resolveParametersToInject(Class, providedIn);
      return new Class(...(args as any));
    } catch (error) {
      throw InjectionError.create(Class, error);
    }
  }

  public injectFunction<R, Tokens extends InjectionToken<TContext>[]>(fn: InjectableFunction<TContext, R, Tokens>, providedIn?: Function): R {
    this.throwIfDisposed(fn);
    try {
      const args: any[] = this.resolveParametersToInject(fn, providedIn);
      return fn(...(args as any));
    } catch (error) {
      throw InjectionError.create(fn, error);
    }
  }

  private resolveParametersToInject<Tokens extends InjectionToken<TContext>[]>(
    injectable: Injectable<TContext, any, Tokens>,
    target?: Function
  ): any[] {
    const tokens: InjectionToken<TContext>[] = (injectable as any).inject || [];
    return tokens.map((key) => {
      switch (key) {
        case TARGET_TOKEN:
          return target as any;
        case INJECTOR_TOKEN:
          return this as any;
        default:
          return this.resolveInternal(key, injectable);
      }
    });
  }

  public provideValue<Token extends string, R>(token: Token, value: R): AbstractInjector<TChildContext<TContext, R, Token>> {
    this.throwIfDisposed(token);
    const provider = new ValueProvider(this, token, value);
    this.childInjectors.push(provider as Injector<any>);
    return provider;
  }

  public provideClass<Token extends string, R, Tokens extends InjectionToken<TContext>[]>(
    token: Token,
    Class: InjectableClass<TContext, R, Tokens>,
    scope = DEFAULT_SCOPE
  ): AbstractInjector<TChildContext<TContext, R, Token>> {
    this.throwIfDisposed(token);
    const provider = new ClassProvider(this, token, scope, Class);
    this.childInjectors.push(provider as Injector<any>);
    return provider;
  }
  public provideFactory<Token extends string, R, Tokens extends InjectionToken<TContext>[]>(
    token: Token,
    factory: InjectableFunction<TContext, R, Tokens>,
    scope = DEFAULT_SCOPE
  ): AbstractInjector<TChildContext<TContext, R, Token>> {
    this.throwIfDisposed(token);
    const provider = new FactoryProvider(this, token, scope, factory);
    this.childInjectors.push(provider as Injector<any>);
    return provider;
  }

  public resolve<Token extends keyof TContext>(token: Token, target?: Function): TContext[Token] {
    this.throwIfDisposed(token);
    return this.resolveInternal(token, target);
  }

  protected throwIfDisposed(injectableOrToken: InjectionTarget) {
    if (this.isDisposed) {
      throw new InjectorDisposedError(injectableOrToken);
    }
  }

  private isDisposed = false;

  public async dispose() {
    if (!this.isDisposed) {
      this.isDisposed = true; // be sure new disposables aren't added while we're disposing
      await Promise.all(this.childInjectors.map((child) => child.dispose()));
      while (this.childInjectors.pop()); // Don't keep the references, might cause a memory leak
      await this.disposeInjectedValues();
    }
  }

  protected abstract disposeInjectedValues(): Promise<void>;

  protected abstract resolveInternal<Token extends keyof TContext>(token: Token, target?: Function): TContext[Token];
}

class RootInjector extends AbstractInjector<{}> {
  public resolveInternal(token: never): never {
    throw new Error(`No provider found for "${token}"!.`);
  }
  protected disposeInjectedValues() {
    return Promise.resolve();
  }
}

abstract class ChildInjector<TParentContext, TProvided, CurrentToken extends string> extends AbstractInjector<
  TChildContext<TParentContext, TProvided, CurrentToken>
> {
  private cached: { value?: any } | undefined;
  private readonly disposables = new Set<Disposable>();

  constructor(protected readonly parent: AbstractInjector<TParentContext>, protected readonly token: CurrentToken, private readonly scope: Scope) {
    super();
  }

  protected abstract result(target: Function | undefined): TProvided;

  protected async disposeInjectedValues() {
    const promisesToAwait = [...this.disposables.values()].map((disposable) => disposable.dispose());
    await Promise.all(promisesToAwait);
  }

  protected resolveInternal<SearchToken extends keyof TChildContext<TParentContext, TProvided, CurrentToken>>(
    token: SearchToken,
    target: Function | undefined
  ): TChildContext<TParentContext, TProvided, CurrentToken>[SearchToken] {
    if (token === this.token) {
      if (this.cached) {
        return this.cached.value;
      } else {
        try {
          const value = this.result(target);
          this.addToCacheIfNeeded(value);
          return value as any;
        } catch (error) {
          throw InjectionError.create(token, error);
        }
      }
    } else {
      return this.parent.resolve(token as any, target) as any;
    }
  }

  private addToCacheIfNeeded(value: TProvided) {
    if (this.scope === Scope.Singleton) {
      this.cached = { value };
    }
  }

  protected registerProvidedValue(value: TProvided): TProvided {
    if (isDisposable(value)) {
      this.disposables.add(value);
    }
    return value;
  }
}

class ValueProvider<TParentContext, TProvided, ProvidedToken extends string> extends ChildInjector<TParentContext, TProvided, ProvidedToken> {
  constructor(parent: AbstractInjector<TParentContext>, token: ProvidedToken, private readonly value: TProvided) {
    super(parent, token, Scope.Transient);
  }
  protected result(): TProvided {
    return this.value;
  }
}

class FactoryProvider<TParentContext, TProvided, ProvidedToken extends string, Tokens extends InjectionToken<TParentContext>[]> extends ChildInjector<
  TParentContext,
  TProvided,
  ProvidedToken
> {
  constructor(
    parent: AbstractInjector<TParentContext>,
    token: ProvidedToken,
    scope: Scope,
    private readonly injectable: InjectableFunction<TParentContext, TProvided, Tokens>
  ) {
    super(parent, token, scope);
  }
  protected result(target: Function): TProvided {
    return this.registerProvidedValue(this.parent.injectFunction(this.injectable, target));
  }
}

class ClassProvider<TParentContext, TProvided, ProvidedToken extends string, Tokens extends InjectionToken<TParentContext>[]> extends ChildInjector<
  TParentContext,
  TProvided,
  ProvidedToken
> {
  constructor(
    parent: AbstractInjector<TParentContext>,
    token: ProvidedToken,
    scope: Scope,
    private readonly injectable: InjectableClass<TParentContext, TProvided, Tokens>
  ) {
    super(parent, token, scope);
  }
  protected result(target: Function): TProvided {
    return this.registerProvidedValue(this.parent.injectClass(this.injectable, target));
  }
}

export function createInjector(): Injector<{}> {
  return new RootInjector();
}
