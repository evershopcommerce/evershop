import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Input } from '@components/common/form/fields/Input';
import { get } from '@evershop/evershop/src/lib/util/get';
import { NoResult } from './search/NoResult';
import { Results } from './search/Results';
import './SearchBox.scss';

const useClickOutside = (ref, callback) => {
  const handleClick = (e) => {
    if (ref.current && !ref.current.contains(e.target)) {
      callback();
    }
  };
  React.useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  });
};

export default function SearchBox({ searchAPI, resourceLinks }) {
  const InputRef = useRef();
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [typeTimeout, setTypeTimeout] = React.useState(null);

  const clickRef = React.useRef();
  const onClickOutside = () => {
    if (InputRef.current !== document.activeElement) {
      setShowResult(false);
    }
  };
  useClickOutside(clickRef, onClickOutside);

  const search = () => {
    setLoading(true);
    if (!InputRef.current.value) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (typeTimeout) clearTimeout(typeTimeout);
    setTypeTimeout(
      setTimeout(() => {
        const url = new URL(searchAPI, window.location.origin);
        url.searchParams.set('keyword', InputRef.current.value);

        fetch(url, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
          .then((response) => {
            if (
              !response.headers.get('content-type') ||
              !response.headers.get('content-type').includes('application/json')
            ) {
              throw new TypeError('Something wrong. Please try again');
            }

            return response.json();
          })
          .then((response) => {
            if (get(response, 'success') === true) {
              setResults(get(response, 'data.payload', []));
            } else {
              setResults([]);
            }
          })
          .catch((error) => {
            toast.error(error.message);
          })
          .finally(() => {
            // e.target.value = null
            setLoading(false);
          });
      }, 1500)
    );
  };

  return (
    <div className="search-box">
      <Input
        prefix={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '1.8rem', height: '1.8rem' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        placeholder="Search"
        ref={InputRef}
        onChange={() => search()}
        onFocus={() => {
          setShowResult(true);
        }}
      />
      {showResult === true && (
        <div className="search-result" ref={clickRef}>
          {loading === true && (
            <div className="loading">
              <svg
                style={{
                  background: 'rgb(255, 255, 255, 0)',
                  display: 'block',
                  shapeRendering: 'auto'
                }}
                width="2rem"
                height="2rem"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid"
              >
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="10"
                  r="43"
                  strokeDasharray="202.63272615654165 69.54424205218055"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    repeatCount="indefinite"
                    dur="1s"
                    values="0 50 50;360 50 50"
                    keyTimes="0;1"
                  />
                </circle>
              </svg>
            </div>
          )}
          {!InputRef.current.value && (
            <div className="text-center">
              <span>Search for products, order and other resources</span>
            </div>
          )}
          {results.length === 0 &&
            InputRef.current.value &&
            loading === false && (
              <NoResult
                keyword={InputRef.current && InputRef.current.value}
                resourseLinks={resourceLinks}
              />
            )}
          {results.length > 0 && (
            <Results
              keyword={InputRef.current && InputRef.current.value}
              results={results}
            />
          )}
        </div>
      )}
    </div>
  );
}

SearchBox.propTypes = {
  resourceLinks: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string,
      name: PropTypes.string
    })
  ),
  searchAPI: PropTypes.string.isRequired
};

SearchBox.defaultProps = {
  resourceLinks: []
};

export const layout = {
  areaId: 'header',
  sortOrder: 20
};

export const query = `
  query Query {
    searchAPI: url(routeId: "search")
  }
`;
