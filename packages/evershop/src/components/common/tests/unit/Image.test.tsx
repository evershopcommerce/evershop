import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Image } from '../../Image.js';

const styleOf = (html: string) => (html.match(/style="([^"]*)"/) || [])[1] || '';

describe('Image', () => {
  it('crops (object-fit: cover) by default so photos of another ratio are never stretched', () => {
    const html = renderToStaticMarkup(<Image src="/assets/a.jpg" alt="a" width={800} height={1200} />);
    expect(styleOf(html)).toContain('object-fit:cover');
    expect(styleOf(html)).toContain('aspect-ratio:800 / 1200');
  });

  it('honours an explicit objectFit', () => {
    const html = renderToStaticMarkup(<Image src="/assets/a.jpg" alt="a" width={800} height={800} objectFit="contain" />);
    expect(styleOf(html)).toContain('object-fit:contain');
  });

  it('lets a consumer style override the intrinsic aspect ratio (theme frames)', () => {
    const html = renderToStaticMarkup(
      <Image src="/assets/a.jpg" alt="a" width={800} height={800} style={{ aspectRatio: '2 / 3' }} />
    );
    expect(styleOf(html)).toContain('aspect-ratio:2 / 3');
    expect(styleOf(html)).not.toContain('aspect-ratio:800 / 800');
  });
});
