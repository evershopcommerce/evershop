import { jobRepositoryContract } from '../helpers/jobRepositoryContract.js';
import { memoryJobHarness } from '../helpers/memoryHarnesses.js';

jobRepositoryContract('MemoryJobRepository', async () => memoryJobHarness());
