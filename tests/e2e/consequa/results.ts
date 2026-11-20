import type { TestCase, TestError, TestResult } from '@playwright/test/reporter';
import { describesAndTitle, parameterKey } from './discover.ts';
import { relativeTo } from './paths.ts';
import type { TracedRequest } from './trace.ts';

export const RESULTS_FORMAT = 'consequa.results/1';

/**
 * The Evidence Artifacts a Result Bundle may carry. Everything else stays in Playwright's output directory: traces
 * hold error messages and step titles even without sources, and `error-context` holds the failing code (ADR-0018).
 */
export const ARTIFACT_TYPES: Readonly<Record<string, string>> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'video/webm': '.webm',
};

export type ExecutionStatus = 'passed' | 'failed' | 'timed_out' | 'skipped' | 'interrupted';

/** Where a failure happened and what kind it was. Never its message, snippet or stack (ADR-0018). */
export interface ExecutionError {
  /** Such as `AssertionError`, `TimeoutError`, `NetworkError` (no host could be reached) or `TypeError`. */
  class: string;
  /** Repository-relative, or null when Playwright gave no place inside the repository. */
  file: string | null;
  line: number | null;
}

/** A file in the bundle's `artifacts` directory, named by its hash, so a screenshot attached twice is kept once. */
export interface BundledArtifact {
  name: string;
  contentType: string;
  /** Relative to the bundle, such as `artifacts/<sha256>.png`. */
  path: string;
  sha256: string;
  bytes: number;
}

/** One Test Execution: one run of one Test, in one project. Each retry is its own execution. */
export interface BundledExecution {
  /** Repository-relative, with forward slashes. With `titlePath` and `parameterKey`, it says which Test ran. */
  file: string;
  titlePath: string[];
  parameterKey: string | null;
  line: number;
  column: number;
  project: string;
  retry: number;
  status: ExecutionStatus;
  startedAt: string;
  durationMs: number;
  errors: ExecutionError[];
  artifacts: BundledArtifact[];
  /**
   * Each method and path it requested from its own application, read from its trace, so Consequa can record which
   * Implementation Elements it exercises (ADR-0041). Absent when the run kept no trace.
   */
  requests?: TracedRequest[];
}

/** The standardized package a run delivers its Test Executions in (see Verification's CONTEXT.md). */
export interface ResultBundle {
  format: typeof RESULTS_FORMAT;
  /** Unique per run, so ingesting the same bundle twice records its executions once. */
  id: string;
  framework: 'playwright';
  frameworkVersion: string;
  /** The commit the repository was at, or null outside a git checkout. */
  commitSha: string | null;
  startedAt: string;
  finishedAt: string;
  status: 'passed' | 'failed' | 'timed_out' | 'interrupted';
  executions: BundledExecution[];
}

const STATUSES: Record<TestResult['status'], ExecutionStatus> = {
  passed: 'passed',
  failed: 'failed',
  timedOut: 'timed_out',
  skipped: 'skipped',
  interrupted: 'interrupted',
};

export function executionStatus(status: TestResult['status']): ExecutionStatus {
  return STATUSES[status];
}

/** The execution without its artifacts, which the reporter copies in itself. */
export function execution(testCase: TestCase, result: TestResult, root: string): Omit<BundledExecution, 'artifacts'> {
  return {
    file: relativeTo(root, testCase.location.file),
    titlePath: describesAndTitle(testCase),
    // Discovery reports a malformed `parameter` annotation; here it only leaves the key out.
    parameterKey: parameterKey(testCase, () => {}),
    line: testCase.location.line,
    column: testCase.location.column,
    project: testCase.parent.project()?.name ?? '',
    retry: result.retry,
    status: executionStatus(result.status),
    startedAt: result.startTime.toISOString(),
    durationMs: Math.round(result.duration),
    errors: result.errors.map((error) => executionError(error, root)),
  };
}

export function executionError(error: TestError, root: string): ExecutionError {
  const file = error.location ? relativeTo(root, error.location.file) : null;
  const inRepository = file !== null && !file.startsWith('../');
  return {
    class: errorClass(error),
    file: inRepository ? file : null,
    line: inRepository ? (error.location?.line ?? null) : null,
  };
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matches terminal colour codes.
const COLOUR = /\u001b\[[0-9;]*m/g;
const NAMED = /^([A-Za-z_$][\w$]*(?:Error|Exception)):/;
/** What a browser or Node says when it couldn't reach a host at all, on the message's first line. */
const UNREACHABLE = /^[^\n]*\b(net::ERR_[A-Z_]+|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH)\b/;

/** The kind of failure, read from the start of its message. Only ever an identifier, never the message itself. */
export function errorClass(error: TestError): string {
  if (error.message === undefined) return error.value === undefined ? 'Error' : 'ThrownValue';
  const message = error.message.replace(COLOUR, '');
  if (/^Test timeout of \d+ms exceeded/.test(message)) return 'TimeoutError';
  if (/^Error: (expect[.(]|Timed out \d+ms waiting for expect)/.test(message)) return 'AssertionError';
  if (UNREACHABLE.test(message)) return 'NetworkError';
  return NAMED.exec(message)?.[1] ?? 'Error';
}
