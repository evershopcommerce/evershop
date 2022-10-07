import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { get } from '../../../../../lib/util/get';
import { Field } from '../../../../../lib/components/form/Field';
import { TextArea } from '../../../../../lib/components/form/fields/Textarea';
import { Card } from '../../../../cms/components/admin/Card';

export default function General({
  category, browserApi, deleteApi, uploadApi, folderCreateApi
}) {
  const fields = [
    {
      component: { default: Field },
      props: {
        id: 'name',
        name: 'name',
        label: 'Name',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 10,
      id: 'name'
    },
    {
      component: { default: Field },
      props: {
        id: 'categoryId',
        name: 'category_id',
        type: 'hidden'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'status',
        type: 'radio',
        name: 'status',
        label: 'Status',
        options: [{ value: 0, text: 'Disabled' }, { value: 1, text: 'Enabled' }]
      },
      sortOrder: 30
    },
    {
      component: { default: TextArea },
      props: {
        id: 'description',
        name: 'description',
        label: 'Description',
        browserApi,
        deleteApi,
        uploadApi,
        folderCreateApi
      },
      sortOrder: 70
    }
  ].filter((f) => {
    // eslint-disable-next-line no-param-reassign
    if (get(category, `${f.props.id}`) !== undefined) { f.props.value = get(category, `${f.props.id}`); }
    return f;
  });

  return (
    <Card
      title="General"
    >
      <Card.Session>
        <Area id="categoryEditGeneral" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

General.propTypes = {
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
}

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      categoryId
      name
      description
      status
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
  }
`;