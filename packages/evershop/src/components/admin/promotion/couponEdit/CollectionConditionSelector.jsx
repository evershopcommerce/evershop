import PropTypes from 'prop-types';
import React from 'react';
import { useModal } from '@components/common/modal/useModal';
import CollectionSelector from '@components/admin/promotion/couponEdit/CollectionSelector';

export default function CollectionConditionSelector({
  condition,
  setCondition
}) {
  const collections = Array.isArray(condition.value) ? condition.value : [];
  const [selectedIDs, setSelectedIDs] = React.useState(collections);
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

  if (condition.key !== 'collection') {
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
        {selectedIDs.length === 0 && <span>Choose collections</span>}
      </a>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <CollectionSelector
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

CollectionConditionSelector.propTypes = {
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
