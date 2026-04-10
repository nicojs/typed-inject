/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  type InjectionToken,
  INJECTOR_TOKEN,
  TARGET_TOKEN,
} from './api/InjectionToken.js';
import type {
  InjectableClass,
  InjectableFunction,
  Injectable,
} from './api/Injectable.js';
import type { Injector } from './api/Injector.js';
import type { Disposable } from './api/Disposable.js';
import type { TChildContext, TImportContext } from './api/TChildContext.js';
import type { InjectionTarget } from './api/InjectionTarget.js';
import { Scope } from './api/Scope.js';
import { InjectionError, InjectorDisposedError, TokenNotFoundError } from './errors.js';
import { isDisposable } from './utils.js';
import { TokenType } from './api/Token.js';

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
              ┏━━━━━━━━━━━━━┻━━━━━━━━━━━━━┓
              ┃ ChildWithProvidedInjector ┃
              ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                            ▲
                            ┃
          ┏━━━━━━━━━━━━━━━━━┻━┳━━━━━━━━━━━━━━━━┓
 ┏━━━━━━━━┻━━━━━━━━┓ ┏━━━━━━━━┻━━━━━━┓ ┏━━━━━━━┻━━━━━━━┓
 ┃ FactoryInjector ┃ ┃ ClassInjector ┃ ┃ ValueInjector ┃
 ┗━━━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━┛
*/

abstract class AbstractInjector<TContext> implements Injector<TContext> {
  private childInjectors: Set<Injector<any>> = new Set();

  public injectClass<R, Tokens extends InjectionToken<TContext>[]>(
    Class: InjectableClass<TContext, R, Tokens>,
    providedIn?: Function,
  ): R {
    this.throwIfDisposed(Class);
    try {
      const args: any[] = this.resolveParametersToInject(Class, providedIn);
      return new Class(...(args as any));
    } catch (error) {
      throw InjectionError.create(Class, error as Error);
    }
  }

  public injectFunction<R, Tokens extends InjectionToken<TContext>[]>(
    fn: InjectableFunction<TContext, R, Tokens>,
    providedIn?: Function,
  ): R {
    this.throwIfDisposed(fn);
    try {
      const args: any[] = this.resolveParametersToInject(fn, providedIn);
      return fn(...(args as any));
    } catch (error) {
      throw InjectionError.create(fn, error as Error);
    }
  }

