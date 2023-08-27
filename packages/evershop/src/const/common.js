import { createMap, isValid } from "../utils/common";

export const VARIANTS = [
  'attention',
  'critical',
  'default',
  'info',
  'new',
  'success',
  'warning'
];

export const PROGRESSES = [
  'complete',
  'incomplete',
  'partiallycomplete'
];

export const isValidVariant = (toFind) => isValid(createMap(VARIANTS), toFind);

export const isValidProgress = (toFind) => isValid(createMap(PROGRESSES), toFind);

export default {
  isValidVariant,
  VARIANTS
}
