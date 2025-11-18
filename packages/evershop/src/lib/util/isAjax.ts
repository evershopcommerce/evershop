import type { EvershopRequest } from '../../types/request.js';

export function isAjax(request: EvershopRequest) {
  return request.get('X-Requested-With') === 'XMLHttpRequest';
}
