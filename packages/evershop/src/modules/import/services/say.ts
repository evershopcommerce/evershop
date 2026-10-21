/**
 * A sentence the admin reads, kept as a template and its values, so that it can
 * be said again in another language when it is read (§ 8.4, Issues).
 *
 * ```ts
 * say`The value in column "${column}" must be a number.`
 * ```
 *
 * The English text is what the literal says with the values put in. The
 * template, `The value in column "${1}" must be a number.`, is the key in
 * `translations/<locale>/import.csv`: the values are numbered in the order they
 * appear, and a translation may move a number to where its sentence needs it.
 * A value that is itself a `say` sentence (a part of a longer one) is said in
 * the language of the whole.
 *
 * The values are the admin's own text (a column, a key, a number), not words:
 * they are put in as they are. A part of a sentence that is made of words, such
 * as the reason an image failed, is a `say` of its own.
 */
export class Say {
  constructor(
    private readonly strings: readonly string[],
    private readonly values: readonly unknown[]
  ) {}

  /** The sentence in English. */
  toString(): string {
    return this.strings.reduce(
      (text, part, at) =>
        text + part + (at < this.values.length ? String(this.values[at]) : ''),
      ''
    );
  }

  /** The key of the sentence: its text with `${1}`, `${2}` ... for the values. */
  get template(): string {
    return this.strings.reduce(
      (text, part, at) =>
        text + part + (at < this.values.length ? `\${${at + 1}}` : ''),
      ''
    );
  }

  /** What is stored of the sentence: the template and the values. */
  data(): SayData {
    return {
      t: this.template,
      a: this.values.map((value) =>
        value instanceof Say ? value.data() : clip(String(value))
      )
    };
  }
}

/** A sentence as it is stored: the template and the values, plain JSON. */
export interface SayData {
  t: string;
  a: Array<string | SayData>;
}

// A value can be as long as a cell; the message that holds it is cut anyway.
const MAX_VALUE = 1000;

function clip(text: string): string {
  return text.length <= MAX_VALUE ? text : `${text.slice(0, MAX_VALUE)}…`;
}

/** The tag: ``say`...${value}...` ``. */
export function say(strings: TemplateStringsArray, ...values: unknown[]): Say {
  return new Say(strings, values);
}

/** A sentence that is only text (a part of a longer one, or a fixed one). */
export function sayText(text: string): Say {
  return new Say([text], []);
}

/** Says a stored sentence with `translate` (the key and the values as `translate` takes them). */
export function renderSay(
  data: SayData,
  translate: (key: string, values: Record<string, string>) => string
): string {
  const values: Record<string, string> = {};
  data.a.forEach((value, at) => {
    values[String(at + 1)] =
      typeof value === 'string' ? value : renderSay(value, translate);
  });
  return translate(data.t, values);
}
