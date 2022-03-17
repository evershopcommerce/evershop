import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../../lib/components/Area';
import Button from '../../../../../../lib/components/form/Button';
import { Form } from '../../../../../../lib/components/form/Form';
import { getComponents } from '../../../../../../lib/components/getComponents';

export default function CMSPageEditForm({
  method, action, gridUrl, id
}) {
  return (
    <Form
      method={method}
      action={action}
      submitBtn={false}
      id="cmsPageEdit"
    >
      <div className="grid grid-cols-3 gap-x-2 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-2 auto-rows-max">
          <Area id="leftSide" noOuter components={getComponents()} />
        </div>

        <div className="col-span-1 grid grid-cols-1 gap-2 auto-rows-max">
          <Area id="rightSide" noOuter components={getComponents()} />
        </div>
      </div>
      <div className="form-submit-button flex border-t border-divider mt-15 pt-15 justify-between">
        <Button
          title="Cancel"
          variant="critical"
          outline
          onAction={
            () => {
              window.location = gridUrl;
            }
          }
        />
        <Button
          title="Save"
          onAction={
            () => { document.getElementById(id).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
          }
        />
      </div>
    </Form>
  );
}

CMSPageEditForm.propTypes = {
  action: PropTypes.string.isRequired,
  gridUrl: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired
};
