import { fileStoreContract } from '../helpers/fileStoreContract.js';
import { memoryFileHarness } from '../helpers/memoryHarnesses.js';

fileStoreContract('MemoryFileStore', async () => memoryFileHarness());
