export class Task {
  public resolve!: () => void;
  public reject!: (reason?: Error) => void;
  public promise: Promise<void>;

  constructor() {
    this.promise = new Promise<void>((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
  }
}

export function tick(): Promise<void> {
  return new Promise((res) => setTimeout(res));
}
