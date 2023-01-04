import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import Area from '../../../../../lib/components/Area';
import { Form } from '../../../../../lib/components/form/Form';
import { get } from '../../../../../lib/util/get';

export default function CategoryNewForm({
  action
}) {
  const id = "categoryForm";
  return (
    <Form
      method={'POST'}
      action={action}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      onSuccess={(response) => {
        if (response.error) {
          toast.error(get(response, 'error.message', 'Something wrong. Please reload the page!'));
        } else {
          toast.success('Category saved successfully!');
          // Wait for 2 seconds to show the success message
          setTimeout(() => {
            // Redirect to the edit page
            const editUrl = response.data.links.find(link => link.rel === 'edit').href;
            window.location.href = editUrl;
          }, 1500);
        }
      }}
      submitBtn={false}
      id={id}
    >
      <Area id='categoryForm' noOuter={true} />
    </Form>
  );
}

CategoryNewForm.propTypes = {
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
    action: url(routeId: "createCategory")
    gridUrl: url(routeId: "categoryGrid")
  }
`;