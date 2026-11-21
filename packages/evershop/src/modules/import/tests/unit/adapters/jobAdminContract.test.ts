import { jobAdminContract } from '../helpers/jobAdminContract.js';
import { memoryJobHarness } from '../helpers/memoryHarnesses.js';

jobAdminContract('MemoryJobStore', async () => memoryJobHarness());
