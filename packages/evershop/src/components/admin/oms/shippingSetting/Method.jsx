import React from 'react';
import { useModal } from '@components/common/modal/useModal';
import MethodForm from './MethodForm';

Method.propTypes = {};

function Method({ method, getZones }) {
  const modal = useModal();
  return (
    <>
      <>
        <td className="border-none py-1">{method.name}</td>
        <td className="border-none py-1">
          {method.isEnabled ? 'Enabled' : 'Disabled'}
        </td>
        <td className="border-none py-1">{method.cost?.text}</td>
        <td className="border-none py-1">
          {method.conditionType
            ? `${method.min || 0} <= ${method.conditionType} <= ${
                method.max || '∞'
              }`
            : 'None'}
        </td>
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
              <MethodForm
                saveMethodApi={method.updateApi}
                closeModal={() => modal.closeModal()}
                getZones={getZones}
                method={method}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Method;
