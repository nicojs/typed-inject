import { Scope } from './api/Scope';
import { InjectionToken, INJECTOR_TOKEN, TARGET_TOKEN } from './api/InjectionToken';
import { InjectableClass, InjectableFunction, Injectable } from './api/Injectable';
import { Injector } from './api/Injector';
import { Exception } from './Exception';
import { Disposable } from './api/Disposable';
import { isDisposable } from './utils';
import { TChildContext } from './api/TChildContext';

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

abstract class AbstractInjector<TContext> implements Injector<TContext>  {

  public injectClass<R, Tokens extends InjectionToken<TContext>[]>(Class: InjectableClass<TContext, R, Tokens>, providedIn?: Function): R {
    try {
      const args: any[] = this.resolveParametersToInject(Class, providedIn);
      return new Class(...args as any);
    } catch (error) {
      throw new Exception(`Could not inject "${Class.name}"`, error);
    }
  }

  public injectFunction<R, Tokens extends InjectionToken<TContext>[]>(fn: InjectableFunction<TContext, R, Tokens>, providedIn?: Function): R {
    try {
      const args: any[] = this.resolveParametersToInject(fn, providedIn);
      return fn(...args as any);
    } catch (error) {
      throw new Exception(`Could not inject "${fn.name}"`, error);
    }
  }

