import * as fs from 'fs';
import * as path from 'path';
import cron from 'node-cron';
import { Job } from '../../types/cronjob.js';
import { warning } from '../log/logger.js';

/**
 * Checks if a given path is a valid and resolvable JavaScript file path.
 * A path is considered valid if it's a string, not empty, exists on the filesystem,
 * and has a .js extension.
 *
 * @param {string | undefined} filePath - The path to check. Can be undefined.
 * @returns {boolean} True if the path is a resolvable JavaScript file, false otherwise.
 */
function isValidJsFilePath(filePath: string | undefined): boolean {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return false;
  }

  const resolvedPath = path.resolve(filePath);
  const fileExtension = path.extname(resolvedPath);

  try {
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      return false;
    }
  } catch (e) {
    return false;
  }

  return fileExtension === '.js';
}

class JobManager {
  /**
   * @private
   * A private map to store registered jobs. The key is the job's unique name,
   * and the value is the job object adhering to the Job interface.
   */
  private jobs: Map<string, Job> = new Map();

  /**
   * @private
   * A flag indicating whether the job manager has entered a read-only state.
   * Once set to true (after `getAllJobs` is called for the first time),
   * no further mutations (add, remove, update) are allowed.
   */
  private _isFrozen: boolean = false;

  /**
   * Internal helper to check if mutations are allowed.
   * Throws an error if the manager is in a frozen (read-only) state.
   * @private
   * @throws {Error} If a mutation attempt is made after the manager is frozen.
   */
  private _ensureMutable(): void {
    if (this._isFrozen) {
      throw new Error(
        'Job manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a job from the bootstrap file.'
      );
    }
  }

  /**
   * Registers a new job with the manager.
   * A job must have a unique 'name' property.
   * If a job with the same name already exists, it will not be registered.
   * Additionally, `resolve` must be a resolvable path to a JavaScript file.
   * @param {Job} job - The job object to register.
   * @returns {boolean} True if the job was successfully registered, false otherwise.
   * @throws {Error} If called after the manager has entered a read-only state or on invalid job data/paths.
   */
  public registerJob(job: Job): boolean {
    this._ensureMutable();

    if (!job || typeof job.name !== 'string' || job.name.trim() === '') {
      throw new Error(
        'Cannot register job. Job object must have a valid "name" property.'
      );
    }
    const jobName = job.name;
    if (this.jobs.has(jobName)) {
      warning(
        `Job with name "${jobName}" is already registered. Skipping registration.`
      );
      return false;
    }

    if (!isValidJsFilePath(job.resolve)) {
      throw new Error(
        `Cannot register job "${jobName}". Invalid or unresolvable path: "${job.resolve}". Please ensure it's a valid path to an existing JS file.`
      );
    }
    if (!cron.validate(job.schedule)) {
      throw new Error(
        `Cannot register job "${jobName}". Invalid cron schedule: "${job.schedule}". Please ensure it's a valid cron expression.`
      );
    }

    this.jobs.set(jobName, job);
    return true;
  }

  /**
   * Removes a job from the manager based on its unique name.
   *
   * @param {string} jobName - The name of the job to remove.
   * @returns {boolean} True if the job was successfully removed, false otherwise.
   * @throws {Error} If called after the manager has entered a read-only state or on invalid job name.
   */
  public removeJob(jobName: string): boolean {
    this._ensureMutable();

    if (this.jobs.has(jobName)) {
      this.jobs.delete(jobName);
      return true;
    } else {
      warning(`Job with name "${jobName}" not found. Cannot remove.`);
      return false;
    }
  }

  /**
   * Updates an existing job's schedule. This method allows you to change the cron schedule of a job.
   * @param {string} jobName - The name of the job to update.
   * @param {string} newSchedule - The new cron schedule to set.
   * @returns {boolean} True if the job was successfully updated, false otherwise.
   * @throws {Error} If called after the manager has entered a read-only state or on invalid job name.
   */
  public updateJobSchedule(jobName: string, newSchedule: string): boolean {
    this._ensureMutable();
    const job = this.jobs.get(jobName);
    if (!cron.validate(newSchedule)) {
      throw new Error(
        `Cannot update job "${jobName}". Invalid cron schedule: "${newSchedule}". Please ensure it's a valid cron expression.`
      );
    }
    if (!job) {
      warning(`Job with name "${jobName}" not found. Cannot update schedule.`);
      return false;
    }

    job.schedule = newSchedule;
    return true;
  }

