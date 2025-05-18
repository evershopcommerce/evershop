import Area from '@components/common/Area';
import Button from '@components/common/form/Button';
import { useFormContext } from '@components/common/form/Form';
import PropTypes from 'prop-types';
import React from 'react';
import './FormContent.scss';

export default function FormContent({ gridUrl }) {
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
            window.location = gridUrl;
          }}
        />
        <Button
          title="Save"
          onAction={() => {
            document
              .getElementById('attributeForm')
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

FormContent.propTypes = {
  gridUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'attributeForm',
  sortOrder: 10
};

export const query = `
  query Query {
    gridUrl: url(routeId: "attributeGrid")
  }
`;
