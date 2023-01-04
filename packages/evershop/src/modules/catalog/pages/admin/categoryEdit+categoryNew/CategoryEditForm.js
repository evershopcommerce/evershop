import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import Area from '../../../../../lib/components/Area';
import Button from '../../../../../lib/components/form/Button';
import { Form } from '../../../../../lib/components/form/Form';
import { get } from '../../../../../lib/util/get';

export default function CategoryEditForm({
  category, createAction, updateAction, gridUrl
}) {
  const id = "categoryEditForm";
  return (
    <Form
      method={category?.categoryId ? 'PATCH' : 'POST'}
      action={category?.categoryId ? updateAction : createAction}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      onSuccess={(response) => {
        if (response.error) {
          toast.error(get(response, 'error.message', 'Something wrong. Please reload the page!'));
        } else {
          toast.success('Category saved successfully!');
        }
      }}
      submitBtn={false}
      id={id}
    >
      <div className="grid grid-cols-3 gap-x-2 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-2 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-2 auto-rows-max">
          <Area id="rightSide" noOuter />
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

CategoryEditForm.propTypes = {
  category: PropTypes.shape({
    categoryId: PropTypes.string
  }),
  updateAction: PropTypes.string.isRequired,
  createAction: PropTypes.string.isRequired,
  gridUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      categoryId
    }
    createAction: url(routeId: "createCategory")
    updateAction: url(routeId: "updateCategory", params: [{key: "id", value: getContextValue("categoryUuid")}])
    gridUrl: url(routeId: "categoryGrid")
  }
`;