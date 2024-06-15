import React from 'react';
import PropTypes from 'prop-types';
import './Filter.scss';

export default function Filter({ title, options, selectedOption }) {
  const [show, setShow] = React.useState(false);

  return (
    <div className="filter-container">
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="flex gap-4 justify-center items-center"
      >
        <span>{selectedOption || title}</span>
        {!show && (
          <svg
            width="6"
            height="5"
            viewBox="0 0 118 106"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M54.6478 2.69522C56.5621 -0.689529 61.4379 -0.689535 63.3522 2.69521L117.134 97.7885C119.019 101.122 116.611 105.25 112.782 105.25H5.21828C1.38899 105.25 -1.01899 101.122 0.866121 97.7886L54.6478 2.69522Z"
              fill="#2F2F2F"
            />
          </svg>
        )}

        {show && (
          <svg
            width="6"
            height="5"
            viewBox="0 0 118 106"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M63.3522 103.305C61.4379 106.69 56.5621 106.69 54.6478 103.305L0.866142 8.21144C-1.01897 4.8783 1.38901 0.749989 5.2183 0.749989L112.782 0.749998C116.611 0.749999 119.019 4.8783 117.134 8.21144L63.3522 103.305Z"
              fill="#2F2F2F"
            />
          </svg>
        )}
      </button>
      {show && (
        <ul>
          {options.map((option) => (
            <li key={option.value}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  option.onSelect();
                }}
              >
                {option.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

Filter.propTypes = {
  title: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.string,
      onSelect: PropTypes.func
    })
  ),
  selectedOption: PropTypes.string
};

Filter.defaultProps = {
  title: '',
  options: [],
  selectedOption: ''
};
