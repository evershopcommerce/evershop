import React from 'react';
import PropTypes from 'prop-types';
import './CategoryFilter.scss';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export function CategoryFilter({ currentFilters, categories, updateFilter }) {
  const onChange = (e, categoryId) => {
    e.preventDefault();
    // Check if the attribute is already in the filter
    const index = currentFilters.findIndex((f) => f.key === 'cat');
    if (index !== -1) {
      const value = currentFilters[index].value.split(',');
      // Check if the option is already in the filter
      const optionIndex = value.findIndex((v) => v === categoryId.toString());
      if (optionIndex !== -1) {
        // Remove the option from the filter
        value.splice(optionIndex, 1);
        if (value.length === 0) {
          // Remove the attribute from the filter
          updateFilter(currentFilters.filter((f) => f.key !== 'cat'));
        } else {
          // Update the filter
          updateFilter(
            currentFilters.map((f) => {
              if (f.key !== 'cat') {
                return f;
              } else {
                return { key: 'cat', operation: 'in', value: value.join(',') };
              }
            })
          );
        }
      } else {
        // Add the option to the filter
        updateFilter(
          currentFilters.map((f) => {
            if (f.key !== 'cat') {
              return f;
            } else {
              return {
                key: 'cat',
                operation: 'in',
                value: value.concat(categoryId).join(',')
              };
            }
          })
        );
      }
    } else {
      updateFilter(
        currentFilters.concat({
          key: 'cat',
          operation: 'in',
          value: categoryId
        })
      );
    }
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="category-filter mt-8">
      <div className="filter-item-title">
        <span className="font-medium">{_('Category')}</span>
      </div>
      <ul className="filter-option-list">
        {categories.map((c) => {
          const isChecked = currentFilters.find(
            (f) =>
              f.key === 'cat' &&
              f.value.split(',').includes(c.categoryId.toString())
          );

          return (
            <li key={c.uuid} className="mt-2 mr-2">
              <a
                href="#"
                className="flex justify-start items-center"
                onClick={(e) => onChange(e, c.categoryId)}
              >
                {isChecked && (
                  <svg width="24px" height="24px" viewBox="0 0 24 24">
                    <g
                      stroke="none"
                      strokeWidth="1"
                      fill="none"
                      fillRule="evenodd"
                    >
                      <g fill="#212121" fillRule="nonzero">
                        <path d="M18,3 C19.6568542,3 21,4.34314575 21,6 L21,18 C21,19.6568542 19.6568542,21 18,21 L6,21 C4.34314575,21 3,19.6568542 3,18 L3,6 C3,4.34314575 4.34314575,3 6,3 L18,3 Z M16.4696699,7.96966991 L10,14.4393398 L7.53033009,11.9696699 C7.23743687,11.6767767 6.76256313,11.6767767 6.46966991,11.9696699 C6.1767767,12.2625631 6.1767767,12.7374369 6.46966991,13.0303301 L9.46966991,16.0303301 C9.76256313,16.3232233 10.2374369,16.3232233 10.5303301,16.0303301 L17.5303301,9.03033009 C17.8232233,8.73743687 17.8232233,8.26256313 17.5303301,7.96966991 C17.2374369,7.6767767 16.7625631,7.6767767 16.4696699,7.96966991 Z" />
                      </g>
                    </g>
                  </svg>
                )}
                {!isChecked && (
                  <svg width="24px" height="24px" viewBox="0 0 24 24">
                    <g
                      stroke="none"
                      strokeWidth="1"
                      fill="none"
                      fillRule="evenodd"
                    >
                      <g fill="#212121" fillRule="nonzero">
                        <path d="M5.75,3 L18.25,3 C19.7687831,3 21,4.23121694 21,5.75 L21,18.25 C21,19.7687831 19.7687831,21 18.25,21 L5.75,21 C4.23121694,21 3,19.7687831 3,18.25 L3,5.75 C3,4.23121694 4.23121694,3 5.75,3 Z M5.75,4.5 C5.05964406,4.5 4.5,5.05964406 4.5,5.75 L4.5,18.25 C4.5,18.9403559 5.05964406,19.5 5.75,19.5 L18.25,19.5 C18.9403559,19.5 19.5,18.9403559 19.5,18.25 L19.5,5.75 C19.5,5.05964406 18.9403559,4.5 18.25,4.5 L5.75,4.5 Z" />
                      </g>
                    </g>
                  </svg>
                )}
                <span className="filter-option">{c.name}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

CategoryFilter.propTypes = {
  currentFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string
    })
  ).isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      categoryId: PropTypes.string,
      name: PropTypes.string,
      uuid: PropTypes.string
    })
  ).isRequired,
  updateFilter: PropTypes.func.isRequired
};

export const layout = {
  areaId: 'productFilter',
  sortOrder: 3
};
