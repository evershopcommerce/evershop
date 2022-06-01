import PropTypes from "prop-types";
import React from 'react';
import { Input } from "../../../../../../lib/components/form/fields/Input";
import { RequiredProducts } from './RequireProducts';

export function OrderCondition({ orderTotal, orderQty, requiredProducts }) {
  return (
    <div>
      <Input
        name="condition[order_total]"
        label="Minimum purchase amount"
        value={orderTotal ? orderTotal : ''}
      />
      <Input
        name="condition[order_qty]"
        label="Minimum purchase qty"
        value={orderQty ? orderQty : ''}
      />
      <RequiredProducts requiredProducts={requiredProducts ? requiredProducts : []} />
    </div>
  );
}

OrderCondition.propTypes = {
  orderQty: PropTypes.number,
  orderTotal: PropTypes.string,
  requiredProducts: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    operator: PropTypes.string,
    value: PropTypes.string,
    qty: PropTypes.string
  }))
}

OrderCondition.defaultProps = {
  requiredProducts: []
}