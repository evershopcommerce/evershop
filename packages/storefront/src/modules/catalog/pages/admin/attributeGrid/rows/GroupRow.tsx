import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

interface GroupRowProps {
  groups: Array<{
    attributeGroupId: string;
    updateApi: string;
    groupName: string;
  }>;
}
export function GroupRow({ groups }: GroupRowProps) {
  const form = useForm();
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();

  const onEdit = (group) => {
    openAlert({
      heading: `Editing ${group.groupName}`,
      content: (
        <div>
          <Form
            form={form}
            id="groupEdit"
            method="PATCH"
            action={group.updateApi}
            submitBtn={false}
            onSuccess={(response) => {
              if (response.error) {
                toast.error(response.error.message);
              } else {
                window.location.reload();
              }
            }}
          >
            <InputField
              name="group_name"
              required
              label="Group Name"
              placeholder="Enter group name"
              validation={{ required: 'Group name is required' }}
              defaultValue={group.groupName}
            />
          </Form>
        </div>
      ),
      primaryAction: {
        title: 'Cancel',
        onAction: closeAlert,
        variant: 'critical'
      },
      secondaryAction: {
        title: 'Save',
        onAction: () => {
          dispatchAlert({
            type: 'update',
            payload: {
              secondaryAction: { isLoading: form.formState.isSubmitting }
            }
          });
          (
            document.getElementById('groupEdit') as HTMLFormElement
          ).dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true })
          );
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
          <div key={group.attributeGroupId}>
            <a
              href="#"
              className="text-interactive hover:underline"
              onClick={(e) => {
                e.preventDefault();
                onEdit(group);
              }}
            >
              {group.groupName}
            </a>
          </div>
        ))}
      </div>
    </td>
  );
}
