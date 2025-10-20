import { PageMetaInfo } from '../../../types/pageMeta.js';
import { EvershopRequest } from '../../../types/request.js';
import {
  getContextValue,
  setContextValue
} from '../../graphql/services/contextHelper.js';

export function setPageMetaInfo(
  request: EvershopRequest,
  info: Partial<PageMetaInfo>
) {
  const current = getContextValue(request, 'pageInfo', {});
  const newInfo = { ...current, ...info };
  setContextValue(request, 'pageInfo', newInfo);
}

export function getPageMetaInfo(request: EvershopRequest): PageMetaInfo {
  return getContextValue(request, 'pageInfo', {}) as PageMetaInfo;
}
