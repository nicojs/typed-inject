import { Disposable } from './api/Disposable.js';

export function isDisposable(
  maybeDisposable: unknown,
): maybeDisposable is Disposable {
  const asDisposable = maybeDisposable as Disposable;
  return (
    asDisposable &&
    asDisposable.dispose &&
    typeof asDisposable.dispose === 'function'
  );
}
