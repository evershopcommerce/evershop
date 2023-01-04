import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import Area from '../../../../../lib/components/Area';
import { Form } from '../../../../../lib/components/form/Form';
import { get } from '../../../../../lib/util/get';

export default function CmsPageEditForm({
  action, gridUrl
}) {
  const id = "cmsPageForm";
  return (
    <Form
      method={'PATCH'}
      action={action}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      onSuccess={(response) => {
        if (response.error) {
          toast.error(get(response, 'error.message', 'Something wrong. Please reload the page!'));
        } else {
          toast.success('Page saved successfully!');
        }
      }}
      submitBtn={false}
      id={id}
    >
      <Area id={id} noOuter={true} />
    </Form>
  );
}

CmsPageEditForm.propTypes = {
  action: PropTypes.string.isRequired,
  gridUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    action: url(routeId: "updateCmsPage", params: [{key: "id", value: getContextValue("cmsPageUuid")}]),
    gridUrl: url(routeId: "cmsPageGrid")
  }
`;