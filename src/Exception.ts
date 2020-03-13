export class Exception extends Error {
  constructor(message: string, readonly innerError?: Error) {
    super(
      `${message}${innerError ? `. Inner error: ${innerError.message}` : ''}`
    );
  }
}
