import PropTypes from 'prop-types';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import getColumnClasses from './GetColumnClasses';
import getRowClasses from './GetRowClasses';

function RowTemplates({ addRow }) {
  const templates = {
    1: () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        fill="#949494"
      >
        <path d="M0 10a2 2 0 0 1 2-2h44a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V10Z" />
      </svg>
    ),
    '1:1': () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        fill="#949494"
      >
        <path d="M0 10a2 2 0 0 1 2-2h19a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V10Zm25 0a2 2 0 0 1 2-2h19a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H27a2 2 0 0 1-2-2V10Z" />
      </svg>
    ),
    '1:2': () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        fill="#949494"
      >
        <path d="M0 10a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V10Zm17 0a2 2 0 0 1 2-2h27a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V10Z" />
      </svg>
    ),
    '2:1': () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        fill="#949494"
      >
        <path d="M0 10a2 2 0 0 1 2-2h27a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V10Zm33 0a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H35a2 2 0 0 1-2-2V10Z" />
      </svg>
    ),
    '2:3': () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        fill="#949494"
      >
        <rect x="0" y="8" width="18.4" height="32" rx="2" ry="2" />
        <rect x="21.6" y="8" width="24" height="32" rx="2" ry="2" />
      </svg>
    ),
    '3:2': () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        fill="#949494"
      >
        <rect x="0" y="8" width="24" height="32" rx="2" ry="2" />
        <rect x="27.2" y="8" width="18.4" height="32" rx="2" ry="2" />
      </svg>
    ),
    '1:1:1': () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        fill="#949494"
      >
        <path d="M0 10a2 2 0 0 1 2-2h10.531c1.105 0 1.969.895 1.969 2v28c0 1.105-.864 2-1.969 2H2a2 2 0 0 1-2-2V10Zm16.5 0c0-1.105.864-2 1.969-2H29.53c1.105 0 1.969.895 1.969 2v28c0 1.105-.864 2-1.969 2H18.47c-1.105 0-1.969-.895-1.969-2V10Zm17 0c0-1.105.864-2 1.969-2H46a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H35.469c-1.105 0-1.969-.895-1.969-2V10Z" />
      </svg>
    ),
    '1:2:1': () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        fill="#949494"
      >
        <path d="M0 10a2 2 0 0 1 2-2h7.531c1.105 0 1.969.895 1.969 2v28c0 1.105-.864 2-1.969 2H2a2 2 0 0 1-2-2V10Zm13.5 0c0-1.105.864-2 1.969-2H32.53c1.105 0 1.969.895 1.969 2v28c0 1.105-.864 2-1.969 2H15.47c-1.105 0-1.969-.895-1.969-2V10Zm23 0c0-1.105.864-2 1.969-2H46a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2h-7.531c-1.105 0-1.969-.895-1.969-2V10Z" />
      </svg>
    )
  };
  return (
    <div className="row-templates flex justify-center gap-7 border border-divider px-3">
      {Object.keys(templates).map((key) => (
        <a
          key={key}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            const split = key.split(':').map((val) => parseInt(val, 10));
            const sum = split.reduce((acc, val) => acc + val, 0);
            const rowClassName = getRowClasses(sum);
            const columns = split.map((size) => {
              const columnClassName = getColumnClasses(size);
              return {
                size: parseInt(size, 10),
                className: columnClassName,
                id: `c__${uuidv4()}`
              };
            });
            addRow({
              id: `r__${uuidv4()}`,
              editSetting: true,
              columns,
              size: sum,
              className: rowClassName
            });
          }}
        >
          {templates[key]()}
        </a>
      ))}
    </div>
  );
}

RowTemplates.propTypes = {
  addRow: PropTypes.func.isRequired
};

export default RowTemplates;
