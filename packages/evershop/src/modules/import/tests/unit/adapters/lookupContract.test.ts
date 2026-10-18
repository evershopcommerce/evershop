import { lookupContract } from '../helpers/lookupContract.js';
import { memoryLookupHarness } from '../helpers/memoryHarnesses.js';

lookupContract('MemoryLookup', async () => memoryLookupHarness());
