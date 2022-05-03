import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';

chai.use(sinonChai);
afterEach(() => {
  sinon.restore();
});
