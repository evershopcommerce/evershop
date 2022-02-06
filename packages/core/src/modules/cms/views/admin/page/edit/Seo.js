import React from 'react';
import Area from '../../../../../../lib/components/Area';
import { useAppState } from '../../../../../../lib/context/app';
import { Field } from '../../../../../../lib/components/form/Field';
import { get } from '../../../../../../lib/util/get';
import { Card } from '../../Card';

export default function General(props) {
  const context = useAppState();
  const fields = [
    {
      component: { default: Field },
      props: {
        type: 'text',
        id: 'url_key',
        name: 'url_key',
        label: 'Url key',
        validationRules: ['notEmpty']
      },
      sortOrder: 0,
      id: 'url_key'
    },
    {
      component: { default: Field },
      props: {
        type: 'text',
        id: 'meta_title',
        name: 'meta_title',
        label: 'Meta title',
        placeholder: 'Meta title'
      },
      sortOrder: 10,
      id: 'meta_title'
    },
    {
      component: { default: Field },
      props: {
        type: 'text',
        id: 'meta_keywords',
        name: 'meta_keywords',
        label: 'Meta keywords',
        placeholder: 'Meta keywords'
      },
      sortOrder: 20,
      id: 'meta_keywords'
    },
    {
      component: { default: Field },
      props: {
        type: 'textarea',
        id: 'meta_description',
        name: 'meta_description',
        label: 'Meta description'
      },
      sortOrder: 30,
      id: 'meta_description'
    }
  ].filter((f) => {
    if (get(context, `page.${f.props.name}`) !== undefined) { f.props.value = get(context, `page.${f.props.name}`); }
    return f;
  });

  return (
    <Card title="Search engine optimization">
      <Card.Session>
        <Area id="page-edit-seo" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}
