import Area from '@components/common/Area.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { Button } from '@components/common/ui/Button.js';
import { toast } from '@components/common/ui/Sonner.js';
import {
  useCustomer,
  useCustomerDispatch
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Mail, Pencil, User } from 'lucide-react';
import React from 'react';

interface AccountInfoProps {
  title?: string;
  showLogout?: boolean;
}

/**
 * Save + Cancel on one row, inside the <Form> so the submit button drives the
 * form's own onSubmit. Reads `isSubmitting` from the form context to keep the
 * Save spinner. Cancel uses the destructive variant.
 */
function AccountInfoActions({ onCancel }: { onCancel: () => void }) {
  const {
    formState: { isSubmitting }
  } = useFormContext();
  return (
    <div className="mt-4 flex items-center gap-3">
      <Button type="submit" isLoading={isSubmitting}>
        {_('Save')}
      </Button>
      <Button type="button" variant="destructive" onClick={onCancel}>
        {_('Cancel')}
      </Button>
    </div>
  );
}
export default function AccountInfo({ title, showLogout }: AccountInfoProps) {
  const { customer: account } = useCustomer();
  const { logout, updateProfile } = useCustomerDispatch();
  const [isEditing, setIsEditing] = React.useState(false);
  return (
    <div className="account__details divide-y">
      {(title || showLogout) && (
        <div className="flex justify-between items-center border-border">
          {title && <h2>{title}</h2>}
          {showLogout && (
            <a
              className="text-interactive"
              href="#"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await logout();
                  window.location.href = '/';
                } catch (error) {
                  toast.error(error.message);
                }
              }}
            >
              {_('Logout')}
            </a>
          )}
        </div>
      )}
      {isEditing ? (
        <div className="account__details__form py-5">
          <Form
            id="accountInfoForm"
            submitBtn={false}
            onSubmit={async (data) => {
              try {
                await updateProfile({
                  full_name: data.full_name,
                  email: data.email
                });
                toast.success(_('Your profile has been updated'));
                setIsEditing(false);
              } catch (error) {
                toast.error(error.message);
              }
            }}
          >
            <div className="space-y-3">
              <InputField
                prefixIcon={<User className="h-5 w-5" />}
                name="full_name"
                label={_('Full Name')}
                defaultValue={account?.fullName || ''}
                required
                validation={{ required: _('Full Name is required') }}
              />
              <EmailField
                prefixIcon={<Mail className="h-5 w-5" />}
                name="email"
                label={_('Email')}
                defaultValue={account?.email || ''}
                required
                validation={{ required: _('Email is required') }}
              />
            </div>
            <AccountInfoActions onCancel={() => setIsEditing(false)} />
          </Form>
        </div>
      ) : (
        <div className="flex justify-between items-start gap-2">
          <div className="grid grid-cols-1 gap-2 grow text-sm">
            <Area
              id="accountDetails"
              coreComponents={[
                {
                  component: {
                    default: (
                      <div className="account__details__name flex items-center gap-2">
                        <User
                          width={16}
                          height={16}
                          className="text-muted-foreground"
                        />
                        <div>{account?.fullName}</div>
                      </div>
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => (
                      <div className="account__details__email flex items-center gap-2">
                        <Mail
                          width={16}
                          height={16}
                          className="text-muted-foreground"
                        />
                        <div>{account?.email}</div>
                      </div>
                    )
                  },
                  sortOrder: 15
                }
              ]}
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setIsEditing(true)}
          >
            <Pencil width={14} height={14} />
            {_('Edit')}
          </button>
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
