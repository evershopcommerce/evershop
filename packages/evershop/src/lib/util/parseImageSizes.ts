// Define your desired image breakpoints. Consider putting this in a config file.
const deviceSizes = [320, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

const isValidCondition = (condition: string): boolean => {
  if (!condition || typeof condition !== 'string') {
    return false;
  }

  const trimmed = condition.trim();
  if (!trimmed) {
    return false;
  }

  // Special case: handle 'auto' keyword
  if (trimmed === 'auto') {
    return true;
  }

  // Check for valid CSS units pattern - allow some whitespace between value and unit
  const validUnitsPattern =
    /(\d+(?:\.\d+)?)\s*(vw|vh|px|rem|em|%|ch|vmin|vmax|pt|pc|in|cm|mm|ex|ic|lh|vi|vb|cqw|cqh|cqi|cqb|cqmin|cqmax)\s*$/;

  // If it has parentheses, it should be a media query
  if (trimmed.includes('(')) {
    // Basic media query validation - must have closing parenthesis and valid value
    const hasClosingParen = trimmed.includes(')');
    const hasValidValue = validUnitsPattern.test(trimmed);
    // Also check that it has proper media query structure
    const hasProperMediaQuery = /\([^)]*\)/.test(trimmed);
    return hasClosingParen && hasValidValue && hasProperMediaQuery;
  } else {
    // Simple value without media query - but shouldn't have unmatched closing parenthesis
    const hasUnmatchedClosingParen = trimmed.includes(')');
    const hasValidValue = validUnitsPattern.test(trimmed);
    return !hasUnmatchedClosingParen && hasValidValue;
  }
};

// Parse sizes string to estimate actual image sizes
export const parseImageSizes = (sizes: string): number[] => {
  // Validate input
  if (!sizes || typeof sizes !== 'string') {
    throw new Error('Invalid sizes attribute: must be a non-empty string');
  }

  const trimmedSizes = sizes.trim();
  if (!trimmedSizes) {
    throw new Error(
      'Invalid sizes attribute: cannot be empty or whitespace only'
    );
  }

  // Handle fixed pixel values first
  if (
    trimmedSizes.endsWith('px') &&
    !trimmedSizes.includes(',') &&
    !trimmedSizes.includes('(')
  ) {
    const pixelValue = parseInt(trimmedSizes);
    if (!isNaN(pixelValue) && pixelValue > 0) {
      // For fixed pixel values, generate a few sizes around that value
      return deviceSizes
        .filter((size) => size >= pixelValue * 0.5) // Include smaller sizes for efficiency
        .slice(0, 4); // Limit to 4 sizes to keep srcset reasonable
    } else {
      throw new Error(
        `Invalid pixel value in sizes attribute: "${trimmedSizes}" must be a positive number followed by "px"`
      );
    }
  }

  // Parse complex sizes string with media queries
  const conditions = trimmedSizes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (conditions.length === 0) {
    throw new Error(
      'Invalid sizes attribute: no valid conditions found after parsing'
    );
  }

  // Validate that each condition has a proper format
  for (const condition of conditions) {
    if (!isValidCondition(condition)) {
      throw new Error(
        `Invalid condition in sizes attribute: "${condition}" - must contain a valid CSS length value or media query`
      );
    }
  }

  // For each device size, determine what actual image size would be used
  const imageSizes = deviceSizes.map((deviceSize) => {
    // Go through conditions in order until we find a match
    for (const condition of conditions) {
      const result = evaluateCondition(condition, deviceSize);
      if (result !== null) {
        return result;
      }
    }

    // If no conditions matched, assume full width
    return deviceSize;
  });

  // Remove duplicates, sort, and ensure we have reasonable variety
  const uniqueSizes = [...new Set(imageSizes)].sort((a, b) => a - b);
  // Ensure minimum variety for better responsive behavior
  if (uniqueSizes.length < 3) {
    // Add some intermediate sizes for better coverage
    const minSize = Math.min(...uniqueSizes);
    const maxSize = Math.max(...uniqueSizes);
    const midSize = Math.round((minSize + maxSize) / 2);
    uniqueSizes.push(midSize);
  }

  return [...new Set(uniqueSizes)].sort((a, b) => a - b);
};

