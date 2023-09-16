import React from 'react';
import PropTypes from 'prop-types';
import { useModal } from '@components/common/modal/useModal';
import RateForm from './RateForm';

function Rate({ rate, getTaxClasses }) {
  const modal = useModal();
  return (
    <>
      <>
        <td className="border-none py-1">{rate.name}</td>
        <td className="border-none py-1">{rate.rate}%</td>
        <td className="border-none py-1">{rate.isCompound ? 'Yes' : 'No'}</td>
        <td className="border-none py-1">{rate.priority}</td>
        <td className="border-none py-1">
          <a
            href="#"
            className="text-interactive"
            onClick={(e) => {
              e.preventDefault();
              modal.openModal();
            }}
          >
            Edit
          </a>
          <a
            href="#"
            className="text-critical ml-2"
            onClick={async (e) => {
              e.preventDefault();
              await fetch(rate.deleteApi, {
                method: 'DELETE'
              });
              await getTaxClasses({ requestPolicy: 'network-only' });
            }}
          >
            Delete
          </a>
        </td>
      </>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <RateForm
                saveRateApi={rate.updateApi}
                closeModal={() => modal.closeModal()}
                getTaxClasses={getTaxClasses}
                rate={rate}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

Rate.propTypes = {
  rate: PropTypes.shape({
    uuid: PropTypes.string,
    name: PropTypes.string,
    isCompound: PropTypes.bool,
    rate: PropTypes.number,
    priority: PropTypes.number,
    country: PropTypes.string,
    province: PropTypes.string,
    postcode: PropTypes.string,
    updateApi: PropTypes.string,
    deleteApi: PropTypes.string
  }).isRequired,
  getTaxClasses: PropTypes.func.isRequired
};

export default Rate;