  /**
   * Retrieves a registered job by its unique name.
   *
   * @param {string} jobName - The name of the job to retrieve.
   * @returns {Job | undefined} The job object if found, otherwise undefined.
   */
  public getJob(jobName: string): Job | undefined {
    if (this.jobs.has(jobName)) {
      return this.jobs.get(jobName);
    } else {
      warning(`Job with name "${jobName}" not found.`);
      return undefined;
    }
  }

  /**
   * Retrieves all registered jobs.
   * Returns a new array containing frozen (immutable) copies of the job objects.
   * This method also marks the JobManager as 'frozen', preventing any further
   * calls to mutation methods (register, remove, update).
   *
   * @returns {Job[]} An array containing all registered job objects.
   */
  public getAllJobs(): Job[] {
    this._isFrozen = true;

    // Create a new array, and for each job, create a frozen copy.
    return Array.from(this.jobs.values()).map((job) =>
      Object.freeze({ ...job })
    );
  }

  /**
   * Checks if a job with the given name is registered.
   * @param {string} jobName - The name of the job to check.
   * @returns {boolean} True if the job is registered, false otherwise.
   */
  public hasJob(jobName: string): boolean {
    return this.jobs.has(jobName);
  }
}

const jobManager = new JobManager();

/**
 * Retrieves all registered jobs.
 * Calling this function will also freeze the job manager, preventing any further mutations (register, remove).
 * @returns {Job[]} An array of all registered jobs.
 */
export function getAllJobs(): Job[] {
  const allJobs = jobManager.getAllJobs();
  return allJobs;
}

/**
 * Retrieves all enabled jobs. An enabled job is one that has its `enabled` property set to true.
 * This function returns a new array containing only the jobs that are enabled. Calling this function
 * will also freeze the job manager, preventing any further mutations (register, remove).
 * @returns {Job[]} An array of enabled jobs.
 */
export function getEnabledJobs(): Job[] {
  const allJobs = jobManager.getAllJobs();
  return allJobs.filter((job) => job.enabled);
}

/**
 * Registers a new job. This function is intended to be called during the
 * bootstrap phase of the application, before the job manager is frozen.
 * @param job - The job object to register.
 * @returns True if the job was successfully registered, false otherwise.
 * @throws Error if the job is invalid or if the manager is in a read-only state.
 */
export function registerJob(job: Job): boolean {
  return jobManager.registerJob(job);
}

/**
 * Updates the schedule of an existing job. This function allows you to change
 * the cron schedule of a job. It is intended to be called during the bootstrap
 * phase of the application, before the job manager is frozen.
 * @param jobName - The name of the job to update.
 * @param newSchedule - The new cron schedule to set for the job.
 * @returns True if the job schedule was successfully updated, false otherwise.
 * @throws Error if the manager is in a read-only state.
 */
export function updateJobSchedule(
  jobName: string,
  newSchedule: string
): boolean {
  return jobManager.updateJobSchedule(jobName, newSchedule);
}

/**
 * Removes a job. This function supposed to be called from the bootstrap
 * phase of the application, before the job manager is frozen.
 * @param jobName - The name of the job to remove.
 * @returns True if the job was successfully removed, false otherwise.
 */
export function removeJob(jobName: string): boolean {
  return jobManager.removeJob(jobName);
}
/**
 * Retrieves a job by its name.
 * @param jobName - The name of the job to retrieve.
 * @returns The job if found, undefined otherwise.
 */
export function getJob(jobName: string): Job | undefined {
  return jobManager.getJob(jobName);
}

/**
 * Checks if a job with the given name is registered.
 * @param jobName - The name of the job to check.
 * @returns True if the job is registered, false otherwise.
 */
export function hasJob(jobName: string): boolean {
  return jobManager.hasJob(jobName);
}
