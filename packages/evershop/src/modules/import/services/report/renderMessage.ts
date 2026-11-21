import { renderSay } from '../say.js';
import type { Say } from '../say.js';
import type {
  RenderableIssue,
  RenderMessage,
  RenderSentence
} from './errorsCell.js';

/**
 * What says a stored sentence in a language: the server-side `translate` of
 * core, which takes the English template as the key and the numbered values.
 */
export type Translate = (key: string, values: Record<string, string>) => string;

/**
 * The sentence of a problem in the admin's language. A problem that has no
 * `say` (a text that was made as a plain sentence) is shown as it was stored.
 */
export function renderIssueWith(translate: Translate): RenderMessage {
  return (issue: RenderableIssue) =>
    issue.say ? renderSay(issue.say, translate) : issue.message;
}

/** A sentence around the problems, in the admin's language. */
export function renderSentenceWith(translate: Translate): RenderSentence {
  return (sentence: Say) => renderSay(sentence.data(), translate);
}
