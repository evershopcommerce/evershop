import enquirer from 'enquirer';

const { prompt } = enquirer;

/**
 * Confirm a destructive action (spec 04 § 6.3). Two safety rules:
 *   - `--yes` (yesFlag) skips the prompt entirely.
 *   - When STDIN is not a TTY (CI / piped input) and `--yes` was NOT passed,
 *     refuse with an error rather than hang waiting on input that never comes.
 */
export async function confirmDestructive(
  message: string,
  opts: { defaultYes?: boolean; yesFlag?: boolean }
): Promise<boolean> {
  if (opts.yesFlag) return true;
  if (!process.stdin.isTTY) {
    throw new Error(
      'destructive action requires --yes when running non-interactively'
    );
  }
  const res = (await prompt({
    type: 'confirm',
    name: 'ok',
    initial: opts.defaultYes ?? false,
    message
  })) as { ok: boolean };
  return Boolean(res.ok);
}

export async function promptInput(message: string): Promise<string> {
  const res = (await prompt({
    type: 'input',
    name: 'value',
    message
  })) as { value?: string };
  return String(res.value ?? '');
}
