import React from 'react';
import { Field } from '../../../../../../lib/components/form/Field';
import { Form } from '../../../../../../lib/components/form/Form';
import { useAlertContext } from '../../../../../../lib/components/modal/Alert';
import { useAppState } from '../../../../../../lib/context/app';

export default function GroupRow({ id, areaProps }) {
  const groups = areaProps.row[id];
  const context = useAppState();
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();

  const onEdit = (group) => {
    openAlert({
      heading: `Editing ${group.group_name}`,
      content: <div>
        <Form
          id="group-edit"
          method="POST"
          action={context.saveAttributeGroupUrl}
          submitBtn={false}
          onSuccess={() => {
            window.location.href = context.currentUrl;
          }}
        >
          <Field
            formId="group-edit"
            type="text"
            name="group_name"
            value={group.group_name}
          />
          <Field
            formId="group-edit"
            type="hidden"
            name="group_id"
            value={group.attribute_group_id}
          />
        </Form>
      </div>,
      primaryAction: {
        title: 'Cancel',
        onAction: closeAlert,
        variant: 'critical'

      },
      secondaryAction: {
        title: 'Save',
        onAction: () => {
          dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } });
          document.getElementById('group-edit').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        },
        variant: 'primary',
        isLoading: false
      }
    });
  };

  return (
    <td>
      <div className="">
        {groups.map((group) => (
          <div key={group.attribute_group_id}>
            <a
              href="#"
              className="text-interactive hover:underline"
              onClick={(e) => {
                e.preventDefault();
                onEdit(group);
              }}
            >
              {group.group_name}
            </a>
          </div>
        ))}
      </div>
    </td>
  );
}
