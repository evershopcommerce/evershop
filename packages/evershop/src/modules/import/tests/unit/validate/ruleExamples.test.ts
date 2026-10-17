import { describe, it, expect } from '@jest/globals';
import { ALL_RULES } from '../../../services/rules/allRules.js';
import { CATEGORY_RULES } from '../../../services/rules/categoryRules.js';
import type { ExpectedIssue, Rule } from '../../../services/rules/rule.js';
import { validateCategories } from '../helpers/runValidation.js';

/**
 * The generic test of § 4.5, point 3: every rule is run on its own examples. A
 * case that should pass gives no issue at all; a case that should fail gives
 * exactly the issues it lists. Each case is also read in chunks of 3 bytes: where
 * the stream is cut must change nothing.
 */
const RULES: Rule[] = [...ALL_RULES, ...CATEGORY_RULES];

const shape = (issue: ExpectedIssue) => ({
  code: issue.code,
  rowNumber: issue.rowNumber,
  column: issue.column
});

const order = (a: ExpectedIssue, b: ExpectedIssue) =>
  (a.rowNumber ?? 0) - (b.rowNumber ?? 0) ||
  a.code.localeCompare(b.code) ||
  (a.column ?? '').localeCompare(b.column ?? '');

describe('the examples of the rules', () => {
  const cases = RULES.flatMap((rule) =>
    rule.testedBy === 'example'
      ? [
          ...rule.examples.pass.map((example) => ({
            title: `${rule.id} passes: ${example.name}`,
            example
          })),
          ...rule.examples.fail.map((example) => ({
            title: `${rule.id} fails: ${example.name}`,
            example
          }))
        ]
      : []
  );

  it.each(cases)('$title', async ({ example }) => {
    for (const chunkSize of [undefined, 3]) {
      const result = await validateCategories(example.file, {
        mode: example.mode,
        store: example.store,
        limits: example.limits,
        chunkSize
      });
      expect(result.issues.map(shape).sort(order)).toEqual(
        example.expect.map(shape).sort(order)
      );
    }
  });
});
