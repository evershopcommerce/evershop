import { AddressSummary } from '@components/common/customer/address/AddressSummary.js';
import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { Form } from '@components/common/form/Form.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { Item, ItemActions, ItemContent } from '@components/common/ui/Item.js';
import { toast } from '@components/common/ui/Sonner.js';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index.js';
import { serverAddressErrors } from '@components/frontStore/customer/address/addressFormLogic.js';
import {
  ExtendedCustomerAddress,
  useCustomer,
  useCustomerDispatch
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';

const Address: React.FC<{
  address: ExtendedCustomerAddress;
}> = ({ address }) => {
  const { updateAddress, deleteAddress } = useCustomerDispatch();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  // Own form instance so field-targeted server errors can be set on the inputs.
  const form = useForm({ shouldUnregister: true, shouldFocusError: false });
  const classes = address.isDefault ? 'border-2 border-primary' : '';
  return (
    <Item variant={'outline'} className={`${classes}`}>
      <ItemContent>
        <AddressSummary address={address} />
      </ItemContent>
      <ItemActions>
        <div className="flex flex-col items-start gap-1">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {/* `render` makes the Button THE trigger. A Button as a child would
                nest <button> in <button>, which browsers un-nest while parsing the
                server HTML, so every /account load failed hydration (React #418). */}
            <DialogTrigger
              render={<Button variant="outline">{_('Edit')}</Button>}
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{_('Edit Address')}</DialogTitle>
              </DialogHeader>
              <Form
                id="customerAddressForm"
                method="PATCH"
                form={form}
                onSubmit={async (data) => {
                  try {
                    await updateAddress(address.uuid as string, data);
                    setDialogOpen(false);
                    toast.success(_('Address has been updated successfully!'));
                  } catch (error) {
                    const { applied } = serverAddressErrors(
                      error,
                      '',
                      (name, err) => form.setError(name, err)
                    );
                    toast.error(
                      applied > 0
                        ? _('Please check the highlighted fields')
                        : error instanceof Error
                        ? error.message
                        : String(error)
                    );
                  }
                }}
              >
                <CustomerAddressForm
                  address={address}
                  surface="account"
                  namePrefix=""
                />
                <div className="mt-3">
                  <CheckboxField
                    label={_('Set as default')}
                    defaultChecked={!!address.isDefault}
                    defaultValue={!!address.isDefault}
                    name="is_default"
                  />
                </div>
              </Form>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await deleteAddress(address.uuid as string);
                      toast.success(
                        _('Address has been deleted successfully!')
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : String(error)
                      );
                    }
                  }}
                >
                  {_('Delete')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ItemActions>
    </Item>
  );
};

export function MyAddresses({ title }: { title?: string }) {
  const { customer } = useCustomer();
  const { addAddress } = useCustomerDispatch();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const form = useForm({ shouldUnregister: true, shouldFocusError: false });
  if (!customer) {
    return null;
  }
  return (
    <div>
      {title && (
        <div className="border-b mb-5 border-border">
          <h2>{_('Address Book')}</h2>
        </div>
      )}
      {customer.addresses.length === 0 && (
        <div className="text-sm text-muted-foreground">
          {_('You have no addresses saved')}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {customer.addresses.map((address) => (
          <Address key={address.uuid} address={address} />
        ))}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger
          render={
            <Button variant="outline" className="mt-4">
              {_('Add new address')}
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{_('Add new address')}</DialogTitle>
          </DialogHeader>
          <Form
            id="customerAddressForm"
            method={'POST'}
            form={form}
            onSubmit={async (data) => {
              try {
                await addAddress(data as ExtendedCustomerAddress);
                setDialogOpen(false);
                toast.success(_('Address has been saved successfully!'));
              } catch (error) {
                const { applied } = serverAddressErrors(
                  error,
                  '',
                  (name, err) => form.setError(name, err)
                );
                toast.error(
                  applied > 0
                    ? _('Please check the highlighted fields')
                    : error instanceof Error
                    ? error.message
                    : String(error)
                );
              }
            }}
          >
            <CustomerAddressForm
              address={undefined}
              surface="account"
              namePrefix=""
            />
            <div className="mt-3">
              <CheckboxField
                label={_('Set as default')}
                defaultChecked={false}
                name="is_default"
              />
            </div>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
