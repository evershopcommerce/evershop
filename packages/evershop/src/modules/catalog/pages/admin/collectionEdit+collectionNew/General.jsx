import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import Editor from '@components/common/form/fields/Editor';
import PropTypes from 'prop-types';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';


export default function General({
  collection,
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
        placeholder: 'Featured Products',
        type: 'text'
      },
      sortOrder: 10,
      id: 'name'
    },
    {
      component: { default: Field },
      props: {
        id: 'code',
        name: 'code',
        label: 'Unique ID',
        validationRules: ['notEmpty'],
        placeholder: 'featuredProducts',
        type: 'text'
      },
      sortOrder: 15,
      id: 'code'
    },
    {
      component: { default: Field },
      props: {
        id: 'collectionId',
        name: 'collection_id',
        type: 'hidden'
      },
      sortOrder: 10
    },
    {
      component: { default: Editor },
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
  ].map((f) => {
    if (get(collection, `${f.props.id}`) !== undefined) {
      f.props.value = get(collection, `${f.props.id}`);
    }
    return f;
  });

  return (
    <Card title="General">
      <Card.Session>
        <Area id="collectionEditGeneral" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

General.propTypes = {
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired,
  collection: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        size: PropTypes.number.isRequired,
        columns: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            size: PropTypes.number.isRequired,

            data: PropTypes.object.isRequired
          })
        )
      })
    ),
    collectionId: PropTypes.number
  })
};

General.defaultProps = {
  collection: {}
};

export const layout = {
  areaId: 'collectionFormInner',
  sortOrder: 10
};

export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      collectionId
      name
      code
      description
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;
