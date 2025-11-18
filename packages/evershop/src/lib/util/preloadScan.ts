interface PreloadImage {
  src: string;
  srcset?: string;
  sizes?: string;
  crossorigin?: string;
}

function extractPreloadImages(html: string): PreloadImage[] {
  const imgRegex = /<img[^>]*itemProp=["']preload["'][^>]*>/gi;
  const images: PreloadImage[] = [];

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];

    // Extract src attribute
    const srcMatch = imgTag.match(/src=["']([^"']*)["']/i);
    if (!srcMatch) continue;

    const preloadImage: PreloadImage = {
      src: srcMatch[1]
    };

    const srcsetMatch = imgTag.match(/srcSet=["']([^"']*)["']/i);
    if (srcsetMatch) {
      preloadImage.srcset = srcsetMatch[1];
    }

    const sizesMatch = imgTag.match(/sizes=["']([^"']*)["']/i);
    if (sizesMatch) {
      preloadImage.sizes = sizesMatch[1];
    }

    const crossoriginMatch = imgTag.match(/crossorigin=["']([^"']*)["']/i);
    if (crossoriginMatch) {
      preloadImage.crossorigin = crossoriginMatch[1];
    }

    images.push(preloadImage);
  }

  return images;
}

function generatePreloadLinks(images: PreloadImage[]): string {
  return images
    .map((image) => {
      const attributes = [
        'rel="preload"',
        'as="image"',
        `href="${image.src}"`,
        'fetchpriority="high"'
      ];

      if (image.srcset) {
        attributes.push(`imagesrcset="${image.srcset}"`);
      }

      if (image.sizes) {
        attributes.push(`imagesizes="${image.sizes}"`);
      }

      if (image.crossorigin) {
        attributes.push(`crossorigin="${image.crossorigin}"`);
      }

      return `    <link ${attributes.join(' ')} />`;
    })
    .join('\n');
}

export function injectPreloadLinks(html: string): string {
  const preloadImages = extractPreloadImages(html);

  if (preloadImages.length === 0) {
    return html;
  }

  const preloadLinks = generatePreloadLinks(preloadImages);

  const headCloseRegex = /(<\/head>)/i;

  const modifiedHtml = html.replace(headCloseRegex, `${preloadLinks}\n$1`);

  return modifiedHtml;
}

export function injectPreloadLinksAfterCharset(html: string): string {
  const preloadImages = extractPreloadImages(html);

  if (preloadImages.length === 0) {
    return html;
  }

  const preloadLinks = generatePreloadLinks(preloadImages);

  const charsetRegex = /(<meta\s+charSet=["'][^"']*["'][^>]*>)/i;

  if (charsetRegex.test(html)) {
    const modifiedHtml = html.replace(charsetRegex, `$1\n${preloadLinks}`);
    return modifiedHtml;
  }

  return injectPreloadLinks(html);
}

export function cleanupPreloadAttributes(html: string): string {
  return html.replace(/\s*itemProp=["']preload["']/gi, '');
}

export function processPreloadImages(html: string): string {
  let processedHtml = injectPreloadLinksAfterCharset(html);
  processedHtml = cleanupPreloadAttributes(processedHtml);
  return processedHtml;
}
