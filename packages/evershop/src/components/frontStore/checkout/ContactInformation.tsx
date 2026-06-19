import Area from '@components/common/Area.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import {
  useCustomer,
  useCustomerDispatch
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CircleUser } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const LoggedIn: React.FC<{
  fullName: string;
  email: string;
  uuid: string;
}> = ({ uuid, fullName, email }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useCustomerDispatch();
  const { updateCheckoutData } = useCheckoutDispatch();

  useEffect(() => {
    updateCheckoutData({
      customer: {
        id: uuid,
        email: email,
        fullName: fullName
      }
    });
  }, [fullName, email]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logout();
      toast.success(_('Successfully logged out'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : _('Logout failed');
      toast.error(errorMessage);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Item variant={'outline'}>
      <ItemContent>
        <ItemTitle>
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-primary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-primary">
              {_('Logged in as')} {fullName}
            </span>
          </div>
        </ItemTitle>
        <ItemDescription>{email}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? _('Logging out...') : _('Logout')}
        </Button>
      </ItemActions>
    </Item>
  );
};

const Guest: React.FC<{
  email: string;
}> = ({ email }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const { login } = useCustomerDispatch();
  const { form } = useCheckout();
  const { updateCheckoutData } = useCheckoutDispatch();
  const contactEmail = form.watch('contact.email', email);
  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLogin(true);
  };

  useEffect(() => {
    updateCheckoutData({
      customer: {
        email: contactEmail
      }
    });
  }, [contactEmail]);

  const handleLogin = async () => {
    if (isLogging) return;

    try {
      setIsLogging(true);
      const isValid = await form.trigger(['contact.email', 'contact.password']);
      if (!isValid) {
        return;
      }
      const formData = form.getValues();
      const loginEmail = formData?.contact?.email;
      const password = formData?.contact?.password;
      await login(
        {
          email: loginEmail,
          password: password
        },
        window.location.href
      );
      toast.success(_('Successfully logged in'));
      setShowLogin(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : _('Login failed');
      toast.error(errorMessage);
    } finally {
      setIsLogging(false);
    }
  };

  const handleCancelLogin = () => {
    setShowLogin(false);
    // Clear password field
    form.setValue('contact.password', '');
  };

  return (
    <div>
      <EmailField
        defaultValue={email}
        name="contact.email"
        label={_('Email')}
        required
        validation={{
          required: _('Email is required')
        }}
        placeholder={_('Enter your email')}
      />

      {showLogin && (
        <div className="mt-4">
          <PasswordField
            name="contact.password"
            label={_('Password')}
            required
            validation={{
              required: _('Password is required')
            }}
            placeholder={_('Enter your password')}
          />
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleLogin}
              disabled={isLogging}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogging ? _('Logging in...') : _('Log in')}
            </Button>
            <Button variant={'outline'} onClick={handleCancelLogin}>
              {_('Cancel')}
            </Button>
          </div>
        </div>
      )}

      {!showLogin && (
        <p className="mt-2">
          {_('Already have an account?')}{' '}
          <button
            type="button"
            onClick={handleLoginClick}
            className="underline text-primary hover:cursor-pointer"
          >
            {_('Log in')}
          </button>
        </p>
      )}
    </div>
  );
};
export function ContactInformation() {
  const { customer } = useCustomer();
  const { data: cart } = useCartState();

  return (
    <>
      <Area id="checkoutContactInformationBefore" />
      <div className="checkout-contact checkout-step">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <CircleUser className="w-5 h-5" />
                <span>{_('Contact Information')}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer ? (
              <LoggedIn
                fullName={customer.fullName}
                email={customer.email}
                uuid={customer.uuid}
              />
            ) : (
              <Guest email={cart.customerEmail || ''} />
            )}
          </CardContent>
        </Card>
      </div>
      <Area id="checkoutContactInformationAfter" />
    </>
  );
}
