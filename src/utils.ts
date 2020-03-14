import { Disposable } from './api/Disposable';

export function isDisposable(maybeDisposable: any): maybeDisposable is Disposable {
  return maybeDisposable && maybeDisposable.dispose && typeof maybeDisposable.dispose === 'function';
}
