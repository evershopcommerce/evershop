import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface ProvinceAndPostcodeProps {
  provinces: {
    value: string;
    label: string;
  }[];
  province?: {
    code: string;
  };
  postcode?: string;
  getFieldName?: (fieldName: string) => string;
}
export function ProvinceAndPostcode({
  provinces,
  province,
  postcode,
  getFieldName
}: ProvinceAndPostcodeProps) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      <div>
        <SelectField
          defaultValue={province?.code}
          name={getFieldName ? getFieldName('province') : 'address.province'}
          label={_('Province')}
          placeholder={_('Province')}
          required
          validation={{
            required: _('Province is required')
          }}
          options={provinces}
        />
      </div>
      <div>
        <InputField
          name={getFieldName ? getFieldName('postcode') : 'postcode'}
          defaultValue={postcode}
          label={_('Postcode')}
          placeholder={_('Postcode')}
          required
          validation={{
            required: _('Postcode is required')
          }}
        />
      </div>
    </div>
  );
}
