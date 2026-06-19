import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/e2e/shared → repo root (core/)
export const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const CLI = path.join('packages', 'evershop', 'dist', 'bin', 'evershop.js');

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a compiled `evershop` theme CLI verb as a child process from the repo
 * root, so it picks up `.env`, `config/`, and `themes/` exactly as a real
 * invocation would. Never throws — returns the exit code so specs can assert
 * on both success and failure paths.
 */
export async function runThemeCli(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI, ...args], {
      cwd: REPO_ROOT,
      // Non-TTY child: destructive verbs require --yes, prompts never fire.
      env: process.env
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: typeof err.code === 'number' ? err.code : 1
    };
  }
}
