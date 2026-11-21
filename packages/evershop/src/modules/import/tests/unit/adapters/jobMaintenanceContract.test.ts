import { jobMaintenanceContract } from '../helpers/jobMaintenanceContract.js';
import { memoryJobHarness } from '../helpers/memoryHarnesses.js';

jobMaintenanceContract('MemoryJobStore', async () => memoryJobHarness());
