import type { EverShopRequest } from 'types/request'

export function isAjax(request: EverShopRequest) {
  return request.get('X-Requested-With') === 'XMLHttpRequest';
}
