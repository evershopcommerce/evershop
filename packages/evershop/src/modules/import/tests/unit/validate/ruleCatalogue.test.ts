import { describe, it, expect } from '@jest/globals';
import { IMPORT_ISSUE_CODES } from '../../../services/issues.js';
import { ALL_RULES } from '../../../services/rules/allRules.js';
import { CATEGORY_RULES } from '../../../services/rules/categoryRules.js';
import { PRODUCT_RULES } from '../../../services/rules/productRules.js';
import { IMPORT_PHASE_RULES } from '../../../services/rules/importPhaseRules.js';
import { defineRule } from '../../../services/rules/rule.js';
import type { Rule } from '../../../services/rules/rule.js';

/**
 * The catalogue of § 7.4 as far as it is built. When a rule is added or removed
 * this list changes with it, in the same commit: a rule cannot appear or vanish
 * without this test saying so.
 */
const EXPECTED_IDS = [
  'ALL-01',
  'ALL-02',
  'ALL-03',
  'ALL-04',
  'ALL-05',
  'ALL-06',
  'ALL-07',
  'ALL-08',
  'ALL-09',
  'ALL-10',
  'ALL-12',
  'ALL-13',
  'ALL-14',
  'ALL-16',
  'ALL-18',
  'ALL-19',
  'ALL-20',
  'ALL-21',
  'ALL-22',
  'ALL-23',
  'CAT-01',
  'CAT-02',
  'CAT-03',
  'CAT-04',
  'CAT-05',
  'CAT-06',
  'CAT-07',
  'CAT-08',
  'CAT-09',
  'IMG-01',
  'IMG-02',
  'PRD-01',
  'PRD-02',
  'PRD-03',
  'PRD-04',
  'PRD-05',
  'PRD-06',
  'PRD-07',
  'PRD-08',
  'PRD-09',
  'PRD-10',
  'PRD-11',
  'PRD-12',
  'PRD-20',
  'PRD-21',
  'PRD-22',
  'PRD-23',
  'PRD-25',
  'PRD-26',
  'PRD-27',
  'PRD-28',
  'IMP-01',
  'IMP-02',
  'IMP-03',
  'IMP-06',
  'IMP-07'
];

const RULES: Rule[] = [
  ...ALL_RULES,
  ...CATEGORY_RULES,
  ...PRODUCT_RULES,
  ...IMPORT_PHASE_RULES
];

describe('the rule catalogue', () => {
  it('has exactly the rules that are built, each once', () => {
    const ids = RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it('gives every rule a known code and a layer, a source and an operation', () => {
    for (const rule of RULES) {
      expect(IMPORT_ISSUE_CODES).toContain(rule.code);
      for (const other of rule.alsoCodes ?? []) {
        expect(IMPORT_ISSUE_CODES).toContain(other);
      }
      expect(['F', 'C', 'S', 'R', 'X', 'K', 'M', 'I']).toContain(rule.layer);
      expect(['core', 'engine', 'core+engine']).toContain(rule.source);
      expect(['C', 'U', 'B']).toContain(rule.op);
      expect(rule.summary.length).toBeGreaterThan(10);
    }
  });

  it('proves every rule that has examples on both sides', () => {
    for (const rule of RULES) {
      if (rule.testedBy === 'example') {
        expect([rule.id, rule.examples.pass.length > 0]).toEqual([
          rule.id,
          true
        ]);
        expect([rule.id, rule.examples.fail.length > 0]).toEqual([
          rule.id,
          true
        ]);
      } else {
        expect(rule.test.length).toBeGreaterThan(0);
      }
    }
  });

  it('shows every rule failing with its own code', () => {
    for (const rule of RULES) {
      if (rule.testedBy !== 'example') continue;
      const own = [rule.code, ...(rule.alsoCodes ?? [])];
      for (const example of rule.examples.fail) {
        const codes = example.expect.map((issue) => issue.code);
        expect([
          rule.id,
          example.name,
          codes.some((code) => own.includes(code))
        ]).toEqual([rule.id, example.name, true]);
      }
    }
  });

  it('shows every code of the rules in at least one failing example', () => {
    const shown = new Set(
      RULES.flatMap((rule) =>
        rule.testedBy === 'example'
          ? rule.examples.fail.flatMap((example) =>
              example.expect.map((issue) => issue.code)
            )
          : []
      )
    );
    for (const rule of RULES) {
      if (rule.testedBy === 'example') {
        expect([rule.code, shown.has(rule.code)]).toEqual([rule.code, true]);
      }
    }
  });

  it('lets a rule give a severity other than the one of its code', () => {
    const rule = defineRule({
      id: 'TEST-01',
      entity: 'all',
      layer: 'C',
      source: 'engine',
      op: 'B',
      code: 'INVALID_VALUE',
      severity: 'warning',
      testedBy: 'runner',
      test: 'none',
      summary: 'A rule for this test only.'
    });
    expect(rule.issue({ message: 'm' }).severity).toBe('warning');
  });

  it('makes issues with the code and the severity of the rule', () => {
    const issue = ALL_RULES.find((rule) => rule.id === 'ALL-18')?.issue({
      message: 'm'
    });
    expect(issue).toMatchObject({
      code: 'TEMPLATE_EXAMPLE_ROW',
      severity: 'warning'
    });
    const other = ALL_RULES.find((rule) => rule.id === 'ALL-16');
    expect(other?.issue({ message: 'm' }).code).toBe('ALREADY_EXISTS');
    expect(other?.issue({ message: 'm', code: 'NOT_FOUND' }).code).toBe(
      'NOT_FOUND'
    );
    expect(() => other?.issue({ message: 'm', code: 'CONFLICT' })).toThrow(
      'cannot give CONFLICT'
    );
  });
});
