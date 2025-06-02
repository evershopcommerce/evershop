import Dot from '@components/common/Dot';
import PropTypes from 'prop-types';
import React from 'react';

export function NoResult({ keyword, resourseLinks = [] }) {
  return (
    <div className="no-result items-center text-center">
      <h3>
        No results for &quot;
        {keyword}
        &quot;
      </h3>
      <div>TRY OTHER RESOURCES</div>
      <div className="grid grid-cols-2 mt-4">
        {resourseLinks.map((link, index) => (
          <div
            key={index}
            className="flex space-x-4 justify-center items-center"
          >
            <Dot variant="info" />
            <a href={link.url} className="text-divider hover:underline">
              {link.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

NoResult.propTypes = {
  keyword: PropTypes.string,
  resourseLinks: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string,
      name: PropTypes.string
    })
  )
};

NoResult.defaultProps = {
  keyword: '',
  resourseLinks: undefined
};
