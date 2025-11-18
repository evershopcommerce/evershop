import { EmailField } from '@components/common/form/EmailField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
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
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="text-sm font-medium text-blue-800">
                {_('Logged in as')} {fullName}
              </h3>
            </div>
            <p className="text-sm text-blue-600 mt-1">{email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="ml-3 text-sm text-blue-700 hover:text-blue-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingOut ? _('Logging out...') : _('Logout')}
        </button>
      </div>
    </div>
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
      await login(loginEmail, password, window.location.href);
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
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLogging}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogging ? _('Logging in...') : _('Log in')}
            </button>
            <button
              type="button"
              onClick={handleCancelLogin}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              {_('Cancel')}
            </button>
          </div>
        </div>
      )}

      {!showLogin && (
        <p className="mt-2">
          {_('Already have an account?')}{' '}
          <button
            type="button"
            onClick={handleLoginClick}
            className="underline text-blue-600 hover:text-blue-800"
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
    <div className="checkout-contact checkout-step">
      <h1 className="checkout-step-title">{_('Contact Information')}</h1>
      {customer ? (
        <LoggedIn
          fullName={customer.fullName}
          email={customer.email}
          uuid={customer.uuid}
        />
      ) : (
        <Guest email={cart.customerEmail || ''} />
      )}
    </div>
  );
}
