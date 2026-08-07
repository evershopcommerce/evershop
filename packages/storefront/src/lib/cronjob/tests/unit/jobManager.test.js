import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const getValidJob = (name = 'TestJob') => ({
  name: name,
  schedule: '* * * * *',
  resolve: `./jobs/${name}.js`,
  enabled: true
});

jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn((path) => {
    if (path.includes('InvalidModule.js')) {
      return false; // Simulate unresolvable paths
    }
    return true; // Simulate valid paths for other components
  }),
  statSync: jest.fn(() => ({
    isFile: () => true
  }))
}));

const realPath = await import('path');
jest.unstable_mockModule('path', () => ({
  default: true,
  ...realPath,
  resolve: jest.fn((...args) => `/mocked/path/${args.join('/')}`)
}));

describe('Job Manager Module', () => {
  beforeEach(async () => {
    jest.resetModules(); // Reset modules before each test to ensure fresh mocks
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mock call history after each test
  });
  // --- Test _isFrozen state enforcement ---
  describe('Mutation after getAllJobs()', () => {
    it('should throw an error if resolve is not a string', async () => {
      const jobModule = await import('../../jobManager.js');
      const invalidJob = {
        name: 'InvalidJob',
        schedule: '* * * * *',
        resolve: 123, // Invalid type
        enabled: true
      };
      expect(() => jobModule.registerJob(invalidJob)).toThrow(
        'Invalid or unresolvable'
      );
    });

    it('should throw an error if the resolve is unresolvable path', async () => {
      const jobModule = await import('../../jobManager.js');
      const invalidJob = {
        name: 'InvalidJob',
        schedule: '* * * * *',
        resolve: 'InvalidModule.js', // Unresolvable path
        enabled: true
      };
      expect(() => jobModule.registerJob(invalidJob)).toThrow(
        'Invalid or unresolvable'
      );
    });

    it('should throw an error if registerJob is called with an invalid job schedule', async () => {
      const jobModule = await import('../../jobManager.js');
      const invalidJob = {
        name: 'InvalidJob',
        schedule: 'invalid_schedule', // Invalid schedule
        resolve: 'ValidModule.js',
        enabled: true
      };
      expect(() => jobModule.registerJob(invalidJob)).toThrow(
        'Invalid cron schedule'
      );
    });

    it('should throw an error if registerJob is called after getAllJobs', async () => {
      const jobModule = await import('../../jobManager.js');
      jobModule.getAllJobs(); // This freezes the manager
      const job = getValidJob('NewJob');
      expect(() => jobModule.registerJob(job)).toThrow(
        'Job manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a job from the bootstrap file.'
      );
    });

    it('should throw an error if updateJob is called after getAllJobs', async () => {
      const jobModule = await import('../../jobManager.js');
      jobModule.registerJob(getValidJob('ExistingJob'));
      jobModule.getAllJobs(); // This freezes the manager
      expect(() =>
        jobModule.updateJobSchedule('ExistingJob', '0 0 * * *')
      ).toThrow(
        'Job manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a job from the bootstrap file.'
      );
    });

    it('should throw an error if removeJob is called after getAllJobs', async () => {
      const jobModule = await import('../../jobManager.js');
      jobModule.registerJob(getValidJob('JobToRemove'));
      jobModule.getAllJobs(); // This freezes the manager
      expect(() => jobModule.removeJob('JobToRemove')).toThrow(
        'Job manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a job from the bootstrap file.'
      );
    });

    it('should allow getJob after getAllJobs', async () => {
      const jobModule = await import('../../jobManager.js');
      const job = getValidJob('ReadJob');
      jobModule.registerJob(job);
      jobModule.getAllJobs(); // This freezes the manager
      expect(jobModule.getJob('ReadJob')).toEqual(job);
    });

    it('should allow hasJob after getAllJobs', async () => {
      const jobModule = await import('../../jobManager.js');
      const job = getValidJob('CheckJob');
      jobModule.registerJob(job);
      jobModule.getAllJobs(); // This freezes the manager
      expect(jobModule.hasJob('CheckJob')).toBe(true);
    });

    it('should allow to updateJobSchedule', async () => {
      const jobModule = await import('../../jobManager.js');
      const job = getValidJob('UpdateJob');
      jobModule.registerJob(job);
      jobModule.updateJobSchedule('UpdateJob', '0 0 * * *');
      expect(jobModule.getJob('UpdateJob')).toEqual(job);
      expect(jobModule.getJob('UpdateJob').schedule).toEqual('0 0 * * *');
    });

    it('should throw error if trying to updateJobSchedule with invalid schedule', async () => {
      const jobModule = await import('../../jobManager.js');
      jobModule.registerJob(getValidJob('JobWithInvalidSchedule'));
      expect(() =>
        jobModule.updateJobSchedule(
          'JobWithInvalidSchedule',
          'invalid_schedule'
        )
      ).toThrow('Invalid cron schedule');
    });

    it('should thrown an error if trying to update job schedule after calling getAllJobs', async () => {
      const jobModule = await import('../../jobManager.js');
      jobModule.registerJob(getValidJob('JobToUpdate'));
      jobModule.getAllJobs(); // This freezes the manager
      expect(() =>
        jobModule.updateJobSchedule('JobToUpdate', '0 0 * * *')
      ).toThrow(
        'Job manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a job from the bootstrap file.'
      );
    });

    it('should allow removing a job', async () => {
      const jobModule = await import('../../jobManager.js');
      const job = getValidJob('JobToRemove');
      jobModule.registerJob(job);
      jobModule.removeJob('JobToRemove');
      expect(jobModule.hasJob('JobToRemove')).toBe(false);
    });
  });
});
