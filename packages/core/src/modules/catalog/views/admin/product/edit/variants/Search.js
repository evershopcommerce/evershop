/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import { useAlertContext } from '../../../../../../../lib/components/modal/Alert';
import { SearchModal } from './SearchModal';
import { Input } from '../../../../../../../lib/components/form/fields/Input';
import { VariantType } from './VariantType';

export function Search({ addVariant, variants }) {
  const searchInput = React.useRef();
  const { openAlert, closeAlert } = useAlertContext();

  const openModal = (e) => {
    e.persist();
    openAlert({
      heading: 'Search for variant',
      content: <SearchModal
        keyword={e.target.value}
        variants={variants}
        addVariant={addVariant}
      />,
      primaryAction: {
        title: 'Done',
        onAction: closeAlert,
        variant: 'primary'
      }
    });
  };

  return (
    <div className="flex justify-between mt-1">
      <div className="self-center">
        <a href="#" onClick={(e) => addVariant(e)}><span className="text-interactive hover:underline">Add a new variant</span></a>
      </div>
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
