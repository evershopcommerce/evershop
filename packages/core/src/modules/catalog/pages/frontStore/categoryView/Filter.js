import PropTypes from 'prop-types';
import React, { useState } from 'react';
import Area from '../../../../../lib/components/Area';
import { get } from '../../../../../lib/util/get';
import Sorting from '../../../components/product/list/Sorting';
import './Filter.scss';

function Price({
  activeFilters, updateFilter, priceFilter
}) {
  const currency = get(context, 'currency', 'USD');
  const language = get(context, 'language', 'en');

  // Get the min price
  const minPrice = priceFilter.options[0]

  const firstRender = React.useRef(true);
  const [from, setFrom] = React.useState(() => {
    const index = activeFilters.findIndex((f) => f.key === 'price');
    if (index === -1) { return minPrice; } else {
      return activeFilters[index].value.split('-')[0] ? activeFilters[index].value.split('-')[0] : minPrice;
    }
  });

  const [to, setTo] = React.useState(() => {
    const index = activeFilters.findIndex((f) => f.key === 'price');
    if (index === -1) { return maxPrice; } else {
      return activeFilters[index].value.split('-')[1] ? activeFilters[index].value.split('-')[1] : maxPrice;
    }
  });

  React.useLayoutEffect(() => {
    const timeoutID = setTimeout(() => {
      if (firstRender.current) {
        firstRender.current = false;
      } else {
        let value = '';
        if (from === minPrice) value = `-${to}`;
        else if (to === maxPrice) value = `${from}-`;
        else value = `${from}-${to}`;
        const index = activeFilters.findIndex((f) => f.key === 'price');
        if (index === -1) updateFilter(activeFilters.concat({ key: 'price', value }));
        else {
          updateFilter(activeFilters.map((f) => {
            if (f.key !== 'price') return f;
            else return { key: 'price', value };
          }));
        }
      }
    }, 1000);

    return () => clearTimeout(timeoutID);
  }, [from, to]);

  const onChange = (e, direction) => {
    e.persist();
    const { value } = e.target;
    if (direction === 'min') {
      if (value > to - 5) { setFrom(to - 5); } else { setFrom(value); }
    }

    if (direction === 'max') {
      if (value - 5 < from) { setTo(from + 5); } else { setTo(value); }
    }
  };

  const f = new Intl.NumberFormat(language, { style: 'currency', currency }).format(minPrice);
  const t = new Intl.NumberFormat(language, { style: 'currency', currency }).format(maxPrice);

  return (
    <div className="price-filter">
      <div className="filter-item-title">Price</div>
      <div className="rangeslider">
        <input
          className="min"
          type="range"
          min={minPrice}
          max={maxPrice}
          value={from}
          onChange={(e) => onChange(e, 'min')}
        />
        <input
          className="max"
          type="range"
          min={minPrice}
          max={maxPrice}
          value={to}
          onChange={(e) => onChange(e, 'max')}
        />
        <span className="range_min light left">{f}</span>
        <span className="range_max light right">{t}</span>
      </div>
    </div>
  );
}

Price.propTypes = {
  activeFilters: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.string
  })).isRequired,
  maxPrice: PropTypes.number.isRequired,
  minPrice: PropTypes.number.isRequired,
  updateFilter: PropTypes.func.isRequired
};

function Attributes({ currentFilters, attributes, updateFilter }) {
  const onChange = (e, attributeCode, optionId, isChecked) => {
    e.preventDefault();
    if (isChecked === true) {
      updateFilter(
        currentFilters.filter(
          (f) => f.key !== attributeCode
            || (f.key === attributeCode && parseInt(f.value, 10) !== parseInt(optionId, 10))
        )
      );
    } else {
      updateFilter(currentFilters.concat({ key: attributeCode, value: optionId }));
    }
  };

  return (
    <>
      {attributes.map((a) => (
        <div key={a.attributeCode}>
          <div className="filter-item-title"><span className="font-medium">{a.attributeName}</span></div>
          <ul className="flex flex-wrap filter-option-list">
            {a.options.map((o) => {
              const isChecked = currentFilters.find(
                (f) => f.key === a.attributeCode
                  && parseInt(f.value, 10) === parseInt(o.optionId, 10)
              );
              return (
                <li key={o.optionId} className="mt-05 mr-05">
                  <button
                    type="button"
                    className={isChecked ? 'checked text-center filter-option link-button' : 'text-center filter-option link-button'}
                    onClick={(e) => onChange(e, a.attributeCode, o.optionId, !!isChecked)}
                  >
                    {o.optionText}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

Attributes.propTypes = {
  currentFilters: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.string
  })).isRequired,
  attributes: PropTypes.arrayOf(PropTypes.shape({
    attributeName: PropTypes.string,
    attributeCode: PropTypes.string
  })).isRequired,
  updateFilter: PropTypes.func.isRequired
};

export default function Filter({ category: { availableFilters, products: { currentFilters } } }) {

  const [filtering, setFiltering] = useState(false);

  const updateFilter = (newFilters) => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl, window.location.origin);
    for (let i = 0; i < currentFilters.length; i += 1) {
      url.searchParams.delete(currentFilters[i].key);
    }

    for (let i = 0; i < newFilters.length; i += 1) {
      url.searchParams.append(newFilters[i].key, newFilters[i].value);
    }
    window.location.href = url;
  };

  const cleanFilter = () => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl, window.location.origin);
    for (let i = 0; i < currentFilters.length; i += 1) {
      url.searchParams.delete(currentFilters[i].key);
    }

    window.location.href = url;
  };

  return (
    <div className="product-filter-tool">
      <div className="page-width flex justify-between">
        <div className="self-center">
          <div className="filter-heading">
            {filtering === false && (
              <button type="button" className="link-button flex justify-start space-x-05" onClick={(e) => { e.preventDefault(); setFiltering(true); }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="font-light">FILTER BY</span>
              </button>
            )}
            {filtering === true && (
              <div className="close-filter mb-1">
                <button type="button" onClick={(e) => { e.preventDefault(); setFiltering(false); }} className="link-button">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {filtering === true && (
            <div className="filter-table md:grid md:grid-cols-4 gap-2">
              <Area
                id="productFilter"
                updateFilter={updateFilter}
                cleanFilter={cleanFilter}
                currentFilters={currentFilters}
                noOuter
                coreComponents={[
                  {
                    component: { default: Attributes },
                    props: { currentFilters, updateFilter, attributes: availableFilters },
                    sortOrder: 20,
                    id: 'filterAttributes'
                  }
                ]}
              />
            </div>
          )}
        </div>
        {filtering === false && (
          <div>
            <Sorting currentFilters={currentFilters} />
          </div>
        )}
      </div>
    </div>
  );
}

export const layout = {
  areaId: "content",
  sortOrder: 1
}

export const query = `
query Query {
  category (id: getContextValue('categoryId')) {
    products (filters: getContextValue('filtersFromUrl')) {
      currentFilters {
        key
        operation
        value
      }
    }
    availableFilters {
      attributeCode
      attributeName
      options {
        optionId
        optionText
      }
    }
  }
}
`