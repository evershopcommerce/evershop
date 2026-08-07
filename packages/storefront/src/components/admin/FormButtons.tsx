import Button from '@components/common/Button.js';
import React from 'react';
import { useFormContext } from 'react-hook-form';

const FormButtons: React.FC<{
  formId: string;
  cancelUrl: string;
}> = ({ cancelUrl, formId }) => {
  const {
    formState: { isSubmitting }
  } = useFormContext();

  return (
    <div className="form-submit-button flex border-t border-divider mt-4 pt-4 justify-between">
      <Button
        title="Cancel"
        variant="danger"
        outline
        onAction={() => {
          window.location.href = cancelUrl;
        }}
      />
      <Button
        title="Save"
        onAction={() => {
          (document.getElementById(formId) as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true })
          );
        }}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export { FormButtons };
