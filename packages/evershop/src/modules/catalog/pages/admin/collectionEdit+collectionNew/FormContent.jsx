import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import Button from '@components/common/form/Button';
import { useFormContext } from '@components/common/form/Form';
import './FormContent.scss';

export default function FormContent({ gridUrl }) {
  const { state } = useFormContext();
  return (
    <div className="w-2/3" style={{ margin: '0 auto' }}>
      <div className="grid gap-8">
        <Area id="collectionFormInner" noOuter />
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
              .getElementById('collectionForm')
              .dispatchEvent(
                new Event('submit', { cancelable: true, bubbles: true })
              );
          }}
          isLoading={state === 'submitting'}
        />
      </div>
    </div>
  );
}

FormContent.propTypes = {
  gridUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'collectionForm',
  sortOrder: 10
};

export const query = `
  query Query {
    gridUrl: url(routeId: "collectionGrid")
  }
`;
