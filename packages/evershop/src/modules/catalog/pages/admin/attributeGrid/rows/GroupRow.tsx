import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import { Badge } from '@components/common/ui/Badge.js';
import { toast } from '@components/common/ui/Sonner.js';
import { TableCell } from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';

interface GroupRowProps {
  groups: Array<{
    attributeGroupId: string;
    updateApi: string;
    groupName: string;
  }>;
}
export function GroupRow({ groups }: GroupRowProps) {
  const form = useForm();
  const { openAlert, closeAlert } = useAlertContext();

  const onEdit = (group) => {
    // Returns when the save is done (or refused), so the alert's Save button
    // shows a spinner for exactly that long; on success it keeps it while the
    // page reloads.
    const save = async (data: Record<string, unknown>) => {
      try {
        const response = await fetch(group.updateApi, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.error) {
          toast.error(result.error.message);
          return;
        }
        window.location.reload();
      } catch (e) {
        toast.error(_('Something went wrong! Please try again.'));
      }
    };
    openAlert({
      heading: _('Editing ${name}', { name: group.groupName }),
      content: (
        <div>
          <Form form={form} id="groupEdit" onSubmit={save} submitBtn={false}>
            <InputField
              name="group_name"
              required
              label={_('Group Name')}
              placeholder={_('Enter group name')}
              validation={{ required: _('Group name is required') }}
              defaultValue={group.groupName}
            />
          </Form>
        </div>
      ),
      primaryAction: {
        title: _('Cancel'),
        onAction: closeAlert,
        variant: 'critical'
      },
      secondaryAction: {
        title: _('Save'),
        onAction: () => form.handleSubmit(save)(),
        variant: 'secondary'
      }
    });
  };

  return (
    <TableCell>
      {groups.map((group) => (
        <div key={group.attributeGroupId}>
          <Badge variant={'secondary'}>
            <a
              href="#"
              className="hover:underline"
              onClick={(e) => {
                e.preventDefault();
                onEdit(group);
              }}
            >
              {group.groupName}
            </a>
          </Badge>
        </div>
      ))}
    </TableCell>
  );
}
