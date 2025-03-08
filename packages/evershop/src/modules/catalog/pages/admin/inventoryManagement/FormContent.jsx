import React from 'react';
import Area from '@components/common/Area';
import Button from '@components/common/form/Button';
import { useFormContext } from '@components/common/form/Form';
import './FormContent.scss';
import { toast } from 'react-toastify';

export default function FormContent() {
  const { state } = useFormContext();
  return (
    <>
      <div className="grid grid-cols-3 gap-x-8 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-8 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-8 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <div className="form-submit-button flex border-t border-divider mt-6 pt-6 justify-between">
        <Button
          title="Cancel"
          variant="critical"
          outline
          onAction={() => {
            window.history.back();
          }}
        />
        <Button
          title="Save"
          onAction={() => {
            const fileInput = document.getElementById("categoryImageUpload");

            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
              toast.error("Please upload a account file before submitting.");
              return;
            }

            document
              .getElementById('inventoryForm')
              .dispatchEvent(
                new Event('submit', { cancelable: true, bubbles: true })
              );
          }}
          isLoading={state === 'submitting'}
        />
      </div>
    </>
  );
}

export const layout = {
  areaId: 'inventoryForm',
  sortOrder: 10
};