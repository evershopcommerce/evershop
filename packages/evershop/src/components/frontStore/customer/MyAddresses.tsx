import { AddressSummary } from '@components/common/customer/address/AddressSummary.jsx';
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
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index.js';
import {
  ExtendedCustomerAddress,
  useCustomer,
  useCustomerDispatch
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { toast } from 'react-toastify';

const Address: React.FC<{
  address: ExtendedCustomerAddress;
}> = ({ address }) => {
  const { updateAddress, deleteAddress } = useCustomerDispatch();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const classes = address.isDefault ? 'border-2 border-primary' : '';
  return (
    <Item variant={'outline'} className={`${classes}`}>
      <ItemContent>
        <AddressSummary address={address} />
      </ItemContent>
      <ItemActions>
        <div className="flex flex-col items-start gap-1">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                {_('Edit')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{_('Edit Address')}</DialogTitle>
              </DialogHeader>
              <Form
                id="customerAddressForm"
                method="PATCH"
                onSubmit={async (data) => {
                  try {
                    await updateAddress(address.uuid as string, data);
                    setDialogOpen(false);
                    toast.success(_('Address has been updated successfully!'));
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : String(error)
                    );
                  }
                }}
              >
                <CustomerAddressForm
                  address={address}
                  fieldNamePrefix=""
                  countryScope="all"
                />
                <div className="mt-3">
                  <CheckboxField
                    label={_('Set as default')}
                    defaultChecked={address.isDefault}
                    defaultValue={address.isDefault}
                    name="is_default"
                  />
                </div>
              </Form>
            </DialogContent>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await deleteAddress(address.uuid as string);
                    toast.success(_('Address has been deleted successfully!'));
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
  if (!customer) {
    return null;
  }
  return (
    <div>
      {title && (
        <div className="border-b mb-5 border-gray-200">
          <h2>{_('Address Book')}</h2>
        </div>
      )}
      {customer.addresses.length === 0 && (
        <div className="order-history-empty">
          {_('You have no addresses saved')}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-3">
        {customer.addresses.map((address) => (
          <Address key={address.uuid} address={address} />
        ))}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            {_('Add new address')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{_('Add new address')}</DialogTitle>
          </DialogHeader>
          <Form
            id="customerAddressForm"
            method={'POST'}
            onSubmit={async (data) => {
              try {
                await addAddress(data as ExtendedCustomerAddress);
                setDialogOpen(false);
                toast.success(_('Address has been saved successfully!'));
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : String(error)
                );
              }
            }}
          >
            <CustomerAddressForm
              address={undefined}
              fieldNamePrefix=""
              countryScope="all"
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
