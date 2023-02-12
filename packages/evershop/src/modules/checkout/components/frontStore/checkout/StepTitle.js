import PropTypes from 'prop-types';
import React from 'react';

function Title({ step }) {
  return (
    <div className="flex space-x-1 step-title mb-1 mt-1">
      {step.isCompleted === true && (
        <svg
          className="self-center"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )}
      {step.isCompleted === false && (
        <svg
          className="self-center"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      )}
      <h3 className="self-center">{step.title}</h3>
    </div>
  );
}

Title.propTypes = {
  step: PropTypes.shape({
    isCompleted: PropTypes.bool,
    title: PropTypes.string
  }).isRequired
};

export { Title };
