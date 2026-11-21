import { describe, expect, it } from '@jest/globals';
import { interpolate } from '../../../../../lib/locale/interpolate.js';
import { emptyCounts } from '../../../services/job/types.js';
import { jobMessages } from '../../../services/job/messages.js';
import {
  renderIssueWith,
  renderSentenceWith
} from '../../../services/report/renderMessage.js';
import { renderJobMessage } from '../../../services/job/messages.js';
import { say } from '../../../services/say.js';
import {
  downloadFileWithErrors,
  getIssues,
  getJob
} from '../../../web/handlers.js';
import { bodyOf, makeWeb, textOf } from '../helpers/webHarness.js';

/**
 * The messages of the problems, the words around them in the file with errors,
 * and the message of a job, said in the admin's language when they are read:
 * the stored English stays as it is.
 */
const dictionary: Record<string, string> = {
  'The value in column "${1}" ${2}': 'Giá trị ở cột "${1}" ${2}',
  'must be a whole number from 0 to ${1}.': 'phải là số nguyên từ 0 đến ${1}.',
  'row: ${1}': 'dòng: ${1}',
  'Stopped after ${1} failed rows.': 'Đã dừng sau ${1} dòng lỗi.'
};
const translate = (key: string, values: Record<string, string>) =>
  interpolate(dictionary[key] || key, values);

function translated() {
  const harness = makeWeb({ render: renderIssueWith(translate) });
  harness.web.render = renderIssueWith(translate);
  harness.web.sentence = renderSentenceWith(translate);
  harness.web.jobMessage = (message) => renderJobMessage(message, translate);
  return harness;
}

const sentence = say`The value in column "${'qty'}" ${say`must be a whole number from 0 to ${99}.`}`;
const problem = {
  phase: 'validate' as const,
  rowNumber: 2,
  entityKey: 'A',
  column: 'qty',
  code: 'INVALID_VALUE',
  severity: 'error' as const,
  params: { reason: 'not_whole' },
  message: String(sentence),
  say: sentence.data(),
  value: '-1'
};

describe("the problems of a job, in the admin's language", () => {
  it('says them in the language, and keeps the template out of the answer', async () => {
    const { web, store } = translated();
    const job = store.insert({
      status: 'validated',
      counts: { ...emptyCounts(), errors: 1 }
    });
    store.seedIssues(job.id, [problem]);
    const { data } = bodyOf(await getIssues(web, job.uuid, {}));
    expect(data.items[0].message).toBe(
      'Giá trị ở cột "qty" phải là số nguyên từ 0 đến 99.'
    );
    // Not the internals of the sentence.
    expect(data.items[0]).not.toHaveProperty('say');
    expect(JSON.stringify(data.items[0].params)).not.toContain('__say');
  });

  it('shows the English sentence when the store has no translation', async () => {
    const { web, store } = makeWeb({
      render: renderIssueWith((k, v) => interpolate(k, v))
    });
    const job = store.insert({ status: 'validated' });
    store.seedIssues(job.id, [problem]);
    const { data } = bodyOf(await getIssues(web, job.uuid, {}));
    expect(data.items[0].message).toBe(
      'The value in column "qty" must be a whole number from 0 to 99.'
    );
  });

  it('shows a problem that has no template as it was stored', async () => {
    const { web, store } = translated();
    const job = store.insert({ status: 'validated' });
    store.seedIssues(job.id, [
      { ...problem, say: undefined, message: 'An older text.' }
    ]);
    const { data } = bodyOf(await getIssues(web, job.uuid, {}));
    expect(data.items[0].message).toBe('An older text.');
  });
});

describe("the file with errors, in the admin's language", () => {
  it('writes the problems and the words around them in the language', async () => {
    const { web, store, files } = translated();
    const job = store.insert({ status: 'validated' });
    const put = files.put(job.id, 'sku,qty\nA,-1\nB,2\n');
    store.live(job.id).chunkCount = put.chunkCount;
    store.seedIssues(job.id, [
      problem,
      {
        ...problem,
        rowNumber: 3,
        column: null,
        say: undefined,
        message: 'Thiếu ô.'
      }
    ]);
    const text = await textOf(await downloadFileWithErrors(web, job.uuid, {}));
    // A cell with quotes in it is quoted, and its quotes doubled.
    expect(text).toContain(
      '"qty: Giá trị ở cột ""qty"" phải là số nguyên từ 0 đến 99."'
    );
    // The word "row:" is said in the language as well.
    expect(text).toContain('B,2,dòng: Thiếu ô.');
  });
});

describe("the message of a job, in the admin's language", () => {
  it('says why it stopped in the language', async () => {
    const { web, store } = translated();
    const job = store.insert({
      status: 'stopped',
      startedAt: 5,
      errorMessage: String(jobMessages.stoppedAfterFailures(10))
    });
    const { data } = bodyOf(await getJob(web, job.uuid));
    expect(data.errorMessage).toBe('Đã dừng sau 10 dòng lỗi.');
  });

  it('keeps a message that is not one of the known ones', async () => {
    const { web, store } = translated();
    const job = store.insert({
      status: 'failed',
      errorMessage: 'Something older.'
    });
    expect(bodyOf(await getJob(web, job.uuid)).data.errorMessage).toBe(
      'Something older.'
    );
  });
});
