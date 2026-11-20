import type { Suite, TestCase } from '@playwright/test/reporter';
import { sourceFingerprint } from './fingerprint.ts';
import { relativeTo } from './paths.ts';

export const DISCOVERY_FORMAT = 'consequa.discovery/1';

/** Exactly as Consequa issues them: `EB-42`, never `EB-042`. */
const BEHAVIOR_KEY = /^EB-[1-9]\d*$/;
const BEHAVIOR_TAG = '@behavior:';

/** One Test as the repository defines it. Each case of a parameterized test is its own Test. */
export interface DiscoveredTest {
  /** Repository-relative, with forward slashes. */
  file: string;
  /** The enclosing describe titles, then the test's title. */
  titlePath: string[];
  line: number;
  column: number;
  /** Every Playwright project that runs it. The same test in several projects is one Test. */
  projects: string[];
  /** From a `parameter` annotation, naming which case of a parameterized test this is. */
  parameterKey: string | null;
  /** From `behavior` annotations and `@behavior:EB-n` tags. */
  behaviorKeys: string[];
  /** See `sourceFingerprint`. Null when the source couldn't be read. */
  sourceFingerprint: string | null;
}

export interface DiscoveryProblem {
  file: string;
  line: number;
  message: string;
}

export interface Discovery {
  format: typeof DISCOVERY_FORMAT;
  framework: 'playwright';
  frameworkVersion: string;
  tests: DiscoveredTest[];
  problems: DiscoveryProblem[];
}

export interface DiscoverOptions {
  /** The repository root, which file paths are relative to. */
  root: string;
  frameworkVersion: string;
  /** The source of an absolute file path, or null if it can't be read. */
  readSource: (file: string) => string | null;
}

export function discover(suite: Suite, { root, frameworkVersion, readSource }: DiscoverOptions): Discovery {
  const tests = new Map<string, DiscoveredTest>();
  // Keyed so the cases of a looped test report a shared problem once.
  const problems = new Map<string, DiscoveryProblem>();

  for (const testCase of suite.allTests()) {
    const file = relativeTo(root, testCase.location.file);
    const { line, column } = testCase.location;
    const titlePath = describesAndTitle(testCase);
    const key = [file, line, column, ...titlePath].join('\u0000');
    const project = testCase.parent.project()?.name ?? '';

    const known = tests.get(key);
    if (known) {
      if (!known.projects.includes(project)) known.projects.push(project);
      continue;
    }

    const at = (message: string) => problems.set(`${file}:${line}:${message}`, { file, line, message });
    const source = readSource(testCase.location.file);
    const fingerprint = source === null ? null : sourceFingerprint(source, line, column);
    if (fingerprint === null) at("Couldn't read this test's source, so it has no fingerprint.");

    tests.set(key, {
      file,
      titlePath,
      line,
      column,
      projects: [project],
      parameterKey: parameterKey(testCase, at),
      behaviorKeys: behaviorKeys(testCase, at),
      sourceFingerprint: fingerprint,
    });
  }

  const sorted = [...tests.values()].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.column - b.column ||
      a.titlePath.join(' ').localeCompare(b.titlePath.join(' ')),
  );
  for (const test of sorted) test.projects.sort();
  return {
    format: DISCOVERY_FORMAT,
    framework: 'playwright',
    frameworkVersion,
    tests: sorted,
    problems: [...problems.values()],
  };
}

/** The enclosing describe titles, then the test's title. */
export function describesAndTitle(testCase: TestCase): string[] {
  const titles = [testCase.title];
  for (let suite = testCase.parent; suite.type === 'describe'; suite = suite.parent as Suite) {
    titles.unshift(suite.title);
  }
  return titles;
}

/** From the test's one `parameter` annotation, or null; `report` hears when it has several, or an empty one. */
export function parameterKey(testCase: TestCase, report: (message: string) => void): string | null {
  const values = testCase.annotations.filter((a) => a.type === 'parameter').map((a) => a.description?.trim() ?? '');
  if (values.length === 0) return null;
  if (values.length > 1 || values[0] === '') {
    report('A parameterized test needs exactly one `parameter` annotation with a value.');
    return null;
  }
  return values[0] ?? null;
}

function behaviorKeys(testCase: TestCase, report: (message: string) => void): string[] {
  const named = [
    ...testCase.annotations.filter((a) => a.type === 'behavior').map((a) => a.description?.trim() ?? ''),
    ...testCase.tags.filter((tag) => tag.startsWith(BEHAVIOR_TAG)).map((tag) => tag.slice(BEHAVIOR_TAG.length)),
  ];
  const keys = new Set<string>();
  for (const value of named) {
    if (BEHAVIOR_KEY.test(value)) keys.add(value);
    else if (/^EB-0+\d+$/.test(value))
      report(`"${value}" has leading zeros. Write it as EB-${Number(value.slice(3))}.`);
    else report(`"${value}" isn't a Behavior Key, like EB-42.`);
  }
  return [...keys].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)));
}
