import Area from '@components/common/Area.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import {
  useCustomer,
  useCustomerDispatch
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Mail, Pencil, User } from 'lucide-react';
import React from 'react';
import { toast } from 'react-toastify';

interface AccountInfoProps {
  title?: string;
  showLogout?: boolean;
}
export default function AccountInfo({ title, showLogout }: AccountInfoProps) {
  const { customer: account } = useCustomer();
  const { logout, updateProfile } = useCustomerDispatch();
  const [isEditing, setIsEditing] = React.useState(false);
  return (
    <div className="account__details divide-y">
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
      {isEditing ? (
        <div className="account__details__form py-5">
          <Form
            id="accountInfoForm"
            submitBtnText={_('Save')}
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
          </Form>
          <div className="mt-3">
            <a
              className="text-interactive"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsEditing(false);
              }}
            >
              {_('Cancel')}
            </a>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start gap-2 py-5">
          <div className="grid grid-cols-1 gap-2 grow">
            <Area
              id="accountDetails"
              coreComponents={[
                {
                  component: {
                    default: (
                      <div className="account__details__name flex gap-2 py-2">
                        <div>
                          <User width={20} height={20} />
                        </div>
                        <div>{account?.fullName}</div>
                      </div>
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => (
                      <div className="account__details__email flex gap-2 py-2">
                        <div>
                          <Mail width={20} height={20} />
                        </div>
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
            className="text-interactive flex items-center gap-1"
            onClick={() => setIsEditing(true)}
          >
            <Pencil width={16} height={16} />
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
