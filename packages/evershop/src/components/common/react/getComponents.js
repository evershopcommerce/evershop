import { resolve } from 'path';
import { useAppState } from '@components/common/context/app';
import { CONSTANTS } from '../../../lib/helpers.js';
import { get } from '../../../lib/util/get.js';

export function getComponents() {
  const componentsPath = get(useAppState(), 'componentsPath');
  if (!componentsPath) {
    return {};
  } else {
    return require(resolve(
      CONSTANTS.ROOTPATH,
      '.evershop/build/',
      componentsPath
    ));
  }
}
