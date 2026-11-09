// Process helpers for the release check: run a command with its output in a
// log file, and fail loudly with the log's tail when it does not succeed.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

/**
 * Run a command to completion. Output goes to `logFile` (appended) and, when
 * `echo` is set, to this process's stdout too. Resolves with the exit code;
 * rejects only when the command cannot be spawned.
 */
export function run(
  cmd,
  args,
  { cwd, env, logFile, echo = false, input } = {}
) {
  return new Promise((resolve, reject) => {
    const log = logFile ? fs.openSync(logFile, 'a') : null;
    if (log !== null) {
      fs.writeSync(log, `\n$ ${cmd} ${args.join(' ')}\n`);
    }
    const child = spawn(cmd, args, {
      cwd,
      env,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe']
    });
    const onData = (chunk) => {
      if (log !== null) fs.writeSync(log, chunk);
      if (echo) process.stdout.write(chunk);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    if (input !== undefined) {
      child.stdin.end(input);
    }
    child.on('error', (e) => {
      if (log !== null) fs.closeSync(log);
      reject(e);
    });
    child.on('close', (code) => {
      if (log !== null) fs.closeSync(log);
      resolve(code ?? 1);
    });
  });
}

/** Run a command and throw (with the log's last lines) when it exits non-zero. */
export async function mustRun(cmd, args, opts = {}) {
  const code = await run(cmd, args, opts);
  if (code !== 0) {
    const tail = opts.logFile ? tailOf(opts.logFile, 40) : '';
    throw new Error(
      `"${cmd} ${args.join(' ')}" exited with ${code}${
        tail ? `\n--- last lines of ${opts.logFile} ---\n${tail}` : ''
      }`
    );
  }
}

/** Run a command and return its stdout (trimmed). Throws on a non-zero exit. */
export function capture(cmd, args, { cwd, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (err += c));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim());
      else
        reject(
          new Error(
            `"${cmd} ${args.join(' ')}" exited with ${code}: ${err.trim()}`
          )
        );
    });
  });
}

export function tailOf(file, lines) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').slice(-lines).join('\n');
  } catch {
    return '';
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
