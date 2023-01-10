import PropTypes from 'prop-types';
import React, { useState } from 'react';
import Area from '../../../../../lib/components/Area';
import { useAppDispatch } from '../../../../../lib/context/app';
import { get } from '../../../../../lib/util/get';
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
  const onChange = (e, attributeCode, optionId) => {
    e.preventDefault();
    // Check if the attribute is already in the filter
    const index = currentFilters.findIndex((f) => f.key === attributeCode);
    if (index !== -1) {
      const value = currentFilters[index].value.split(',');
      // Check if the option is already in the filter
      const optionIndex = value.findIndex((v) => v === optionId.toString());
      if (optionIndex !== -1) {
        // Remove the option from the filter
        value.splice(optionIndex, 1);
        if (value.length === 0) {
          // Remove the attribute from the filter
          updateFilter(currentFilters.filter((f) => f.key !== attributeCode));
        } else {
          // Update the filter
          updateFilter(currentFilters.map((f) => {
            if (f.key !== attributeCode) return f;
            else return { key: attributeCode, value: value.join(',') };
          }));
        }
      } else {
        // Add the option to the filter
        updateFilter(currentFilters.map((f) => {
          if (f.key !== attributeCode) return f;
          else return { key: attributeCode, value: value.concat(optionId).join(',') };
        }));
      }
    } else {
      updateFilter(currentFilters.concat({ key: attributeCode, value: optionId }));
    }
  };

  return (
    <>
      {attributes.map((a) => (
        <div key={a.attributeCode}>
          <div className="filter-item-title"><span className="font-medium">{a.attributeName}</span></div>
          <ul className="filter-option-list">
            {a.options.map((o) => {
              const isChecked = currentFilters.find(
                (f) => f.key === a.attributeCode
                  && f.value.split(',').includes(o.optionId.toString())
              );
              return (
                <li key={o.optionId} className="mt-05 mr-05">
                  <a href="#" className='flex justify-start items-center' onClick={(e) => onChange(e, a.attributeCode, o.optionId)}>
                    {isChecked && <svg width="24px" height="24px" viewBox="0 0 24 24" >
                      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                        <g fill="#212121" fillRule="nonzero">
                          <path d="M18,3 C19.6568542,3 21,4.34314575 21,6 L21,18 C21,19.6568542 19.6568542,21 18,21 L6,21 C4.34314575,21 3,19.6568542 3,18 L3,6 C3,4.34314575 4.34314575,3 6,3 L18,3 Z M16.4696699,7.96966991 L10,14.4393398 L7.53033009,11.9696699 C7.23743687,11.6767767 6.76256313,11.6767767 6.46966991,11.9696699 C6.1767767,12.2625631 6.1767767,12.7374369 6.46966991,13.0303301 L9.46966991,16.0303301 C9.76256313,16.3232233 10.2374369,16.3232233 10.5303301,16.0303301 L17.5303301,9.03033009 C17.8232233,8.73743687 17.8232233,8.26256313 17.5303301,7.96966991 C17.2374369,7.6767767 16.7625631,7.6767767 16.4696699,7.96966991 Z" ></path>
                        </g>
                      </g>
                    </svg>}
                    {!isChecked && <svg width="24px" height="24px" viewBox="0 0 24 24">
                      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                        <g fill="#212121" fillRule="nonzero">
                          <path d="M5.75,3 L18.25,3 C19.7687831,3 21,4.23121694 21,5.75 L21,18.25 C21,19.7687831 19.7687831,21 18.25,21 L5.75,21 C4.23121694,21 3,19.7687831 3,18.25 L3,5.75 C3,4.23121694 4.23121694,3 5.75,3 Z M5.75,4.5 C5.05964406,4.5 4.5,5.05964406 4.5,5.75 L4.5,18.25 C4.5,18.9403559 5.05964406,19.5 5.75,19.5 L18.25,19.5 C18.9403559,19.5 19.5,18.9403559 19.5,18.25 L19.5,5.75 C19.5,5.05964406 18.9403559,4.5 18.25,4.5 L5.75,4.5 Z"></path>
                        </g>
                      </g>
                    </svg>}
                    <span className='filter-option'>{o.optionText}</span>
                  </a>
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
  const [isOpen, setIsOpen] = useState(false);
  const AppContextDispatch = useAppDispatch();

  const updateFilter = async (newFilters) => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl, window.location.origin);
    for (let i = 0; i < currentFilters.length; i += 1) {
      url.searchParams.delete(currentFilters[i].key);
    }

    for (let i = 0; i < newFilters.length; i += 1) {
      url.searchParams.append(newFilters[i].key, newFilters[i].value);
    }
    //window.location.href = url;
    url.searchParams.delete('ajax', true);

    // Delete the page. We want to go back to page 1
    url.searchParams.delete('page');
    url.searchParams.append('ajax', true);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');
    history.pushState(null, "", url);
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
    <>
      <div className={`product-filter-tool hidden md:block ${isOpen ? 'opening' : 'closed'}`}>
        <div className="">
          <div className="self-center">
            <div className="filter-heading">
              <span className="font-bold ">SHOP BY</span>
            </div>
            <div className='mt-1 grid grid-cols-1 gap-2'>
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
          </div>
        </div>
        <a className='filter-closer flex md:hidden' href="#" onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen) }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
        </a>
      </div>
      <a className='filter-opener flex md:hidden' href="#" onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen) }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      </a>
    </>
  );
}

export const layout = {
  areaId: "leftColumn",
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