export const evaluateCondition = (
  condition: string,
  deviceSize: number
): number | null => {
  // Remove extra whitespace
  condition = condition.trim();

  // Check if this condition has a media query
  if (condition.includes('(')) {
    // Extract media query and value parts - comprehensive regex for all CSS units
    const mediaQueryMatch = condition.match(/\(([^)]+)\)/g);
    const valueMatch = condition.match(
      /(\d+(?:\.\d+)?)\s*(vw|vh|px|rem|em|%|ch|vmin|vmax|pt|pc|in|cm|mm|ex|ic|lh|vi|vb|cqw|cqh|cqi|cqb|cqmin|cqmax)\s*$/
    );

    if (!mediaQueryMatch || !valueMatch) {
      return null;
    }

    const mediaQueries = mediaQueryMatch.map((mq) => mq.slice(1, -1)); // Remove parentheses
    const value = parseFloat(valueMatch[1]);
    const unit = valueMatch[2];

    // Check if all media queries match for this device size
    const allMatch = mediaQueries.every((mq) => {
      const matches = evaluateMediaQuery(mq, deviceSize);
      return matches;
    });

    if (allMatch) {
      const result = convertToPixels(value, unit, deviceSize);
      return result;
    }

    return null; // Media query doesn't match
  } else {
    // Special case: handle 'auto' keyword
    if (condition.trim() === 'auto') {
      // For 'auto', use a reasonable default based on the device size
      // We'll use 25% of the viewport width as a reasonable approximation
      return Math.round(deviceSize * 0.25);
    }

    // No media query, this is a fallback value - comprehensive regex for all CSS units
    const valueMatch = condition.match(
      /(\d+(?:\.\d+)?)\s*(vw|vh|px|rem|em|%|ch|vmin|vmax|pt|pc|in|cm|mm|ex|ic|lh|vi|vb|cqw|cqh|cqi|cqb|cqmin|cqmax)\s*$/
    );
    if (valueMatch) {
      const value = parseFloat(valueMatch[1]);
      const unit = valueMatch[2];
      const result = convertToPixels(value, unit, deviceSize);
      return result;
    }
  }

  return null;
};

export const evaluateMediaQuery = (
  mediaQuery: string,
  deviceSize: number
): boolean => {
  // Handle different media query types with improved regex patterns
  if (mediaQuery.includes('max-width')) {
    const maxWidth = parseFloat(
      mediaQuery.match(/max-width\s*:\s*(\d+(?:\.\d+)?)px/)?.[1] || '0'
    );
    return deviceSize <= maxWidth;
  }

  if (mediaQuery.includes('min-width')) {
    const minWidth = parseFloat(
      mediaQuery.match(/min-width\s*:\s*(\d+(?:\.\d+)?)px/)?.[1] || '0'
    );
    return deviceSize >= minWidth;
  }

  if (mediaQuery.includes('max-device-width')) {
    const maxDeviceWidth = parseFloat(
      mediaQuery.match(/max-device-width\s*:\s*(\d+(?:\.\d+)?)px/)?.[1] || '0'
    );
    return deviceSize <= maxDeviceWidth;
  }

  if (mediaQuery.includes('min-device-width')) {
    const minDeviceWidth = parseFloat(
      mediaQuery.match(/min-device-width\s*:\s*(\d+(?:\.\d+)?)px/)?.[1] || '0'
    );
    return deviceSize >= minDeviceWidth;
  }

  // Handle orientation
  if (mediaQuery.includes('orientation')) {
    if (mediaQuery.includes('landscape')) {
      return deviceSize >= 768; // Assume landscape for wider screens
    }
    if (mediaQuery.includes('portrait')) {
      return deviceSize < 768; // Assume portrait for narrower screens
    }
  }

  // Handle aspect-ratio (simplified)
  if (mediaQuery.includes('aspect-ratio')) {
    // For simplicity, assume most common aspect ratios match
    return true;
  }

  // Handle resolution/pixel density
  if (
    mediaQuery.includes('resolution') ||
    mediaQuery.includes('-webkit-device-pixel-ratio')
  ) {
    // For srcset calculation, we generally assume 2x displays are common
    return true;
  }

  // Handle prefers-color-scheme, prefers-reduced-motion etc.
  if (mediaQuery.includes('prefers-')) {
    // These don't affect image sizing, so return true
    return true;
  }

  // Default: if we can't parse it, assume it matches
  return true;
};

