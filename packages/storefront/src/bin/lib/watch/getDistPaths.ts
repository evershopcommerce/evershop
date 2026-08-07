import { PathLike } from 'fs';

export function getDistPaths(): PathLike[] {
  return ['dist', 'packages/storefront/dist', 'packages/agegate/dist'];
}
