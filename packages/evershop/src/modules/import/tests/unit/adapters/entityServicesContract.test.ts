import { entityServicesContract } from '../helpers/entityServicesContract.js';
import { memoryServicesHarness } from '../helpers/memoryHarnesses.js';

entityServicesContract('MemoryServices', async () => memoryServicesHarness());
