import { SearchModal } from '@components/admin/catalog/productEdit/variants/SearchModal';
import { VariantType } from '@components/admin/catalog/productEdit/variants/VariantType';
import { Input } from '@components/common/form/fields/Input';
import { useAlertContext } from '@components/common/modal/Alert';
import PropTypes from 'prop-types';
import React from 'react';

export function Search({ addVariant, variants }) {
  const searchInput = React.useRef();
  const { openAlert, closeAlert } = useAlertContext();

  const openModal = (e) => {
    e.persist();
    openAlert({
      heading: 'Search for variant',
      content: (
        <SearchModal
          keyword={e.target.value}
          variants={variants}
          addVariant={addVariant}
        />
      ),
      primaryAction: {
        title: 'Done',
        onAction: closeAlert,
        variant: 'primary'
      }
    });
  };

  return (
    <div className="flex justify-between mt-4">
      <div className="self-center">
        <div className="autocomplete-search">
          <Input
            ref={searchInput}
            type="text"
            placeholder="Search for variant"
            onChange={(e) => openModal(e)}
          />
        </div>
      </div>
    </div>
  );
}

Search.propTypes = {
  addVariant: PropTypes.func.isRequired,
  variants: PropTypes.arrayOf(VariantType).isRequired
};
