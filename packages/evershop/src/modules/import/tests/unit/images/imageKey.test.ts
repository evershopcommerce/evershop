import { createHash } from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { generateFileName } from '../../../../cms/services/generateFileName.js';
import { imageStorageKey } from '../../../services/images/imageKey.js';

const deps = {
  sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex'),
  sanitizeFileName: generateFileName as (original: string) => string
};

const keyOf = (url: string, type = 'image/png') =>
  imageStorageKey(url, type, deps);

describe('imageStorageKey (§ 5.8)', () => {
  it('puts the file in catalog/<8 digits>/<8 digits>, the first sixteen hex digits of the hash of the URL', () => {
    // The first sixteen hex digits of the SHA-256 of each URL.
    expect(keyOf('https://cdn.example.com/a.png')).toEqual({
      directory: 'catalog/6155f67e/fa620e76',
      fileName: 'a.png'
    });
    expect(keyOf('https://other.example.com/a.png')).toEqual({
      directory: 'catalog/72b720e4/2762c11c',
      fileName: 'a.png'
    });
  });

  it('gives the same key for the same URL, and other folders for other URLs with the same name', () => {
    expect(keyOf('https://cdn.example.com/a.png')).toEqual(
      keyOf('https://cdn.example.com/a.png')
    );
    expect(keyOf('https://cdn.example.com/a.png').directory).not.toBe(
      keyOf('https://other.example.com/a.png').directory
    );
    expect(keyOf('https://cdn.example.com/a.png?v=1').directory).not.toBe(
      keyOf('https://cdn.example.com/a.png?v=2').directory
    );
  });

  it('does not let two URLs with one file name share a folder, however many there are', () => {
    // With 16 bits of the hash (65,536 folders) a few hundred such URLs collide.
    const seen = new Map<string, string>();
    for (let id = 0; id < 20_000; id += 1) {
      const url = `https://cdn.example.com/p/${id}/main.jpg`;
      const key = keyOf(url, 'image/jpeg');
      const path = `${key.directory}/${key.fileName}`;
      expect(seen.get(path)).toBeUndefined();
      seen.set(path, url);
    }
  });

  it('keeps the name of the URL, sanitized, and takes the extension from the content type', () => {
    expect(keyOf('https://cdn.example.com/img/Blue%20Tee.JPG?v=2')).toEqual({
      directory: 'catalog/7b053eec/60a750ba',
      fileName: 'blue-tee.png'
    });
    expect(keyOf('https://cdn.example.com/a.svg', 'image/png').fileName).toBe(
      'a.png'
    );
    expect(keyOf('https://cdn.example.com/a.js', 'image/webp').fileName).toBe(
      'a.webp'
    );
    expect(
      keyOf('https://cdn.example.com/photo.png', 'image/jpeg').fileName
    ).toBe('photo.jpg');
    expect(keyOf('https://cdn.example.com/photo', 'image/gif').fileName).toBe(
      'photo.gif'
    );
  });

  it.each([
    ['https://x.test/a/b/c/final.png', 'final.png'],
    ['https://x.test/a.b.c.png', 'a-b-c.png'],
    ['https://x.test/Äo Thun (2).png', 'o-thun-2.png'],
    ['https://x.test/a%2Fb.png', 'b.png'],
    ['https://x.test/%E0%A4%A.png', 'e0-a4-a.png'],
    ['https://x.test/日本語.png', 'image.png'],
    ['https://x.test/', 'image.png'],
    ['https://x.test', 'image.png'],
    ['https://x.test/.png', 'image.png'],
    ['https://x.test/--a--.png', 'a.png'],
    ['https://x.test/a%20%20%20b.png', 'a-b.png'],
    ['https://x.test/a/b/', 'b.png']
  ])('names %s as %s', (url, fileName) => {
    expect(keyOf(url).fileName).toBe(fileName);
  });

  it('keeps a long name to 100 characters', () => {
    const name = keyOf(`https://x.test/${'a'.repeat(300)}.png`).fileName;
    expect(name).toBe(`${'a'.repeat(100)}.png`);
  });

  it('never gives a path in the name', () => {
    for (const url of [
      'https://x.test/..%2F..%2Fetc%2Fpasswd.png',
      'https://x.test/a%5Cb.png',
      'https://x.test/%2e%2e/%2e%2e/x.png'
    ]) {
      const { fileName } = keyOf(url);
      expect(fileName).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.png$/);
    }
  });

  it('says so when the type has no extension', () => {
    expect(() => keyOf('https://x.test/a.png', 'image/svg+xml')).toThrow(
      'No extension'
    );
  });
});
