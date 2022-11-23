import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Field } from '../../../../../lib/components/form/Field';
import { get } from '../../../../../lib/util/get';
import { Card } from '../../../../cms/components/admin/Card';

export default function SEO({ product }) {
  const fields = [
    {
      component: { default: Field },
      props: {
        id: 'urlKey', name: 'url_key', label: 'Url key', validationRules: ['notEmpty'], type: 'text'
      },
      sortOrder: 0
    },
    {
      component: { default: Field },
      props: {
        id: 'metaTitle', name: 'meta_title', label: 'Meta title', type: 'text'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'metaKeywords',
        name: 'meta_keywords',
        label: 'Meta keywords',
        type: 'text'
      },
      sortOrder: 20
    },
    {
      component: { default: Field },
      props: {
        id: 'metaDescription',
        name: 'meta_description',
        label: 'Meta description',
        options: [{ value: 0, text: 'Disabled' }, { value: 1, text: 'Enabled' }],
        type: 'textarea'
      },
      sortOrder: 30
    }
  ].filter((f) => {
    // eslint-disable-next-line no-param-reassign
    if (get(product, `${f.props.id}`) !== undefined) { f.props.value = get(product, `${f.props.id}`); }
    return f;
  });

  return (
    <Card
      title="Search engine optimize"
    >
      <Card.Session>
        <Area id="productEditSeo" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 60
}

export const query = `
  query Query {
    product(id: getContextValue('productId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`