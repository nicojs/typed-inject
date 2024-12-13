import { use } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';

use(sinonChai);
afterEach(() => {
  sinon.restore();
});
