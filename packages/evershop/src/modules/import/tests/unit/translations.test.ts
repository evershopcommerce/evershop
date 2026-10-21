import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from '@jest/globals';
import ts from 'typescript';
import { readCsvFile } from '../../../../lib/util/readCsvFile.js';
import type { SayData } from '../../services/say.js';
import { ALL_RULES } from '../../services/rules/allRules.js';
import { CATEGORY_RULES } from '../../services/rules/categoryRules.js';
import { ADDRESS_RULES } from '../../services/rules/customerAddressRules.js';
import { CUSTOMER_RULES } from '../../services/rules/customerRules.js';
import { METAFIELD_RULES } from '../../services/rules/metafieldRules.js';
import { PRODUCT_RULES } from '../../services/rules/productRules.js';
import type { Rule } from '../../services/rules/rule.js';
import { validateEntity } from './helpers/runValidation.js';

/**
 * Every sentence the import says (a `say` literal in `services/`) has a
 * translation in every language of the store, with the same placeholders. A new
 * message without its translations fails here, instead of showing English in a
 * Vietnamese admin.
 *
 * The test reads the sources (`src/`), next to the compiled tests (`dist/`), and
 * the translation files of the repository.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE = path.resolve(here, '../../../../..');
const SERVICES = path.join(PACKAGE, 'src/modules/import/services');
const TRANSLATIONS = path.resolve(PACKAGE, '../../translations');

// The sentence that is said from a constant, not from a literal.
const FROM_CONSTANTS = ['(more problems not listed)'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

/** The template of every ``say`...` `` in the services: its text, with `${1}`, `${2}` for the values. */
function sentencesInSources(): string[] {
  const found = new Set<string>(FROM_CONSTANTS);
  for (const file of sourceFiles(SERVICES)) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.ES2022,
      true
    );
    const visit = (node: ts.Node) => {
      if (ts.isTaggedTemplateExpression(node) && node.tag.getText() === 'say') {
        const { template } = node;
        if (ts.isNoSubstitutionTemplateLiteral(template)) {
          found.add(template.text);
        } else {
          let text = template.head.text;
          template.templateSpans.forEach((span, at) => {
            text += `\${${at + 1}}${span.literal.text}`;
          });
          found.add(text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...found].sort();
}

const placeholders = (text: string) =>
  (text.match(/\$\{\d+\}/g) ?? []).sort().join(',');

const LOCALES = fs
  .readdirSync(TRANSLATIONS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

describe('the translations of the sentences of the import', () => {
  const sentences = sentencesInSources();

  it('finds the sentences of the code, and the languages of the store', () => {
    expect(sentences.length).toBeGreaterThan(150);
    expect(LOCALES.length).toBeGreaterThanOrEqual(17);
  });

  it.each(LOCALES)(
    'has a translation of each of them in %s, with the same values in it',
    async (locale) => {
      const dictionary = await readCsvFile<string>(
        path.join(TRANSLATIONS, locale, 'import.csv')
      );
      const missing = sentences.filter((s) => !dictionary[s]?.trim());
      expect(missing).toEqual([]);
      const wrong = sentences.filter(
        (s) => placeholders(dictionary[s]) !== placeholders(s)
      );
      expect(wrong).toEqual([]);
    }
  );
});

// What the engine says at run time, from the examples of the rules: every
// sentence of every problem is in the dictionary, nested parts included.
const RULES: Rule[] = [
  ...ALL_RULES,
  ...CATEGORY_RULES,
  ...PRODUCT_RULES,
  ...CUSTOMER_RULES,
  ...ADDRESS_RULES,
  ...METAFIELD_RULES
];

const templatesOf = (data: SayData): string[] => [
  data.t,
  ...data.a.flatMap((part) =>
    typeof part === 'string' ? [] : templatesOf(part)
  )
];

describe('the sentences the engine makes while it checks files', () => {
  it("are all in the dictionary of a language, and nothing is said without a template (but core's own sentences)", async () => {
    const dictionary = await readCsvFile<string>(
      path.join(TRANSLATIONS, 'vi', 'import.csv')
    );
    const seen = new Set<string>();
    const plain = new Set<string>();
    for (const rule of RULES) {
      if (rule.testedBy !== 'example') continue;
      const entity = (
        rule.entity === 'product' ||
        rule.entity === 'customer' ||
        rule.entity === 'customerAddress'
          ? rule.entity
          : 'category'
      ) as 'category' | 'product' | 'customer' | 'customerAddress';
      for (const example of rule.examples.fail) {
        // eslint-disable-next-line no-await-in-loop
        const result = await validateEntity(
          example.entity ?? entity,
          example.file,
          {
            mode: example.mode,
            store: example.store,
            limits: example.limits
          }
        );
        for (const issue of result.issues) {
          if (issue.say) templatesOf(issue.say).forEach((t) => seen.add(t));
          else plain.add(`${issue.code}: ${issue.message}`);
        }
      }
    }
    expect(seen.size).toBeGreaterThan(100);
    expect([...seen].filter((t) => !dictionary[t])).toEqual([]);
    // The messages of core (the address rules of the store) are said by core, in
    // the language of the store, when the file is checked.
    expect(
      [...plain].filter((text) => !text.startsWith('ADDRESS_INVALID'))
    ).toEqual([]);
  });
});
