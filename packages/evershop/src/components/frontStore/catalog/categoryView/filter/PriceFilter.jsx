import PropTypes from 'prop-types';
import React from 'react';

import './PriceFilter.scss';
import { _ } from '../../../../../lib/locale/translate/_.js';

if (typeof document !== 'undefined')
{
  document.addEventListener('DOMContentLoaded', function () {
    const input = document.querySelector('input.min');
    const part = (input.value - input.min) / (input.max - input.min);
    const div = input.nextElementSibling;
    const x = part * (input.getBoundingClientRect().width - div.getBoundingClientRect().width);
    div.style.left = x + 'px';
  });
}

function minOnMouseOut (e) {
  e.target.style.zIndex = 0;
}

function mindivOnMouseOver(e) {
  e.target.previousSibling.style.zIndex = 2;
}

export function PriceFilter({
  priceRange: { min: minPrice, max: maxPrice },
  currentFilters,
  updateFilter,
  setting: { storeLanguage: language, storeCurrency: currency }
}) {
  const firstRender = React.useRef(true);
  const [from, setFrom] = React.useState(() => {
    const minPriceFilter = currentFilters.find((f) => f.key === 'min_price');
    if (minPriceFilter) {
      return minPriceFilter.value;
    } else {
      return minPrice;
    }
  });

  const [to, setTo] = React.useState(() => {
    const maxPriceFilter = currentFilters.find((f) => f.key === 'max_price');
    if (maxPriceFilter) {
      return maxPriceFilter.value;
    } else {
      return maxPrice;
    }
  });

  React.useEffect(() => {
    firstRender.current = true;
    setFrom(() => {
      const minPriceFilter = currentFilters.find((f) => f.key === 'min_price');
      if (minPriceFilter) {
        return minPriceFilter.value;
      } else {
        return minPrice;
      }
    });
    setTo(() => {
      const maxPriceFilter = currentFilters.find((f) => f.key === 'max_price');
      if (maxPriceFilter) {
        return maxPriceFilter.value;
      } else {
        return maxPrice;
      }
    });
  }, [currentFilters]);

  React.useLayoutEffect(() => {
    const timeoutID = setTimeout(() => {
      if (firstRender.current) {
        firstRender.current = false;
      } else {
        let minValue;
        let maxValue;
        if (from >= minPrice) {
          minValue = from;
        }
        if (to <= maxPrice) {
          maxValue = to;
        }
        if (minValue || maxValue) {
          const newFilters = currentFilters.map((f) => {
            if (f.key === 'min_price' && minValue) {
              return {
                ...f,
                value: minValue
              };
            }
            if (f.key === 'max_price' && maxValue) {
              return {
                ...f,
                value: maxValue
              };
            }
            return f;
          });
          // Check if the minPrice filter is already in the filter
          const minPriceIndex = currentFilters.findIndex(
            (f) => f.key === 'min_price'
          );
          if (minPriceIndex === -1 && minValue) {
            newFilters.push({
              key: 'min_price',
              operation: 'eq',
              value: minValue
            });
          }
          // Check if the maxPrice filter is already in the filter
          const maxPriceIndex = currentFilters.findIndex(
            (f) => f.key === 'max_price'
          );
          if (maxPriceIndex === -1 && maxValue) {
            newFilters.push({
              key: 'max_price',
              operation: 'eq',
              value: maxValue
            });
          }

          updateFilter(newFilters);
        }
      }
    }, 800);

    return () => clearTimeout(timeoutID);
  }, [from, to]);

  const onChange = (e, direction) => {
    e.persist();
    firstRender.current = false;
    const { value } = e.target;
    if (direction === 'min') {
      const part = (e.target.value - e.target.min) / (e.target.max - e.target.min);
      const div = e.target.nextElementSibling;
      const x = part * (e.target.getBoundingClientRect().width - div.getBoundingClientRect().width);
      div.style.left = x + 'px';

      if (value > to - 5) {
        setFrom(to - 5);
      } else {
        setFrom(value);
      }
    }

    if (direction === 'max') {
      if (value - 5 < from) {
        setTo(from + 5);
      } else {
        setTo(value);
      }
    }
  };

  const f = new Intl.NumberFormat(language, {
    style: 'currency',
    currency
  }).format(from);
  const t = new Intl.NumberFormat(language, {
    style: 'currency',
    currency
  }).format(to);

  return (
    <div className="price-filter">
      <div className="filter-item-title">{_('Price')}</div>
      <div className="rangeslider">
        <input
          className="min"
          type="range"
          min={minPrice}
          max={maxPrice}
          value={from}
          onChange={(e) => onChange(e, 'min')}
          onMouseOut={(e) => minOnMouseOut(e)}
        />
        <div className="mindiv"
           onMouseOver={(e) => mindivOnMouseOver(e)}
        />
        <div className="tooltip min">
          <div
            className="push"
            style={{
              width: `calc(${
                ((from - minPrice) / (maxPrice - minPrice)) * 100
              }% + 3px)`
            }}
          />
          <output>{f}</output>
        </div>
        <input
          className="max"
          type="range"
          min={minPrice}
          max={maxPrice}
          value={to}
          onChange={(e) => onChange(e, 'max')}
        />
        <div className="tooltip max">
          <div
            className="push"
            style={{
              width: `calc(${
                ((to - minPrice) / (maxPrice - minPrice)) * 100
              }% - 6px)`
            }}
          />
          <output>{t}</output>
        </div>
      </div>
    </div>
  );
}

PriceFilter.propTypes = {
  currentFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string
    })
  ).isRequired,
  priceRange: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number
  }).isRequired,
  setting: PropTypes.shape({
    storeLanguage: PropTypes.string,
    storeCurrency: PropTypes.string
  }).isRequired,
  updateFilter: PropTypes.func.isRequired
};

export const layout = {
  areaId: 'productFilter',
  sortOrder: 1
};
