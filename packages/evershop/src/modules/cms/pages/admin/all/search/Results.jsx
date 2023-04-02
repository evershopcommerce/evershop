import PropTypes from 'prop-types';
import React from 'react';

export function Results({ keyword, results = [] }) {
  return (
    <div className="results">
      <h3>
        Results for &quot;
        {keyword}
        &quot;
      </h3>
      <div className="item-list">
        {results.map((category, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={index} className="item-category flex flex-col space-x-1">
            <div className="result-category">{category.name}</div>
            {category.items.map((item, key) => (
              // eslint-disable-next-line react/no-array-index-key
              <a href={item.url} key={key}>
                <div className="font-bold">{item.name}</div>
                <div>{item.description}</div>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

Results.propTypes = {
  keyword: PropTypes.string,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          name: PropTypes.string,
          description: PropTypes.string
        })
      )
    })
  )
};

Results.defaultProps = {
  keyword: undefined,
  results: []
};
