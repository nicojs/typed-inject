export interface Disposable {
  dispose(): void | PromiseLike<void>;
}
