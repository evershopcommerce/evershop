import { InputField } from '@components/common/form/InputField.js';
import { TelField } from '@components/common/form/TelField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NameAndTelephoneProps {
  fullName?: string;
  telephone?: string;
  getFieldName?: (fieldName: string) => string;
}
export function NameAndTelephone({
  fullName,
  telephone,
  getFieldName
}: NameAndTelephoneProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <InputField
          name={getFieldName ? getFieldName('full_name') : 'full_name'}
          defaultValue={fullName}
          label={_('Full name')}
          placeholder={_('Full name')}
          required
          validation={{
            required: _('Full name is required')
          }}
        />
      </div>
      <div>
        <TelField
          name={getFieldName ? getFieldName('telephone') : 'telephone'}
          defaultValue={telephone}
          label={_('Telephone')}
          placeholder={_('Telephone')}
          required
          validation={{
            required: _('Telephone is required')
          }}
        />
      </div>
    </div>
  );
}
