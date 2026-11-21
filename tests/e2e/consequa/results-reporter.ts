import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { count, repositoryRoot, shortPath } from './paths.ts';
import {
  ARTIFACT_TYPES,
  type BundledArtifact,
  type BundledExecution,
  execution,
  RESULTS_FORMAT,
  type ResultBundle,
} from './results.ts';
import { MAX_REQUESTS, tracedRequests } from './trace.ts';

export interface ResultsReporterOptions {
  /** Where to write `bundle.json` and `artifacts/`. Defaults to `$CONSEQUA_RESULTS_DIR`, then `consequa-results`. */
  outputDir?: string;
}

type Attachment = TestResult['attachments'][number];

/**
 * Writes a Result Bundle of the Test Executions a run produced, beside Playwright's own reporter:
 *
 *     npx playwright test --reporter=list,@consequa/playwright-kit/results
 *
 * Each failure keeps only its file, line and error class, and the bundle carries only screenshots and videos as
 * Evidence Artifacts (ADR-0018). Traces and error context stay in Playwright's output directory; from a trace it takes
 * only the method and path of each request to the application under test (ADR-0041).
 */
export default class ResultsReporter implements Reporter {
  readonly #outputDir: string;
  readonly #artifactsDir: string;
  readonly #executions: BundledExecution[] = [];
  /** How many attachments of each content type stayed out of the bundle. */
  readonly #withheld = new Map<string, number>();
  /** Errors outside any test, such as a spec that fails to load or a global setup that throws. */
  #errors = 0;
  #root = process.cwd();
  #frameworkVersion = '';
  #startedAt = new Date();

  constructor(options: ResultsReporterOptions = {}) {
    this.#outputDir = path.resolve(options.outputDir ?? process.env.CONSEQUA_RESULTS_DIR ?? 'consequa-results');
    this.#artifactsDir = path.join(this.#outputDir, 'artifacts');
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.#root = repositoryRoot(config.rootDir);
    this.#frameworkVersion = config.version;
    this.#startedAt = new Date();
    // Only what this reporter writes, so an `outputDir` that holds other files keeps them.
    rmSync(path.join(this.#outputDir, 'bundle.json'), { force: true });
    rmSync(this.#artifactsDir, { recursive: true, force: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const artifacts = result.attachments.flatMap((attachment) => this.#artifact(attachment));
    const requests = this.#requests(result.attachments);
    this.#executions.push({ ...execution(test, result, this.#root), artifacts, ...(requests && { requests }) });
  }

  /**
   * The method and path of each request the test made to its own application, from its trace, or undefined when it kept
   * none. The trace itself stays out of the bundle.
   */
  #requests(attachments: readonly Attachment[]): BundledExecution['requests'] {
    const traces = attachments.filter(
      ({ name, contentType, path: source }) => name === 'trace' && contentType === 'application/zip' && source,
    );
    if (traces.length === 0) return undefined;
    const seen = new Map<string, NonNullable<BundledExecution['requests']>[number]>();
    for (const { path: source } of traces) {
      try {
        for (const request of tracedRequests(readFileSync(source as string)))
          seen.set(`${request.method} ${request.path}`, request);
      } catch (error) {
        // A trace Playwright couldn't finish writing has nothing to read. The run goes on, but say so: without it the
        // Test Execution names fewer routes than the test exercised.
        const reason = error instanceof Error ? error.message : String(error);
        console.error(
          `Consequa: could not read the trace ${shortPath(source as string)}, so its requests are left out: ${reason}`,
        );
      }
    }
    return [...seen.values()].slice(0, MAX_REQUESTS);
  }

  onError(): void {
    this.#errors += 1;
  }

  onEnd(result: FullResult): void {
    const bundle: ResultBundle = {
      format: RESULTS_FORMAT,
      id: randomUUID(),
      framework: 'playwright',
      frameworkVersion: this.#frameworkVersion,
      commitSha: commitSha(this.#root),
      startedAt: this.#startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: result.status === 'timedout' ? 'timed_out' : result.status,
      executions: this.#executions,
    };
    mkdirSync(this.#outputDir, { recursive: true });
    const file = path.join(this.#outputDir, 'bundle.json');
    writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`);

    const statuses = ['passed', 'failed', 'timed_out', 'skipped', 'interrupted'] as const;
    const tally = statuses
      .map((status) => [status, bundle.executions.filter((e) => e.status === status).length] as const)
      .filter(([status, n]) => n > 0 || status === 'passed' || status === 'failed')
      .map(([status, n]) => `${n} ${status}`);
    const artifacts = new Set(bundle.executions.flatMap((e) => e.artifacts.map((a) => a.sha256))).size;
    console.log(
      `\nConsequa: ${count(bundle.executions.length, 'Test Execution', 'Test Executions')}: ${tally.join(' · ')}. ` +
        `Wrote ${shortPath(file)} with ${count(artifacts, 'Evidence Artifact', 'Evidence Artifacts')}.`,
    );
    if (this.#withheld.size > 0) {
      const kinds = [...this.#withheld]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, n]) => `${n} ${type}`)
        .join(', ');
      console.log(`Kept out of the bundle, because they can hold code: ${kinds}. They stay in Playwright's output.`);
    }
    if (this.#errors > 0) {
      // A Test that never ran has no execution here: missing evidence, never a pass (ADR-0013).
      console.log(
        `Playwright reported ${count(this.#errors, 'error', 'errors')} outside any test, so some Tests may not have run. Those have no Test Execution in the bundle.`,
      );
    }
    console.log('Each failure keeps only its file, line and error class.');
  }

  /** Copies an attachment Consequa may carry into the bundle, or counts it as withheld. */
  #artifact({ name, contentType, path: source, body }: Attachment): BundledArtifact[] {
    const extension = ARTIFACT_TYPES[contentType];
    const content = extension ? (body ?? (source ? readFileSync(source) : undefined)) : undefined;
    if (!extension || !content) {
      this.#withheld.set(contentType, (this.#withheld.get(contentType) ?? 0) + 1);
      return [];
    }
    const sha256 = createHash('sha256').update(content).digest('hex');
    const file = `${sha256}${extension}`;
    mkdirSync(this.#artifactsDir, { recursive: true });
    writeFileSync(path.join(this.#artifactsDir, file), content);
    return [{ name, contentType, path: `artifacts/${file}`, sha256, bytes: content.length }];
  }
}

/**
 * The commit the run tested: `$CONSEQUA_COMMIT_SHA` when set, such as by the Runner Service, whose copy of the tests
 * has no git history; otherwise `git rev-parse HEAD`.
 */
function commitSha(root: string): string | null {
  const given = process.env.CONSEQUA_COMMIT_SHA;
  const sha = given ?? gitHead(root);
  return /^[0-9a-f]{40}$/.test(sha) ? sha : null;
}

function gitHead(root: string): string {
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return git.status === 0 ? git.stdout.trim() : '';
}
