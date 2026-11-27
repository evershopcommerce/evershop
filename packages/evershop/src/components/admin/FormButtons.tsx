import { useFormSubmitting } from '@components/common/form/Form.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

const FormButtons: React.FC<{
  formId: string;
  cancelUrl: string;
}> = ({ cancelUrl, formId }) => {
  const isSubmitting = useFormSubmitting();

  return (
    <div className="form-submit-button flex border-t border-border mt-4 pt-4 justify-between">
      <Button
        variant="destructive"
        onClick={() => {
          window.location.href = cancelUrl;
        }}
      >
        {_('Cancel')}
      </Button>
      <Button
        onClick={() => {
          (document.getElementById(formId) as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true })
          );
        }}
        isLoading={isSubmitting}
      >
        {_('Save')}
      </Button>
    </div>
  );
};

export { FormButtons };
