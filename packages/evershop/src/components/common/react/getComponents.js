import { useAppState } from '@components/common/context/app';
import { get } from '../../../lib/util/get.js';
const { resolve } = require('path');
const { CONSTANTS } = require('../../../lib/helpers');

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
