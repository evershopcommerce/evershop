import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { imageProcessor } from '../../../services/imageProcessor.js';

// The largest width the storefront asks for (see deviceSizes in
// lib/util/parseImageSizes). Anything bigger only costs CPU and memory.
const MAX_IMAGE_DIMENSION = 3840;

const isValidDimension = (value: number) =>
  Number.isInteger(value) && value > 0 && value <= MAX_IMAGE_DIMENSION;

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const src = typeof request.query.src === 'string' ? request.query.src : '';
  const width = parseInt(request.query.w as string, 10);
  const height = request.query.h
    ? parseInt(request.query.h as string, 10)
    : undefined;
  // Default quality to 75 if not provided or invalid
  const requestedQuality = parseInt(request.query.q as string, 10);
  const quality =
    requestedQuality >= 1 && requestedQuality <= 100 ? requestedQuality : 75;
  const format = ['jpeg', 'png', 'webp', 'avif'].includes(
    request.query.f as string
  )
    ? (request.query.f as 'jpeg' | 'png' | 'webp' | 'avif')
    : 'webp';

  if (
    !src ||
    !isValidDimension(width) ||
    (height !== undefined && !isValidDimension(height))
  ) {
    return response.status(400).send('Invalid parameters');
  }

  try {
    const result = await imageProcessor(src, width, quality, format, height);
    response.setHeader('Content-Type', result.metadata.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Send only the buffer data, not the entire result object
    response.send(result.buffer);
  } catch (error) {
    response.status(404).send('Not Found');
  }
};
