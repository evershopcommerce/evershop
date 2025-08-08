import { InputField } from '@components/common/form/InputField.js';
import { TelField } from '@components/common/form/TelField.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

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
          value={fullName}
          label={_('Full name')}
          placeholder={_('Full name')}
          required
          validation={{
            required: _(`'Full name is required`)
          }}
        />
      </div>
      <div>
        <TelField
          name={getFieldName ? getFieldName('telephone') : 'telephone'}
          value={telephone}
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
