import { existsSync, lstatSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { getValueSync } from '../../../lib/util/registry.js';
import { getFileStorageProvider } from './storage/storageConfig.js';

/** Characters a stored name may contain. Anything else is refused. */
const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

/**
 * Validate a new file name on its own terms, before any provider sees it.
 *
 * A name is not a path: accepting a separator here would let a rename move a
 * file anywhere the process can write, and `..` would walk out of the media
 * root entirely. Both are refused rather than sanitised, because silently
 * rewriting what someone typed produces a file they cannot find.
 */
export function assertValidFileName(name: string): void {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    throw new Error('The new name is empty');
  }
  if (trimmed === '.' || trimmed === '..') {
    throw new Error('The new name is not a valid file name');
  }
  if (/[\\/]/.test(trimmed)) {
    throw new Error('The new name cannot contain a path separator');
  }
  if (!SAFE_NAME.test(trimmed)) {
    throw new Error(
      'The new name can contain letters, digits, dots, hyphens and underscores only'
    );
  }
  if (trimmed.length > 255) {
    throw new Error('The new name is too long');
  }
}

/**
 * The extension of a file name, including the dot, or '' when it has none.
 * A leading dot is the whole name (`.gitignore`), not an extension.
 */
export function extensionOfName(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : '';
}

/**
 * The name a rename should actually produce, with the file's type intact.
 *
 * The extension is what every consumer uses to decide what the file IS — the
 * browser picks a thumbnail from it, `mimeFor` derives the media type from it,
 * and the storefront serves it by it. Letting a rename change it produces a
 * file that claims to be something it is not; letting a rename DROP it
 * produces one that claims to be nothing at all, which is what happened: the
 * renamed file came back untyped and lost its preview.
 *
 * So:
 *   - a new name with NO extension keeps the original's — typing just the
 *     stem is the common case and should not be an error;
 *   - a new name with the SAME extension is accepted, normalised to the
 *     original's spelling so `.PNG` and `.png` do not become two conventions;
 *   - a new name with a DIFFERENT extension is refused. Renaming cannot
 *     convert a file, and pretending otherwise breaks it silently.
 */
export function resolveRenameTarget(
  currentName: string,
  newName: string
): string {
  const currentExtension = extensionOfName(currentName);
  const requested = newName.trim();
  const requestedExtension = extensionOfName(requested);

  if (!requestedExtension) {
    return `${requested}${currentExtension}`;
  }
  if (requestedExtension.toLowerCase() === currentExtension.toLowerCase()) {
    return `${requested.slice(
      0,
      requested.length - requestedExtension.length
    )}${currentExtension}`;
  }
  if (!currentExtension) {
    throw new Error(
      'This file has no extension, so one cannot be added by renaming it'
    );
  }
  throw new Error(
    `The file extension cannot be changed — it must stay "${currentExtension}"`
  );
}

/** The sibling path for `newName` next to `path`. */
export function siblingPath(path: string, newName: string): string {
  const clean = path.replace(/^\/+/, '');
  const slash = clean.lastIndexOf('/');
  return slash === -1 ? newName : `${clean.slice(0, slash)}/${newName}`;
}

/**
 * Rename a file, keeping it in its folder.
 *
 * @param path    the existing file path, relative to the media root
 * @param newName the new name — a name, never a path
 * @returns the new path
 */
export const renameFile = async (
  path: string,
  newName: string
): Promise<string> => {
  assertValidFileName(newName);
  const clean = path.replace(/^\/+/, '');
  const currentName = clean.slice(clean.lastIndexOf('/') + 1);
  // Enforced here rather than only in the browser: the API is reachable on its
  // own, and a rename that strips the extension leaves an unusable file.
  const finalName = resolveRenameTarget(currentName, newName);
  assertValidFileName(finalName);
  const target = siblingPath(path, finalName);
  if (target === path.replace(/^\/+/, '')) {
    return target;
  }

  const fileRenamer = getValueSync(
    'fileRenamer',
    localFileRenamer,
    {
      config: getFileStorageProvider()
    },
    (value) => value && typeof value.rename === 'function'
  );

  await fileRenamer.rename(path, target);
  return target;
};

const localFileRenamer = {
  rename: async (fromPath: string, toPath: string): Promise<void> => {
    const from = join(CONSTANTS.MEDIAPATH, fromPath);
    const to = join(CONSTANTS.MEDIAPATH, toPath);
    if (!existsSync(from)) {
      throw new Error('Requested path does not exist');
    }
    if (lstatSync(from).isDirectory()) {
      throw new Error('Requested path is not a file');
    }
    // Refuse rather than overwrite: `fs.rename` replaces the destination
    // silently, and a media folder is shared.
    if (existsSync(to)) {
      throw new Error('A file with that name already exists');
    }
    if (dirname(from) !== dirname(to)) {
      throw new Error('A rename cannot move a file to another folder');
    }
    renameSync(from, to);
  }
};
