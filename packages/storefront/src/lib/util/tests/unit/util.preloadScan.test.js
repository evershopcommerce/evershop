import {
  injectPreloadLinks,
  injectPreloadLinksAfterCharset,
  cleanupPreloadAttributes,
  processPreloadImages
} from '../../preloadScan.js';

describe('preloadScan', () => {
  describe('injectPreloadLinks function', () => {
    test('should inject preload links before closing head tag', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test</title>
</head>
<body>
  <img src="/test-image.jpg" srcSet="/test-image.jpg 500w, /test-image.jpg 1000w" sizes="100vw" alt="Test" itemProp="preload" />
</body>
</html>`;

      const result = injectPreloadLinks(html);

      expect(result).toContain(
        '<link rel="preload" as="image" href="/test-image.jpg" fetchpriority="high"'
      );
      expect(result).toContain(
        'imagesrcset="/test-image.jpg 500w, /test-image.jpg 1000w"'
      );
      expect(result).toContain('imagesizes="100vw"');
      expect(result).toMatch(/<link[^>]*>\s*<\/head>/);
    });

    test('should handle multiple preload images', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test</title>
</head>
<body>
  <img src="/image1.jpg" srcSet="/image1.jpg 500w" sizes="50vw" alt="Image 1" itemProp="preload" />
  <img src="/image2.jpg" srcSet="/image2.jpg 800w" sizes="100vw" alt="Image 2" itemProp="preload" />
  <img src="/normal.jpg" alt="Normal" />
</body>
</html>`;

      const result = injectPreloadLinks(html);

      expect(result).toContain('href="/image1.jpg"');
      expect(result).toContain('href="/image2.jpg"');
      expect(result).not.toContain('href="/normal.jpg"');
      expect((result.match(/<link rel="preload"/g) || []).length).toBe(2);
    });

    test('should return original HTML if no preload images found', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test</title>
</head>
<body>
  <img src="/normal-image.jpg" alt="Normal" />
</body>
</html>`;

      const result = injectPreloadLinks(html);
      expect(result).toBe(html);
    });

    test('should handle missing head tag gracefully', () => {
      const html = `<body>
  <img src="/test-image.jpg" itemProp="preload" />
</body>`;

      const result = injectPreloadLinks(html);
      expect(result).toBe(html);
    });

    test('should handle images with crossorigin attribute', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
  <img src="/test-image.jpg" crossorigin="anonymous" itemProp="preload" />
</body>
</html>`;

      const result = injectPreloadLinks(html);
      expect(result).toContain('crossorigin="anonymous"');
    });
  });

  describe('injectPreloadLinksAfterCharset function', () => {
    test('should inject preload links after charset meta tag', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
  <title>Test</title>
</head>
<body>
  <img src="/test-image.jpg" srcSet="/test-image.jpg 500w" sizes="100vw" itemProp="preload" />
</body>
</html>`;

      const result = injectPreloadLinksAfterCharset(html);

      expect(result).toContain('<meta charSet="utf-8" />');
      expect(result).toMatch(/<meta charSet="utf-8" \/>\s*<link rel="preload"/);
      expect(result).toContain('href="/test-image.jpg"');
    });

    test('should fallback to head injection if no charset meta found', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <img src="/test-image.jpg" itemProp="preload" />
</body>
</html>`;

      const result = injectPreloadLinksAfterCharset(html);

      expect(result).toContain('<link rel="preload"');
      expect(result).toMatch(/<link[^>]*>\s*<\/head>/);
    });

    test('should handle charset with different quote styles', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Test</title>
</head>
<body>
  <img src="/test-image.jpg" itemProp="preload" />
</body>
</html>`;

      const result = injectPreloadLinksAfterCharset(html);
      expect(result).toContain('<link rel="preload"');
    });
  });

  describe('cleanupPreloadAttributes function', () => {
    test('should remove itemProp="preload" attributes', () => {
      const html = `<img src="/test.jpg" itemProp="preload" alt="Test" />
<img src="/normal.jpg" alt="Normal" />
<img src="/another.jpg" itemProp="preload" sizes="100vw" />`;

      const result = cleanupPreloadAttributes(html);

      expect(result).not.toContain('itemProp="preload"');
      expect(result).toContain('src="/test.jpg"');
      expect(result).toContain('alt="Test"');
      expect(result).toContain('src="/normal.jpg"');
      expect(result).toContain('sizes="100vw"');
    });

    test('should handle single quotes', () => {
      const html = `<img src="/test.jpg" itemProp='preload' alt="Test" />`;
      const result = cleanupPreloadAttributes(html);

      expect(result).not.toContain("itemProp='preload'");
      expect(result).toContain('src="/test.jpg"');
    });

    test('should handle extra whitespace around attributes', () => {
      const html = `<img src="/test.jpg"  itemProp="preload"  alt="Test" />`;
      const result = cleanupPreloadAttributes(html);

      expect(result).not.toContain('itemProp="preload"');
      expect(result).toContain('src="/test.jpg"');
    });

    test('should return unchanged HTML if no preload attributes found', () => {
      const html = `<img src="/test.jpg" alt="Test" />
<img src="/normal.jpg" alt="Normal" />`;

      const result = cleanupPreloadAttributes(html);
      expect(result).toBe(html);
    });
  });

  describe('processPreloadImages function (complete pipeline)', () => {
    test('should process complete pipeline: inject and cleanup', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
  <title>Test</title>
</head>
<body>
  <img src="/hero-image.jpg" srcSet="/hero-image.jpg 500w, /hero-image.jpg 1000w" sizes="100vw" alt="Hero" itemProp="preload" />
  <img src="/normal-image.jpg" alt="Normal" />
</body>
</html>`;

      const result = processPreloadImages(html);

      // Should have preload link
      expect(result).toContain(
        '<link rel="preload" as="image" href="/hero-image.jpg" fetchpriority="high"'
      );
      expect(result).toContain(
        'imagesrcset="/hero-image.jpg 500w, /hero-image.jpg 1000w"'
      );
      expect(result).toContain('imagesizes="100vw"');

      // Should have cleaned up itemProp attributes
      expect(result).not.toContain('itemProp="preload"');

      // Should preserve other attributes
      expect(result).toContain('src="/hero-image.jpg"');
      expect(result).toContain('alt="Hero"');
      expect(result).toContain('src="/normal-image.jpg"');
    });

    test('should handle multiple images with different attributes', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <img src="/image1.jpg" srcSet="/image1.jpg 500w" sizes="50vw" crossorigin="anonymous" itemProp="preload" />
  <img src="/image2.jpg" sizes="100vw" itemProp="preload" />
  <img src="/image3.jpg" alt="Normal" />
</body>
</html>`;

      const result = processPreloadImages(html);

      // Should have two preload links
      expect((result.match(/<link rel="preload"/g) || []).length).toBe(2);

      // Should include crossorigin for first image
      expect(result).toContain('crossorigin="anonymous"');

      // Should not have preload links for normal image
      expect(result).not.toContain('href="/image3.jpg"');

      // Should clean up all itemProp attributes
      expect(result).not.toContain('itemProp="preload"');
    });

    test('should return original HTML if no preload images', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
  <title>Test</title>
</head>
<body>
  <img src="/normal1.jpg" alt="Normal 1" />
  <img src="/normal2.jpg" alt="Normal 2" />
</body>
</html>`;

      const result = processPreloadImages(html);
      expect(result).toBe(html);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle malformed img tags', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <img src="/test.jpg" itemProp="preload" >
  <img src="/test2.jpg" itemProp="preload" alt="Test"
  <img src="/test3.jpg" itemProp="preload" />
</body>
</html>`;

      const result = processPreloadImages(html);

      // Should handle valid tags and skip malformed ones gracefully
      expect(result).toContain('<link rel="preload"');
      expect(result).not.toContain('itemProp="preload"');
    });

    test('should handle img tags without src attribute', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <img alt="No src" itemProp="preload" />
  <img src="/valid.jpg" itemProp="preload" />
</body>
</html>`;

      const result = processPreloadImages(html);

      // Should only create preload link for image with src
      expect((result.match(/<link rel="preload"/g) || []).length).toBe(1);
      expect(result).toContain('href="/valid.jpg"');
    });

    test('should handle empty HTML', () => {
      const result = processPreloadImages('');
      expect(result).toBe('');
    });

    test('should handle HTML with no body', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
  <title>Test</title>
</head>
</html>`;

      const result = processPreloadImages(html);
      expect(result).toBe(html);
    });

    test('should handle images with special characters in attributes', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <img src="/test image.jpg" srcSet="/test%20image.jpg 500w" sizes="(max-width: 600px) 100vw, 50vw" itemProp="preload" />
</body>
</html>`;

      const result = processPreloadImages(html);

      expect(result).toContain('href="/test image.jpg"');
      expect(result).toContain('imagesrcset="/test%20image.jpg 500w"');
      expect(result).toContain('imagesizes="(max-width: 600px) 100vw, 50vw"');
    });

    test('should handle case-insensitive itemProp matching', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <img src="/test1.jpg" ITEMPROP="preload" />
  <img src="/test2.jpg" itemProp="PRELOAD" />
  <img src="/test3.jpg" ItemProp="Preload" />
</body>
</html>`;

      const result = processPreloadImages(html);

      // Should match all variations
      expect((result.match(/<link rel="preload"/g) || []).length).toBe(3);
      expect(result).toContain('href="/test1.jpg"');
      expect(result).toContain('href="/test2.jpg"');
      expect(result).toContain('href="/test3.jpg"');
    });

    test('should handle images with data attributes', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <img src="/test.jpg" data-lazy="true" data-src="/fallback.jpg" itemProp="preload" />
</body>
</html>`;

      const result = processPreloadImages(html);

      expect(result).toContain('<link rel="preload"');
      expect(result).toContain('href="/test.jpg"'); // Should use src, not data-src
      expect(result).toContain('data-lazy="true"'); // Should preserve other attributes
    });
  });

  describe('attribute extraction accuracy', () => {
    test('should correctly extract all preload-relevant attributes', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <img 
    src="/complex-image.jpg" 
    srcSet="/complex-image.jpg 320w, /complex-image.jpg 640w, /complex-image.jpg 1024w" 
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" 
    crossorigin="use-credentials"
    alt="Complex Image"
    class="hero-image"
    itemProp="preload"
    loading="eager"
  />
</body>
</html>`;

      const result = processPreloadImages(html);

      expect(result).toContain('href="/complex-image.jpg"');
      expect(result).toContain(
        'imagesrcset="/complex-image.jpg 320w, /complex-image.jpg 640w, /complex-image.jpg 1024w"'
      );
      expect(result).toContain(
        'imagesizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"'
      );
      expect(result).toContain('crossorigin="use-credentials"');
      expect(result).toContain('fetchpriority="high"');

      // Should preserve non-preload attributes in original img tag
      expect(result).toContain('alt="Complex Image"');
      expect(result).toContain('class="hero-image"');
      expect(result).toContain('loading="eager"');

      // Should clean up itemProp
      expect(result).not.toContain('itemProp="preload"');
    });

    test('should handle missing optional attributes gracefully', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <img src="/minimal.jpg" itemProp="preload" />
</body>
</html>`;

      const result = processPreloadImages(html);

      expect(result).toContain(
        '<link rel="preload" as="image" href="/minimal.jpg" fetchpriority="high" />'
      );
      expect(result).not.toContain('imagesrcset');
      expect(result).not.toContain('imagesizes');
      expect(result).not.toContain('crossorigin');
    });
  });

  describe('performance and scalability', () => {
    test('should handle large HTML documents efficiently', () => {
      // Create a large HTML document with many images
      const manyImages = Array.from(
        { length: 100 },
        (_, i) =>
          `<img src="/image${i}.jpg" alt="Image ${i}" ${
            i % 10 === 0 ? 'itemProp="preload"' : ''
          } />`
      ).join('\n');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  ${manyImages}
</body>
</html>`;

      const startTime = performance.now();
      const result = processPreloadImages(html);
      const endTime = performance.now();

      // Should complete in reasonable time (less than 50ms for 100 images)
      expect(endTime - startTime).toBeLessThan(50);

      // Should find correct number of preload images (every 10th image)
      expect((result.match(/<link rel="preload"/g) || []).length).toBe(10);
    });

    test('should handle deeply nested HTML structure', () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charSet="utf-8" />
</head>
<body>
  <div>
    <section>
      <article>
        <div>
          <figure>
            <img src="/nested-image.jpg" itemProp="preload" />
          </figure>
        </div>
      </article>
    </section>
  </div>
</body>
</html>`;

      const result = processPreloadImages(html);

      expect(result).toContain('<link rel="preload"');
      expect(result).toContain('href="/nested-image.jpg"');
      expect(result).not.toContain('itemProp="preload"');
    });
  });
});