  private resolveParametersToInject<Tokens extends InjectionToken<TContext>[]>(
    injectable: Injectable<TContext, any, Tokens>,
    target?: Function,
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

  public provideValue<Token extends TokenType, R>(
    token: Token,
    value: R,
  ): AbstractInjector<TChildContext<TContext, R, Token>> {
    this.throwIfDisposed(token);
    const provider = new ValueProvider(this, token, value);
    this.childInjectors.add(provider as Injector<any>);
    return provider;
  }

  public provideClass<
    Token extends TokenType,
    R,
    Tokens extends InjectionToken<TContext>[],
  >(
    token: Token,
    Class: InjectableClass<TContext, R, Tokens>,
    scope = DEFAULT_SCOPE,
  ): AbstractInjector<TChildContext<TContext, R, Token>> {
    this.throwIfDisposed(token);
    const provider = new ClassProvider(this, token, scope, Class);
    this.childInjectors.add(provider as Injector<any>);
    return provider;
  }
  public provideFactory<
    Token extends TokenType,
    R,
    Tokens extends InjectionToken<TContext>[],
  >(
    token: Token,
    factory: InjectableFunction<TContext, R, Tokens>,
    scope = DEFAULT_SCOPE,
  ): AbstractInjector<TChildContext<TContext, R, Token>> {
    this.throwIfDisposed(token);
    const provider = new FactoryProvider(this, token, scope, factory);
    this.childInjectors.add(provider as Injector<any>);
    return provider;
  }

  public resolve<Token extends keyof TContext>(
    token: Token,
    target?: Function,
  ): TContext[Token] {
    this.throwIfDisposed(token);
    return this.resolveInternal(token, target);
  }

  protected throwIfDisposed(injectableOrToken: InjectionTarget) {
    if (this.isDisposed) {
      throw new InjectorDisposedError(injectableOrToken);
    }
  }

  public removeChild(child: Injector<any>): void {
    this.childInjectors.delete(child);
  }

  public addChild(child: Injector<any>): void {
    this.childInjectors.add(child);
  }

  private isDisposed = false;

  public import<
    TImportedContext,
    Tokens extends readonly (keyof TImportedContext & TokenType)[],
  >(
    injector: Injector<TImportedContext>,
    tokens?: Tokens,
  ): Injector<TImportContext<TContext, Pick<TImportedContext, Tokens[number]>>> {
    this.throwIfDisposed('import');
    const allowedTokens = tokens ? new Set<TokenType>(tokens) : null;
    const node = new ImportInjector(
      this,
      injector as AbstractInjector<TImportedContext>,
      allowedTokens,
    );
    (injector as AbstractInjector<TImportedContext>).addChild(node as Injector<any>);
    return node as any;
  }

  public export<Tokens extends readonly (keyof TContext & TokenType)[]>(
    tokens: Tokens,
  ): Injector<Pick<TContext, Tokens[number]>> {
    this.throwIfDisposed('export');
    const node = new ExportInjector(this, new Set<TokenType>(tokens));
    this.childInjectors.add(node as Injector<any>);
    return node as any;
  }

  public createChildInjector(): Injector<TContext> {
    return new ChildInjector(this);
  }

  public async dispose() {
    if (!this.isDisposed) {
      this.isDisposed = true; // be sure new disposables aren't added while we're disposing
      const promises = [];
      for (const child of this.childInjectors) {
        promises.push(child.dispose());
      }
      await Promise.all(promises);
      await this.disposeInjectedValues();
    }
  }

  protected abstract disposeInjectedValues(): Promise<void>;

  protected abstract resolveInternal<Token extends keyof TContext>(
    token: Token,
    target?: Function,
  ): TContext[Token];
}

class RootInjector extends AbstractInjector<{}> {
  public override resolveInternal(token: never): never {
    throw new TokenNotFoundError(token as TokenType);
  }
  protected override disposeInjectedValues() {
    return Promise.resolve();
  }
}

class ChildInjector<
  TParentContext,
  TContext,
> extends AbstractInjector<TContext> {
  protected override async disposeInjectedValues(): Promise<void> {}
  protected override resolveInternal<Token extends keyof TContext>(
    token: Token,
    target?: Function,
  ): TContext[Token] {
    return this.parent.resolve(token as any, target) as any;
  }
  constructor(protected readonly parent: AbstractInjector<TParentContext>) {
    super();
  }

  public override async dispose() {
    this.parent.removeChild(this as Injector<any>);
    await super.dispose();
  }
}

abstract class ChildWithProvidedInjector<
  TParentContext,
  TProvided,
  CurrentToken extends TokenType,
> extends ChildInjector<
  TParentContext,
  TChildContext<TParentContext, TProvided, CurrentToken>
> {
  private cached: { value?: any } | undefined;
  private readonly disposables = new Set<Disposable>();
  constructor(
    parent: AbstractInjector<TParentContext>,
    protected readonly token: CurrentToken,
    private readonly scope: Scope,
  ) {
    super(parent);
  }

  protected abstract result(target: Function | undefined): TProvided;

  protected override resolveInternal<
    SearchToken extends keyof TChildContext<
      TParentContext,
      TProvided,
      CurrentToken
    >,
  >(
    token: SearchToken,
    target: Function | undefined,
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
          throw InjectionError.create(token, error as Error);
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

  protected override async disposeInjectedValues() {
    const promisesToAwait = [...this.disposables.values()].map((disposable) =>
      disposable.dispose(),
    );
    await Promise.all(promisesToAwait);
  }
}

class ValueProvider<
  TParentContext,
  TProvided,
  ProvidedToken extends TokenType,
> extends ChildWithProvidedInjector<TParentContext, TProvided, ProvidedToken> {
  constructor(
    parent: AbstractInjector<TParentContext>,
    token: ProvidedToken,
    private readonly value: TProvided,
  ) {
    super(parent, token, Scope.Transient);
  }
  protected override result(): TProvided {
    return this.value;
  }
}

class FactoryProvider<
  TParentContext,
  TProvided,
  ProvidedToken extends TokenType,
  Tokens extends InjectionToken<TParentContext>[],
> extends ChildWithProvidedInjector<TParentContext, TProvided, ProvidedToken> {
  constructor(
    parent: AbstractInjector<TParentContext>,
    token: ProvidedToken,
    scope: Scope,
    private readonly injectable: InjectableFunction<
      TParentContext,
      TProvided,
      Tokens
    >,
  ) {
    super(parent, token, scope);
  }
  protected override result(target: Function): TProvided {
    return this.registerProvidedValue(
      this.parent.injectFunction(this.injectable, target),
    );
  }
}

class ClassProvider<
  TParentContext,
  TProvided,
  ProvidedToken extends TokenType,
  Tokens extends InjectionToken<TParentContext>[],
> extends ChildWithProvidedInjector<TParentContext, TProvided, ProvidedToken> {
  constructor(
    parent: AbstractInjector<TParentContext>,
    token: ProvidedToken,
    scope: Scope,
    private readonly injectable: InjectableClass<
      TParentContext,
      TProvided,
      Tokens
    >,
  ) {
    super(parent, token, scope);
  }
  protected override result(target: Function): TProvided {
    return this.registerProvidedValue(
      this.parent.injectClass(this.injectable, target),
    );
  }
}

class ImportInjector<TParentContext, TImportedContext> extends AbstractInjector<
  TImportContext<TParentContext, TImportedContext>
> {
  constructor(
    private readonly parent: AbstractInjector<TParentContext>,
    private readonly imported: AbstractInjector<TImportedContext>,
    private readonly allowedTokens: ReadonlySet<TokenType> | null,
  ) {
    super();
  }

  protected override resolveInternal<
    Token extends keyof TImportContext<TParentContext, TImportedContext>,
  >(
    token: Token,
    target: Function | undefined,
  ): TImportContext<TParentContext, TImportedContext>[Token] {
    if (
      this.allowedTokens === null ||
      this.allowedTokens.has(token as TokenType)
    ) {
      try {
        return this.imported.resolve(token as any, target) as any;
      } catch (e) {
        if (!(e instanceof TokenNotFoundError)) throw e;
      }
    }
    return this.parent.resolve(token as any, target) as any;
  }

  protected override disposeInjectedValues(): Promise<void> {
    return Promise.resolve();
  }

  public override async dispose() {
    this.imported.removeChild(this as Injector<any>);
    await super.dispose();
  }
}

class ExportInjector<
  TContext,
  TExportedTokens extends keyof TContext,
> extends ChildInjector<TContext, Pick<TContext, TExportedTokens>> {
  constructor(
    parent: AbstractInjector<TContext>,
    private readonly exportedTokens: ReadonlySet<TokenType>,
  ) {
    super(parent);
  }

  protected override resolveInternal<
    Token extends keyof Pick<TContext, TExportedTokens>,
  >(
    token: Token,
    target: Function | undefined,
  ): Pick<TContext, TExportedTokens>[Token] {
    if (!this.exportedTokens.has(token as TokenType)) {
      throw new TokenNotFoundError(token as TokenType);
    }
    return this.parent.resolve(token as any, target) as any;
  }
}

export function createInjector(): Injector<{}> {
  return new RootInjector();
}
