import ProductSkuSelector from '@components/admin/promotion/couponEdit/ProductSkuSelector';
import { useModal } from '@components/common/modal/useModal';
import PropTypes from 'prop-types';
import React from 'react';

export default function SkuConditionSelector({
  condition,
  setCondition,
  isMulti
}) {
  const skus = Array.isArray(condition.value) ? condition.value : [];
  const [selectedSKUs, setSelectedSKUs] = React.useState(skus || []);
  const modal = useModal();

  const closeModal = () => {
    modal.closeModal();
  };

  const onSelect = (sku) => {
    if (!isMulti) {
      setSelectedSKUs([sku]);
      return;
    }
    setSelectedSKUs([sku, ...selectedSKUs]);
  };

  const onUnSelect = (sku) => {
    setSelectedSKUs(selectedSKUs.filter((s) => s !== sku));
  };

  React.useEffect(() => {
    setCondition({
      ...condition,
      value: selectedSKUs
    });
  }, [selectedSKUs]);

  if (condition.key !== 'sku') {
    return null;
  }

  return (
    <div>
      <a
        href="#"
        className="text-interactive hover:underline"
        onClick={(e) => {
          e.preventDefault();
          modal.openModal();
        }}
      >
        {selectedSKUs.map((sku, index) => (
          <span key={sku}>
            {index === 0 && <span className="italic">&lsquo;{sku}&rsquo;</span>}
            {index === 1 && <span> and {selectedSKUs.length - 1} more</span>}
          </span>
        ))}
        {selectedSKUs.length === 0 && <span>Choose SKUs</span>}
      </a>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <ProductSkuSelector
                onSelect={onSelect}
                onUnSelect={onUnSelect}
                selectedChecker={({ sku }) => selectedSKUs.includes(sku)}
                closeModal={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

SkuConditionSelector.propTypes = {
  condition: PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      ),
      PropTypes.string,
      PropTypes.number
    ])
  }).isRequired,
  setCondition: PropTypes.func.isRequired,
  isMulti: PropTypes.bool
};

SkuConditionSelector.defaultProps = {
  isMulti: true
};

export const layout = {
  areaId: 'couponProductConditionValue',
  sortOrder: 15
};
