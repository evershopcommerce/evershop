import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { addProcessor, getValueSync } from './registry.js';
import { Validator, ValidatorManager } from './validator.js';

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
}

/**
 * The shape of a bcrypt hash: prefix `$2a$`, `$2b$` or `$2y$`, a cost from 04
 * to 31 and 53 characters of salt and hash. `bcryptjs.compareSync` verifies all
 * three prefixes (checked with 2.4.3), and a looser pattern would admit strings
 * for which it throws.
 */
export const BCRYPT_HASH_PATTERN =
  /^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/;

export function isBcryptHash(value: unknown): value is string {
  return typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);
}

/**
 * A hash of 32 random bytes that nobody knows: the password of an account that
 * is created without one. The owner of the account chooses a password with the
 * reset flow. Costs one bcrypt hash (about 60 ms), so a caller that creates many
 * such accounts makes it once and passes it on.
 */
export function createUnusablePasswordHash(): string {
  return hashPassword(randomBytes(32).toString('hex'));
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function verifyPassword(password: string): boolean {
  const validator = getValueSync<ValidatorManager<string>>(
    'passwordValidator',
    () =>
      new ValidatorManager([
        {
          id: 'passwordLength',
          func: (password) => password.length >= 6,
          errorMessage: 'Password must be at least 6 characters'
        }
      ]),
    {},
    (value) => value instanceof ValidatorManager
  );

  const { valid, errors } = validator.validateSync(password);
  if (!valid) {
    throw new Error(`${errors.join('\n\r')}`);
  }
  return true;
}

export function addPasswordValidationRule(rule: Validator<string>): void {
  addProcessor('passwordValidator', (validatorManager) => {
    if (validatorManager instanceof ValidatorManager) {
      validatorManager.add(rule);
      return validatorManager;
    } else {
      throw new Error(
        'passwordValidator must be an instance of ValidatorManager'
      );
    }
  });
}
