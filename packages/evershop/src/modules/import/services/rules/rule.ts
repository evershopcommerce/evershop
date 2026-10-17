import { createIssue } from '../issues.js';
import type { ImportIssueCode } from '../issues.js';
import type { StoreFixture } from '../ports/lookup.js';
import type {
  ImportEntity,
  ImportIssue,
  ImportMode,
  ImportSeverity
} from '../types.js';

/**
 * F file, header and structure; C cell; S service or schema; R reference to the
 * store; X across rows; K conflict with the store; M classification (create or
 * update); I import phase (§ 7.4).
 */
export type RuleLayer = 'F' | 'C' | 'S' | 'R' | 'X' | 'K' | 'M' | 'I';

/** `core`: a core service enforces it today. `engine`: new, in the spec. */
export type RuleSource = 'core' | 'engine' | 'core+engine';

/** The operation on the row: create, update, or both. */
export type RuleOperation = 'C' | 'U' | 'B';

/** What a test expects: the issue's code, and where it is. */
export interface ExpectedIssue {
  code: ImportIssueCode;
  /** Absent: a file-level issue. */
  rowNumber?: number;
  column?: string;
}

/**
 * One case of a rule: a file, the store it is checked against, and the issues
 * that come out. The expectation is exact: a case that should pass has no issue
 * at all, and a case that should fail has only the issues listed, so a rule is
 * proven on a file that is otherwise valid ("one cell broken, one issue").
 */
export interface RuleExample {
  /** What the case shows. */
  name: string;
  mode?: ImportMode;
  store?: StoreFixture;
  /** Limits for a case about a limit (the row cap, the length of a cell). */
  limits?: { maxRows?: number; maxCellLength?: number; maxRowBytes?: number };
  /** The CSV text, or bytes for a case about the encoding. */
  file: string | Uint8Array;
  expect: ExpectedIssue[];
}

export interface RuleDefinition {
  /** `ALL-13`, `CAT-02` (§ 7.4). */
  id: string;
  /** `all` for the rules of every entity. */
  entity: ImportEntity | 'all';
  layer: RuleLayer;
  source: RuleSource;
  op: RuleOperation;
  code: ImportIssueCode;
  /** Other codes the rule can give (ALL-16: `ALREADY_EXISTS` or `NOT_FOUND`). */
  alsoCodes?: ImportIssueCode[];
  /** Default: the code's own severity. */
  severity?: ImportSeverity;
  /** The rule in one sentence. */
  summary: string;
}

/** A rule whose proof is a pair of example lists. */
export interface ExampleRuleDefinition extends RuleDefinition {
  testedBy: 'example';
  examples: { pass: RuleExample[]; fail: RuleExample[] };
}

/**
 * A rule whose proof is something else: a named test (`runner`: import-phase
 * and behaviour rules, the escape of text cells).
 */
export interface NamedTestRuleDefinition extends RuleDefinition {
  testedBy: 'runner';
  /** The test file that proves it. */
  test: string;
}

export type Rule = (ExampleRuleDefinition | NamedTestRuleDefinition) & {
  /** Makes an issue of this rule: its code and severity, the row and the cell. */
  issue(where: {
    rowNumber?: number;
    column?: string;
    params?: Record<string, unknown>;
    message: string;
    value?: string;
    /** One of the rule's `alsoCodes`. */
    code?: ImportIssueCode;
  }): ImportIssue;
};

/**
 * A rule cannot exist without its proof: a row rule without `examples` is a
 * type error (§ 4.5, point 3). The rule makes the issues of its own code, so
 * the catalogue and the code that raises the issue cannot disagree.
 */
export function defineRule(
  definition: ExampleRuleDefinition | NamedTestRuleDefinition
): Rule {
  return {
    ...definition,
    issue: ({ code, ...where }) => {
      if (code !== undefined && code !== definition.code) {
        if (!definition.alsoCodes?.includes(code)) {
          throw new Error(`${definition.id} cannot give ${code}`);
        }
      }
      return createIssue({
        code: code ?? definition.code,
        severity: definition.severity,
        ...where
      });
    }
  };
}
