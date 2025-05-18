import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import Editor from '@components/common/form/fields/Editor';
import PropTypes from 'prop-types';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';


export default function General({
  page,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}) {
  const fields = [
    {
      component: { default: Field },
      props: {
        type: 'text',
        id: 'name',
        name: 'name',
        label: 'Name',
        placeholder: 'Name',
        validationRules: ['notEmpty']
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'cmsPageId',
        name: 'cms_page_id',
        type: 'hidden'
      },
      sortOrder: 10
    },
    {
      component: { default: Editor },
      props: {
        id: 'content',
        name: 'content',
        label: 'Content',
        browserApi,
        deleteApi,
        uploadApi,
        folderCreateApi
      },
      sortOrder: 30
    }
  ].map((f) => {
    if (get(page, `${f.props.id}`) !== undefined) {
      f.props.value = get(page, `${f.props.id}`);
    }
    return f;
  });

  return (
    <Card title="General">
      <Card.Session>
        <Area id="pageEditGeneral" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

General.propTypes = {
  page: PropTypes.shape({
    cmsPageId: PropTypes.number,
    name: PropTypes.string,
    content: PropTypes.arrayOf(
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
    )
  }),
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired
};

General.defaultProps = {
  page: {
    cmsPageId: null,
    name: '',
    content: ''
  }
};

export const layout = {
  areaId: 'wideScreen',
  sortOrder: 10
};

export const query = `
  query Query {
    page: cmsPage(id: getContextValue("cmsPageId", null)) {
      cmsPageId
      name
      content
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;
