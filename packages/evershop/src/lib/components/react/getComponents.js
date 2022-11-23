import { useAppState } from '../../context/app';
import { get } from '../../util/get';

/* eslint-disable global-require */
const { resolve } = require('path');
const { CONSTANTS } = require('../../helpers');

export function getComponents() {
  const componentsPath = get(useAppState(), 'componentsPath');
  if (!componentsPath) {
    return {};
  } else {
    return require(resolve(CONSTANTS.ROOTPATH, '.evershop/build/', componentsPath));
  }
}
