/* eslint-disable no-param-reassign */
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Field } from '../../../../../lib/components/form/Field';
import { get } from '../../../../../lib/util/get';
import { Card } from '../../../components/admin/Card';

export default function Seo({ page }) {
  const fields = [
    {
      component: { default: Field },
      props: {
        type: 'text',
        id: 'urlKey',
        name: 'url_key',
        label: 'Url key',
        validationRules: ['notEmpty']
      },
      sortOrder: 0
    },
    {
      component: { default: Field },
      props: {
        type: 'text',
        id: 'metaTitle',
        name: 'meta_title',
        label: 'Meta title',
        placeholder: 'Meta title'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        type: 'text',
        id: 'metaKeywords',
        name: 'meta_keywords',
        label: 'Meta keywords',
        placeholder: 'Meta keywords'
      },
      sortOrder: 20
    },
    {
      component: { default: Field },
      props: {
        type: 'textarea',
        id: 'metaDescription',
        name: 'meta_description',
        label: 'Meta description'
      },
      sortOrder: 30
    }
  ].filter((f) => {
    if (get(page, `${f.props.id}`) !== undefined) { f.props.value = get(page, `${f.props.id}`); }
    return f;
  });

  return (
    <Card title="Search Engine Optimization">
      <Card.Session>
        <Area id="pageEditSeo" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 30
}

export const query = `
  query Query {
    page: cmsPage(id: getContextValue('cmsPageId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`