import type { StorefrontRequest } from '../../types/request.js';

export function isAjax(request: StorefrontRequest) {
  return request.get('X-Requested-With') === 'XMLHttpRequest';
}
