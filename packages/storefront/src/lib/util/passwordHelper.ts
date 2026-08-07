import bcrypt from 'bcryptjs';
import { addProcessor, getValueSync } from './registry.js';
import { Validator, ValidatorManager } from './validator.js';

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
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
