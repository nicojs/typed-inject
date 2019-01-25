import { expect } from 'chai';
import { Exception } from '../../src/Exception';

describe('Exception', () => {
  it('should be instanceof Error', () => {
    expect(new Exception('foo')).instanceOf(Error);
  });

  it('should preserve inner errors', () => {
    try {
      try {
        throw new Exception('foo');
      } catch (error) {
        throw new Exception('bar', error);
      }
    } catch (error) {
      expect(error).instanceOf(Error);
      expect(error.toString()).contains('Error: bar. Inner error: foo');
    }
  });
});
