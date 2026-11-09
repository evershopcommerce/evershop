// The release candidate: what `npm install` gets in every scratch store.
//
//   pack       (default) pack a git ref the way the release does (`prepack`:
//              rimraf dist && tsc && copyfiles), in a throwaway worktree, so the
//              main checkout's dist (the dev store runs from it) is never touched
//   <x.tgz>    an existing tarball
//   <version>  a published version, e.g. 2.3.0 (the positive control)
import fs from 'node:fs';
import path from 'node:path';
import { capture, mustRun, run } from './proc.mjs';

export async function resolveCandidate({
  candidate,
  ref,
  repoRoot,
  runDir,
  log
}) {
  if (candidate === 'pack') {
    return packRef({ ref, repoRoot, runDir, log });
  }
  if (candidate.endsWith('.tgz')) {
    const file = path.resolve(candidate);
    if (!fs.existsSync(file)) throw new Error(`Tarball not found: ${file}`);
    return {
      installSpec: file,
      label: path.basename(file),
      version: versionFromTarball(file)
    };
  }
  if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(candidate)) {
    return {
      installSpec: `@evershop/evershop@${candidate}`,
      label: `npm ${candidate}`,
      version: candidate
    };
  }
  throw new Error(
    `--candidate must be "pack", a .tgz file or a version, got "${candidate}"`
  );
}

function versionFromTarball(file) {
  const m = path.basename(file).match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)\.tgz$/);
  return m ? m[1] : 'unknown';
}

async function packRef({ ref, repoRoot, runDir, log }) {
  const sha = await capture('git', ['rev-parse', '--short', ref], {
    cwd: repoRoot
  });
  const wt = path.join(runDir, 'candidate-worktree');
  const logFile = path.join(runDir, 'candidate-pack.log');
  log(`Packing ${ref} (${sha}) in a throwaway worktree…`);
  await mustRun('git', ['worktree', 'add', '--detach', wt, sha], {
    cwd: repoRoot,
    logFile
  });
  try {
    // Borrow the main checkout's installed tools; only build tools are used
    // here. The scratch stores resolve every dependency from npm themselves.
    fs.symlinkSync(
      path.join(repoRoot, 'node_modules'),
      path.join(wt, 'node_modules')
    );
    const pkgModules = path.join(repoRoot, 'packages/evershop/node_modules');
    if (fs.existsSync(pkgModules)) {
      fs.symlinkSync(
        pkgModules,
        path.join(wt, 'packages/evershop/node_modules')
      );
    }
    await mustRun('npm', ['pack', '--pack-destination', runDir], {
      cwd: path.join(wt, 'packages/evershop'),
      logFile
    });
  } finally {
    await run('git', ['worktree', 'remove', '--force', wt], {
      cwd: repoRoot,
      logFile
    });
    await run('git', ['worktree', 'prune'], { cwd: repoRoot, logFile });
  }
  const tgz = fs
    .readdirSync(runDir)
    .find((f) => /^evershop-evershop-.*\.tgz$/.test(f));
  if (!tgz) throw new Error(`npm pack produced no tarball (see ${logFile})`);
  const file = path.join(runDir, tgz);
  return {
    installSpec: file,
    label: `${ref} (${sha}) packed`,
    version: versionFromTarball(file),
    sha
  };
}
