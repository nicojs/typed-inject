import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';

chai.use(sinonChai);
afterEach(() => {
  sinon.restore();
});
