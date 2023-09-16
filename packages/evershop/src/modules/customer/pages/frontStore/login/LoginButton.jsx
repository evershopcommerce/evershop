import React from 'react';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import Button from '@components/common/form/Button';

export default function LoginButton() {
  return (
    <div className="form-submit-button flex border-t border-divider mt-1 pt-1">
      <Button
        title={_('SIGN IN')}
        type="submit"
        onAction={() => {
          document.getElementById('loginForm').dispatchEvent(
            new Event('submit', {
              cancelable: true,
              bubbles: true
            })
          );
        }}
      />
    </div>
  );
}

export const layout = {
  areaId: 'loginFormInner',
  sortOrder: 50
};
