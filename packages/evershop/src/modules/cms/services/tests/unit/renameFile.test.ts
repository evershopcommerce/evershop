import { describe, expect, it } from '@jest/globals';
import {
  assertValidFileName,
  resolveRenameTarget,
  siblingPath
} from '../../renameFile.js';

describe('assertValidFileName', () => {
  it('accepts an ordinary file name', () => {
    expect(() => assertValidFileName('chocolate-cake.png')).not.toThrow();
    expect(() => assertValidFileName('report_2026.v2.pdf')).not.toThrow();
  });

  it('refuses a path separator', () => {
    // A name is not a path. Accepting one would turn a rename into a move to
    // anywhere the process can write.
    expect(() => assertValidFileName('a/b.png')).toThrow(/path separator/);
    expect(() => assertValidFileName('a\\b.png')).toThrow(/path separator/);
  });

  it('refuses traversal', () => {
    expect(() => assertValidFileName('..')).toThrow();
    expect(() => assertValidFileName('.')).toThrow();
    expect(() => assertValidFileName('../../etc/passwd')).toThrow();
  });

  it('refuses an empty or whitespace-only name', () => {
    expect(() => assertValidFileName('')).toThrow(/empty/);
    expect(() => assertValidFileName('   ')).toThrow(/empty/);
  });

  it('refuses characters that would not survive storage', () => {
    // Refused, not sanitised: silently rewriting what someone typed gives
    // them a file they cannot find again.
    expect(() => assertValidFileName('my cake.png')).toThrow();
    expect(() => assertValidFileName('cake?.png')).toThrow();
  });

  it('refuses a name too long to store', () => {
    expect(() => assertValidFileName(`${'a'.repeat(256)}.png`)).toThrow(
      /too long/
    );
  });
});

describe('siblingPath', () => {
  it('keeps the file in its folder', () => {
    expect(siblingPath('catalog/old.png', 'new.png')).toBe('catalog/new.png');
    expect(siblingPath('a/b/c/old.png', 'new.png')).toBe('a/b/c/new.png');
  });

  it('handles a file at the media root', () => {
    expect(siblingPath('old.png', 'new.png')).toBe('new.png');
  });

  it('normalises a leading slash', () => {
    // `buildUrl` and the browse API disagree about the leading slash; the
    // stored key must not.
    expect(siblingPath('/catalog/old.png', 'new.png')).toBe('catalog/new.png');
  });
});

describe('resolveRenameTarget', () => {
  it('keeps the original extension when only a stem is typed', () => {
    // The common case: someone types "chocolate-cake" over the generated name.
    expect(resolveRenameTarget('pasted-20260930.png', 'chocolate-cake')).toBe(
      'chocolate-cake.png'
    );
  });

  it('accepts the same extension and normalises its spelling', () => {
    expect(resolveRenameTarget('a.png', 'cake.png')).toBe('cake.png');
    // One convention, not two.
    expect(resolveRenameTarget('a.png', 'cake.PNG')).toBe('cake.png');
    expect(resolveRenameTarget('a.JPG', 'cake.jpg')).toBe('cake.JPG');
  });

  it('refuses to change the extension', () => {
    // Renaming cannot convert a file. A .png called .jpg is served wrong and
    // previews wrong, with nothing to show why.
    expect(() => resolveRenameTarget('a.png', 'cake.jpg')).toThrow(
      /extension cannot be changed/
    );
  });

  it('refuses to drop the extension into a bare dot', () => {
    expect(() => resolveRenameTarget('a.png', 'cake.')).toThrow();
  });

  it('refuses to add an extension to a file that has none', () => {
    expect(() => resolveRenameTarget('README', 'notes.png')).toThrow(
      /no extension/
    );
  });

  it('renames an extensionless file to another extensionless name', () => {
    expect(resolveRenameTarget('README', 'NOTES')).toBe('NOTES');
  });

  it('treats a dotfile as having no extension', () => {
    expect(resolveRenameTarget('.gitignore', '.npmignore')).toBe('.npmignore');
  });

  it('keeps the last extension of a multi-dotted name', () => {
    expect(resolveRenameTarget('photo.backup.png', 'cake')).toBe('cake.png');
    // ".v2" is a different extension, not part of the stem.
    expect(() => resolveRenameTarget('photo.backup.png', 'cake.v2')).toThrow(
      /extension cannot be changed/
    );
  });
});
