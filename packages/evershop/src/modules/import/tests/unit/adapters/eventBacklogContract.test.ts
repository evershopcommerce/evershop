import {
  eventBacklogContract,
  fakeEventHarness
} from '../helpers/eventBacklogContract.js';

eventBacklogContract('FakeEventBacklog', async () => fakeEventHarness());
