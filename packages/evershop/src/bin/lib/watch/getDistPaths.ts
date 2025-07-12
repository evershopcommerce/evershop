import { PathLike } from 'fs';

export function getDistPaths(): PathLike[] {
  return ['dist', 'packages/evershop/dist', 'packages/agegate/dist'];
}