  private resolveParametersToInject<Tokens extends InjectionToken<TContext>[]>(injectable: Injectable<TContext, any, Tokens>, target?: Function): any[] {
    const tokens: InjectionToken<TContext>[] = (injectable as any).inject || [];
    return tokens.map(key => {
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

  public provideValue<Token extends string, R>(token: Token, value: R)
    : AbstractInjector<TChildContext<TContext, R, Token>> {
    return new ValueProvider(this, token, value);
  }

  public provideClass<Token extends string, R, Tokens extends InjectionToken<TContext>[]>(token: Token, Class: InjectableClass<TContext, R, Tokens>, scope = DEFAULT_SCOPE)
    : AbstractInjector<TChildContext<TContext, R, Token>> {
    return new ClassProvider(this, token, scope, Class);
  }
  public provideFactory<Token extends string, R, Tokens extends InjectionToken<TContext>[]>(token: Token, factory: InjectableFunction<TContext, R, Tokens>, scope = DEFAULT_SCOPE)
    : AbstractInjector<TChildContext<TContext, R, Token>> {
    return new FactoryProvider(this, token, scope, factory);
  }

  public resolve<Token extends keyof TContext>(token: Token, target?: Function): TContext[Token] {
    return this.resolveInternal(token, target);
  }

  public abstract dispose(): Promise<void>;

  protected abstract resolveInternal<Token extends keyof TContext>(token: Token, target?: Function): TContext[Token];
}

class RootInjector extends AbstractInjector<{}> {
  public resolveInternal(token: never)
    : never {
    throw new Error(`No provider found for "${token}"!.`);
  }
  public dispose() {
    return Promise.resolve();
  }
}

abstract class ChildInjector<TParentContext, TProvided, CurrentToken extends string> extends AbstractInjector<TChildContext<TParentContext, TProvided, CurrentToken>> {

  private cached: { value?: any } | undefined;
  private readonly disposables = new Set<Disposable>();

  constructor(protected readonly parent: AbstractInjector<TParentContext>,
              protected readonly token: CurrentToken,
              private readonly scope: Scope) {
    super();
  }

  protected abstract responsibleForDisposing: boolean;
  protected abstract result(target: Function | undefined): TProvided;

  protected isDisposed = false;

  public injectClass
    <R, Tokens extends InjectionToken<TChildContext<TParentContext, TProvided, CurrentToken>>[]>(Class: InjectableClass<TChildContext<TParentContext, TProvided, CurrentToken>, R, Tokens>, providedIn?: Function): R {
    this.throwIfDisposed(Class);
    return super.injectClass(Class, providedIn);
  }
  public injectFunction
    <R, Tokens extends InjectionToken<TChildContext<TParentContext, TProvided, CurrentToken>>[]>(fn: InjectableFunction<TChildContext<TParentContext, TProvided, CurrentToken>, R, Tokens>, providedIn?: Function): R {
    this.throwIfDisposed(fn);
    return super.injectFunction(fn, providedIn);
  }

  public resolve<Token extends keyof TChildContext<TParentContext, TProvided, CurrentToken>>(token: Token, target?: Function): TChildContext<TParentContext, TProvided, CurrentToken>[Token] {
    this.throwIfDisposed(token);
    return super.resolve(token, target);
  }

  private throwIfDisposed(injectableOrToken: Function | Symbol | number | string | undefined) {
    if (this.isDisposed) {
      throw new Exception(`Injector is already disposed. Please don't use it anymore.${additionalErrorMessage()}`);
    }
    function additionalErrorMessage() {
      if (typeof injectableOrToken === 'function') {
        return ` Tried to inject "${injectableOrToken.name}".`;
      } else {
        return ` Tried to resolve "${injectableOrToken}".`;
      }
    }
  }

  public async dispose() {
    if (!this.isDisposed) {
      this.isDisposed = true; // be sure new disposables aren't added while we're disposing
      await this.disposeInjectedValues();
      this.parent.dispose();
    }
  }

  private async disposeInjectedValues() {
    const promisesToAwait = [...this.disposables.values()]
      .map(disposable => disposable.dispose());
    await Promise.all(promisesToAwait);
  }

  protected resolveInternal<SearchToken extends keyof TChildContext<TParentContext, TProvided, CurrentToken>>(token: SearchToken, target: Function | undefined)
    : TChildContext<TParentContext, TProvided, CurrentToken>[SearchToken] {
    if (token === this.token) {
      if (this.cached) {
        return this.cached.value as any;
      } else {
        const value = this.result(target);
        this.addToDisposablesIfNeeded(value);
        this.addToCacheIfNeeded(value);
        return value as any;
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

  private addToDisposablesIfNeeded(value: TProvided) {
    if (this.responsibleForDisposing && isDisposable(value)) {
      this.disposables.add(value);
    }
  }

}

class ValueProvider<TParentContext, TProvided, ProvidedToken extends string> extends ChildInjector<TParentContext, TProvided, ProvidedToken> {
  constructor(parent: AbstractInjector<TParentContext>, token: ProvidedToken, private readonly value: TProvided) {
    super(parent, token, Scope.Transient);
  }
  protected result(): TProvided {
    return this.value;
  }
  protected readonly responsibleForDisposing = false;
}

class FactoryProvider<TParentContext, TProvided, ProvidedToken extends string, Tokens extends InjectionToken<TParentContext>[]>
  extends ChildInjector<TParentContext, TProvided, ProvidedToken> {
  constructor(parent: AbstractInjector<TParentContext>,
              token: ProvidedToken,
              scope: Scope,
              private readonly injectable: InjectableFunction<TParentContext, TProvided, Tokens>) {
    super(parent, token, scope);
  }
  protected result(target: Function): TProvided {
    return this.parent.injectFunction(this.injectable, target);
  }
  protected readonly responsibleForDisposing = true;
}

class ClassProvider<TParentContext, TProvided, ProvidedToken extends string, Tokens extends InjectionToken<TParentContext>[]> extends ChildInjector<TParentContext, TProvided, ProvidedToken> {
  constructor(parent: AbstractInjector<TParentContext>,
              token: ProvidedToken,
              scope: Scope,
              private readonly injectable: InjectableClass<TParentContext, TProvided, Tokens>) {
    super(parent, token, scope);
  }
  protected result(target: Function): TProvided {
    return this.parent.injectClass(this.injectable, target);
  }
  protected readonly responsibleForDisposing = true;
}

export const rootInjector: Injector<{}> = new RootInjector();
