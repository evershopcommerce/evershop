import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import { get } from '@evershop/evershop/src/lib/util/get';
import { Field } from '@components/common/form/Field';
import { Card } from '@components/admin/cms/Card';
import CkeditorField from '@components/common/form/fields/Ckeditor';

export default function General({
  category,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
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
      component: { default: CkeditorField },
      props: {
        id: 'description',
        name: 'description',
        label: 'Description',
        browserApi,
        deleteApi,
        uploadApi,
        folderCreateApi
      },
      sortOrder: 30
    }
  ].filter((f) => {
    // eslint-disable-next-line no-param-reassign
    if (get(category, `${f.props.id}`) !== undefined) {
      f.props.value = get(category, `${f.props.id}`);
    }
    return f;
  });

  return (
    <Card title="General">
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
  uploadApi: PropTypes.string.isRequired,
  category: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    categoryId: PropTypes.number
  })
};

General.defaultProps = {
  category: {}
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

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
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;
