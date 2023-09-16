import PropTypes from 'prop-types';
import React from 'react';
import { useModal } from '@components/common/modal/useModal';
import AttributeGroupSelector from '@components/admin/promotion/couponEdit/AttributeGroupSelector';

export default function AttributeGroupConditionSelector({
  condition,
  setCondition
}) {
  const groups = Array.isArray(condition.value) ? condition.value : [];
  const [selectedIDs, setSelectedIDs] = React.useState(groups);
  const modal = useModal();

  const closeModal = () => {
    modal.closeModal();
  };

  const onSelect = (ID) => {
    setSelectedIDs([ID, ...selectedIDs]);
  };

  const onUnSelect = (ID) => {
    setSelectedIDs(selectedIDs.filter((s) => s !== ID));
  };

  React.useEffect(() => {
    setCondition({
      ...condition,
      value: selectedIDs
    });
  }, [selectedIDs]);

  if (condition.key !== 'attribute_group') {
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
        {selectedIDs.map((ID, index) => (
          // only show 2 SKUs and add +{number} if there are more than 2 SKUs
          <span key={ID}>
            {index === 0 && <span className="italic">&lsquo;{ID}&rsquo;</span>}
            {index === 1 && <span> and {selectedIDs.length - 1} more</span>}
          </span>
        ))}
        {selectedIDs.length === 0 && <span>Choose attribute groups</span>}
      </a>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <AttributeGroupSelector
                onSelect={onSelect}
                onUnSelect={onUnSelect}
                selectedIDs={selectedIDs}
                closeModal={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AttributeGroupConditionSelector.propTypes = {
  condition: PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string
    ])
  }).isRequired,
  setCondition: PropTypes.func.isRequired
};

export const layout = {
  areaId: 'couponProductConditionValue',
  sortOrder: 15
};
