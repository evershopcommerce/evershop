import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';

export default function InventoryManagementButton({ inventoryManagementButtonUrl }) {
  console.log(`url: ${  inventoryManagementButtonUrl}`);
  return <div className="ml-8 mt-8 mb-8">
      <Button url={inventoryManagementButtonUrl} title="Inventory Management" />
    </div>
}

InventoryManagementButton.propTypes = {
  inventoryManagementButtonUrl: PropTypes.string.isRequired
};