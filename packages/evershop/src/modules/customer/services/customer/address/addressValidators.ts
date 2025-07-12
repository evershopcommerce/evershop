import {
  addProcessor,
  getValueSync
} from '../../../../../lib/util/registry.js';
import {
  Validator,
  ValidatorManager
} from '../../../../../lib/util/validator.js';

export type Address = {
  uuid?: string;
  customer_id?: number;
  full_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  country?: string;
  postcode?: string;
  telephone?: string | number;
  is_default?: number | string;
};

const initialValidators: Validator<Address>[] = [
  {
    id: 'fullNameNotEmpty',
    /**
     *
     * @param {Address} address
     * @returns {boolean}
     */
    func: (address: Address) => {
      if (!address.full_name || address.full_name.trim() === '') {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Full name is required'
  },
  {
    id: 'address1NotEmpty',
    /**
     *
     * @param {Address} address
     * @returns {boolean}
     */
    func: (address: Address) => {
      if (!address.address_1 || address.address_1.trim() === '') {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Address is required'
  },
  {
    id: 'provinceNotEmpty',
    /**
     *
     * @param {Address} address
     * @returns {boolean}
     */
    func: (address: Address) => {
      if (!address.province || address.province.trim() === '') {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Province is required'
  },
  {
    id: 'countryNotEmpty',
    /**
     *
     * @param {Address} address
     * @returns {boolean}
     */
    func: (address: Address) => {
      if (!address.country || address.country.trim() === '') {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Country is required'
  },
  {
    id: 'postcodeNotEmpty',
    /**
     *
     * @param {Address} address
     * @returns {boolean}
     */
    func: (address: Address) => {
      if (!address.postcode || address.postcode.trim() === '') {
        return false;
      } else {
        return true;
      }
    },
    errorMessage: 'Postcode is required'
  }
];

export function validateAddress(address: Address): {
  valid: boolean;
  errors: string[];
} {
  const validator = getValueSync<ValidatorManager<Address>>(
    'addressValidator',
    () => new ValidatorManager(initialValidators),
    {},
    (value) => value instanceof ValidatorManager
  );
  return validator.validateSync(address);
}

export function addAddressValidationRule(rule: Validator<Address>): void {
  addProcessor('addressValidator', (validatorManager) => {
    if (validatorManager instanceof ValidatorManager) {
      validatorManager.add(rule);
      return validatorManager;
    } else {
      throw new Error(
        'addressValidator must be an instance of ValidatorManager'
      );
    }
  });
}
