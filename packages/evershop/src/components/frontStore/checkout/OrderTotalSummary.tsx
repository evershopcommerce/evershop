import Area from '@components/common/Area.js';
import { useAppState } from '@components/common/context/app.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

const Total: React.FC<{
  total: string;
  totalTaxAmount: string;
  priceIncludingTax: boolean;
}> = ({ total, totalTaxAmount, priceIncludingTax }) => {
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
        <span>{total}</span>
      </div>
    </div>
  );
};

const Tax: React.FC<{
  showPriceIncludingTax: boolean;
  amount: string;
}> = ({ showPriceIncludingTax, amount }) => {
  if (showPriceIncludingTax) {
    return null;
  }

  return (
    <div className="summary-row flex justify-between py-2">
      <span>{_('Tax')}</span>
      <div>
        <div />
        <span>{amount}</span>
      </div>
    </div>
  );
};

const Subtotal: React.FC<{ subTotal: string }> = ({ subTotal }) => {
  return (
    <div className="flex justify-between gap-7 py-2">
      <div>{_('Sub total')}</div>
      <span>{subTotal}</span>
    </div>
  );
};

const Discount: React.FC<{
  discountAmount: string;
  coupon: string | undefined;
}> = ({ discountAmount, coupon }) => {
  if (!coupon) {
    return null;
  }

  return (
    <div className="flex justify-between gap-7 py-2">
      <div>{_('Discount(${coupon})', { coupon })}</div>
      <span>- {discountAmount}</span>
    </div>
  );
};

const Shipping: React.FC<{
  method: string | undefined;
  cost: string | undefined;
}> = ({ method, cost }) => {
  return (
    <div className="summary-row flex justify-between gap-7 py-2">
      {method && (
        <>
          <span>{_('Shipping (${method})', { method })}</span>
          <div>
            <span className="block">{cost}</span>
          </div>
        </>
      )}
      {!method && (
        <>
          <span>{_('Shipping')}</span>
          <span className="text-gray-500 italic font-normal">
            {_('No shipping is required for this order')}
          </span>
        </>
      )}
    </div>
  );
};

const OrderTotalSummary: React.FC<{
  subTotal: string;
  discountAmount: string;
  coupon: string | undefined;
  shippingMethod: string | undefined;
  shippingCost: string | undefined;
  taxAmount: string;
  total: string;
}> = ({
  subTotal,
  discountAmount,
  coupon,
  shippingMethod,
  shippingCost,
  taxAmount,
  total
}) => {
  const {
    config: {
      tax: { priceIncludingTax }
    }
  } = useAppState();
  return (
    <div className="order__total__summary font-semibold">
      <Area id="orderSummaryBeforeSubTotal" noOuter />
      <Subtotal subTotal={subTotal} />
      <Area id="orderSummaryAfterSubTotal" noOuter />
      <Area id="orderSummaryBeforeDiscount" noOuter />
      <Discount discountAmount={discountAmount} coupon={coupon} />
      <Area id="orderSummaryAfterDiscount" noOuter />
      <Area id="orderSummaryBeforeShipping" noOuter />
      <Shipping method={shippingMethod} cost={shippingCost} />
      <Area id="orderSummaryAfterShipping" noOuter />
      <Area id="orderSummaryBeforeTax" noOuter />
      <Tax amount={taxAmount} showPriceIncludingTax={priceIncludingTax} />
      <Area id="orderSummaryAfterTax" noOuter />
      <Area id="orderSummaryBeforeTotal" noOuter />
      <Total
        total={total}
        totalTaxAmount={taxAmount}
        priceIncludingTax={priceIncludingTax}
      />
      <Area id="orderSummaryAfterTotal" noOuter />
    </div>
  );
};

export { OrderTotalSummary, Subtotal, Discount, Shipping, Tax, Total };
