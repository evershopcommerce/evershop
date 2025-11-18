import Area from '@components/common/Area.js';
import { useAppState } from '@components/common/context/app.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import { CouponForm } from '@components/frontStore/CouponForm.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

const SkeletonValue: React.FC<{
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}> = ({ children, loading = false, className = '' }) => {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <span className={`relative ${className}`}>
      <span className="opacity-0">{children}</span>
      <span className="absolute inset-0 bg-gray-200 rounded animate-pulse" />
    </span>
  );
};

const Total: React.FC<{
  total: string;
  totalTaxAmount: string;
  priceIncludingTax: boolean;
  loading?: boolean;
}> = ({ total, totalTaxAmount, priceIncludingTax, loading = false }) => {
  return (
    <div className="summary__row grand-total flex justify-between py-2">
      {(priceIncludingTax && (
        <div>
          <div className="font-bold">
            <span>{_('Total')}</span>
          </div>
          <div>
            <span className="italic font-normal">
              ({_('Inclusive of tax ${totalTaxAmount}', { totalTaxAmount })})
            </span>
          </div>
        </div>
      )) || <span className="self-center font-bold">{_('Total')}</span>}
      <div>
        <div />
        <SkeletonValue loading={loading} className="grand-total-value">
          {total}
        </SkeletonValue>
      </div>
    </div>
  );
};

const Tax: React.FC<{
  showPriceIncludingTax: boolean;
  amount: string;
  loading?: boolean;
}> = ({ showPriceIncludingTax, amount, loading = false }) => {
  if (showPriceIncludingTax) {
    return null;
  }

  return (
    <div className="summary-row flex justify-between py-2">
      <span>{_('Tax')}</span>
      <div>
        <div />
        <SkeletonValue loading={loading} className="text-right">
          {amount}
        </SkeletonValue>
      </div>
    </div>
  );
};

const Subtotal: React.FC<{ subTotal: string; loading?: boolean }> = ({
  subTotal,
  loading = false
}) => {
  return (
    <div className="flex justify-between gap-7 py-2">
      <div>{_('Sub total')}</div>
      <SkeletonValue loading={loading} className="text-right">
        {subTotal}
      </SkeletonValue>
    </div>
  );
};

const Discount: React.FC<{
  discountAmount: string;
  coupon: string | undefined;
  loading?: boolean;
}> = ({ discountAmount, coupon, loading = false }) => {
  if (!coupon) {
    return (
      <div className="gap-7 py-2">
        <CouponForm />
      </div>
    );
  }

  return (
    <div className="flex justify-between gap-7 py-2">
      <div>{_('Discount(${coupon})', { coupon })}</div>
      <SkeletonValue loading={loading} className="text-right">
        {discountAmount}
      </SkeletonValue>
    </div>
  );
};

const Shipping: React.FC<{
  method: string | undefined;
  cost: string | undefined;
  loading?: boolean;
}> = ({ method, cost, loading = false }) => {
  return (
    <div className="summary-row flex justify-between gap-7 py-2">
      {method && (
        <>
          <span>{_('Shipping (${method})', { method })}</span>
          <div>
            <SkeletonValue loading={loading}>{cost}</SkeletonValue>
          </div>
        </>
      )}
      {!method && (
        <>
          <span>{_('Shipping')}</span>
          <span className="text-gray-500 italic font-normal">
            {_('Select shipping method')}
          </span>
        </>
      )}
    </div>
  );
};

const DefaultCartSummary: React.FC<{
  loading: boolean;
  showPriceIncludingTax: boolean;
  subTotal: string;
  discountAmount: string;
  coupon: string | undefined;
  shippingMethod: string | undefined;
  shippingCost: string | undefined;
  taxAmount: string;
  total: string;
}> = ({
  loading,
  showPriceIncludingTax,
  subTotal,
  discountAmount,
  coupon,
  shippingMethod,
  shippingCost,
  taxAmount,
  total
}) => (
  <div className="cart__total__summary font-semibold">
    <Area id="cartSummaryBeforeSubTotal" noOuter />
    <Subtotal subTotal={subTotal} loading={loading} />
    <Area id="cartSummaryAfterSubTotal" noOuter />
    <Area id="cartSummaryBeforeDiscount" noOuter />
    <Discount
      discountAmount={discountAmount}
      coupon={coupon}
      loading={loading}
    />
    <Area id="cartSummaryAfterDiscount" noOuter />
    <Area id="cartSummaryBeforeShipping" noOuter />
    <Shipping method={shippingMethod} cost={shippingCost} loading={loading} />
    <Area id="cartSummaryAfterShipping" noOuter />
    <Area id="cartSummaryBeforeTax" noOuter />
    <Tax
      amount={taxAmount}
      showPriceIncludingTax={showPriceIncludingTax}
      loading={loading}
    />
    <Area id="cartSummaryAfterTax" noOuter />
    <Area id="cartSummaryBeforeTotal" noOuter />
    <Total
      total={total}
      totalTaxAmount={taxAmount}
      priceIncludingTax={showPriceIncludingTax}
      loading={loading}
    />
    <Area id="cartSummaryAfterTotal" noOuter />
  </div>
);

interface CartTotalSummaryProps {
  children?: (props: {
    loading: boolean;
    showPriceIncludingTax: boolean;
    subTotal: string;
    discountAmount: string;
    coupon: string | undefined;
    shippingMethod: string | undefined;
    shippingCost: string | undefined;
    taxAmount: string;
    total: string;
  }) => React.ReactNode;
}

function CartTotalSummary({ children }: CartTotalSummaryProps) {
  const { data: cart, loadingStates } = useCartState();
  const {
    config: {
      tax: { priceIncludingTax }
    }
  } = useAppState();

  const subTotal = priceIncludingTax
    ? cart?.subTotalInclTax?.text || ''
    : cart?.subTotal?.text || '';

  const discountAmount = cart?.discountAmount?.text || '';
  const coupon = cart?.coupon;

  const shippingMethod = cart?.shippingMethodName;
  const shippingCost = priceIncludingTax
    ? cart?.shippingFeeInclTax?.text || ''
    : cart?.shippingFeeExclTax?.text || '';

  const taxAmount = cart?.totalTaxAmount?.text || '';
  const total = cart?.grandTotal?.text || '';

  return (
    <div className="grid grid-cols-1 gap-5">
      {children ? (
        children({
          loading: Object.values(loadingStates).some(
            (state) =>
              state === true || (typeof state === 'string' && state !== null)
          ),
          showPriceIncludingTax: priceIncludingTax,
          subTotal,
          discountAmount,
          coupon,
          shippingMethod,
          shippingCost,
          taxAmount,
          total
        })
      ) : (
        <DefaultCartSummary
          loading={Object.values(loadingStates).some(
            (state) =>
              state === true || (typeof state === 'string' && state !== null)
          )}
          showPriceIncludingTax={priceIncludingTax}
          subTotal={subTotal}
          discountAmount={discountAmount}
          coupon={coupon}
          shippingMethod={shippingMethod}
          shippingCost={shippingCost}
          taxAmount={taxAmount}
          total={total}
        />
      )}
    </div>
  );
}

export {
  CartTotalSummary,
  DefaultCartSummary,
  Subtotal,
  Discount,
  Shipping,
  Tax,
  Total
};
