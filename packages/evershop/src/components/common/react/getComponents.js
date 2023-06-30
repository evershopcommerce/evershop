/* eslint-disable global-require */
import { useAppState } from '@components/common/context/app';
import { get } from '@evershop/evershop/src/lib/util/get';
import { resolve } from 'path';

import { CONSTANTS } from '@evershop/evershop/src/lib/helpers';

export function getComponents() {
  const {
    ROOTPATH
  } = CONSTANTS;
  const componentsPath = get(useAppState(), 'componentsPath');

  return  componentsPath ? require(resolve(ROOTPATH, '.evershop/build/', componentsPath)) : {};
}