export const convertToPixels = (
  value: number,
  unit: string,
  deviceSize: number
): number => {
  switch (unit) {
    // Viewport units
    case 'vw':
      return Math.round((deviceSize * value) / 100);
    case 'vh':
      // Assume viewport height is roughly 1.5x viewport width for mobile, 0.6x for desktop
      const assumedHeight =
        deviceSize <= 768 ? deviceSize * 1.5 : deviceSize * 0.6;
      return Math.round((assumedHeight * value) / 100);
    case 'vmin':
      // vmin is the smaller of vw or vh
      const vminHeight =
        deviceSize <= 768 ? deviceSize * 1.5 : deviceSize * 0.6;
      const minDimension = Math.min(deviceSize, vminHeight);
      return Math.round((minDimension * value) / 100);
    case 'vmax':
      // vmax is the larger of vw or vh
      const vmaxHeight =
        deviceSize <= 768 ? deviceSize * 1.5 : deviceSize * 0.6;
      const maxDimension = Math.max(deviceSize, vmaxHeight);
      return Math.round((maxDimension * value) / 100);
    case 'vi':
      // Viewport inline (same as vw in horizontal writing mode)
      return Math.round((deviceSize * value) / 100);
    case 'vb':
      // Viewport block (same as vh in horizontal writing mode)
      const vbHeight = deviceSize <= 768 ? deviceSize * 1.5 : deviceSize * 0.6;
      return Math.round((vbHeight * value) / 100);

    // Absolute length units
    case 'px':
      return Math.round(value);
    case 'pt':
      // 1pt = 1.33px (approximately)
      return Math.round(value * 1.33);
    case 'pc':
      // 1pc = 16px (1 pica = 12 points)
      return Math.round(value * 16);
    case 'in':
      // 1in = 96px (CSS reference pixel)
      return Math.round(value * 96);
    case 'cm':
      // 1cm = 37.8px (96px/2.54)
      return Math.round(value * 37.8);
    case 'mm':
      // 1mm = 3.78px (37.8px/10)
      return Math.round(value * 3.78);

    // Relative length units
    case '%':
      // Assume % is relative to viewport width (same as vw in most contexts)
      return Math.round((deviceSize * value) / 100);
    case 'rem':
      // Assume 1rem = 16px (default browser font size)
      return Math.round(value * 16);
    case 'em':
      // Assume 1em = 16px (in absence of parent context)
      return Math.round(value * 16);
    case 'ex':
      // Assume 1ex = 8px (approximately 0.5em)
      return Math.round(value * 8);
    case 'ch':
      // Assume 1ch = 8px (approximate character width in monospace font)
      return Math.round(value * 8);
    case 'ic':
      // Assume 1ic = 16px (ideographic character width, similar to em)
      return Math.round(value * 16);
    case 'lh':
      // Assume 1lh = 24px (typical line height is 1.5em)
      return Math.round(value * 24);

    // Container query units (treat similar to viewport units for now)
    case 'cqw':
      // Container query width (fallback to viewport width)
      return Math.round((deviceSize * value) / 100);
    case 'cqh':
      // Container query height (fallback to viewport height)
      const cqhHeight = deviceSize <= 768 ? deviceSize * 1.5 : deviceSize * 0.6;
      return Math.round((cqhHeight * value) / 100);
    case 'cqi':
      // Container query inline (fallback to viewport width)
      return Math.round((deviceSize * value) / 100);
    case 'cqb':
      // Container query block (fallback to viewport height)
      const cqbHeight = deviceSize <= 768 ? deviceSize * 1.5 : deviceSize * 0.6;
      return Math.round((cqbHeight * value) / 100);
    case 'cqmin':
      // Container query min (fallback to vmin)
      const cqminHeight =
        deviceSize <= 768 ? deviceSize * 1.5 : deviceSize * 0.6;
      const cqMinDimension = Math.min(deviceSize, cqminHeight);
      return Math.round((cqMinDimension * value) / 100);
    case 'cqmax':
      // Container query max (fallback to vmax)
      const cqmaxHeight =
        deviceSize <= 768 ? deviceSize * 1.5 : deviceSize * 0.6;
      const cqMaxDimension = Math.max(deviceSize, cqmaxHeight);
      return Math.round((cqMaxDimension * value) / 100);

    default:
      // Fallback to treating as pixels
      return Math.round(value);
  }
};
