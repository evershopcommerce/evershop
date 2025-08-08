import { XMarkIcon } from '@heroicons/react/24/solid';
import React, { useRef, useState } from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';
import './SearchBox.scss';

interface SearchBoxProps {
  searchPageUrl: string;
}
export default function SearchBox({ searchPageUrl }: SearchBoxProps) {
  const InputRef = useRef<HTMLInputElement>(null);
  // Get the key from the URL
  const [keyword, setKeyword] = useState<string>('');
  const [showing, setShowing] = useState(false);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const key = url.searchParams.get('keyword');
    setKeyword(key || '');
  }, []);

  React.useEffect(() => {
    if (showing) {
      InputRef.current?.focus();
    }
  }, [showing]);

  return (
    <div className="search-box">
      <a
        href="#"
        className="search-icon"
        onClick={(e) => {
          e.preventDefault();
          setShowing(!showing);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '2.2rem', height: '2.2rem' }}
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
      </a>
      {showing && (
        <div className="search-input-container">
          <div className="search-input">
            <a
              href="#"
              className="close-icon"
              onClick={(e) => {
                e.preventDefault();
                setShowing(false);
              }}
            >
              <XMarkIcon width="2rem" height="2rem" />
            </a>
            <div className="form-field flex items-center justify-start relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '1rem', height: '1rem' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="absolute left-2 pointer-events-none"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                placeholder={_('Search')}
                ref={InputRef}
                value={keyword || ''}
                onChange={(e) => {
                  setKeyword(e.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    // Redirect to search page with search query as the keyword in the url
                    const url = new URL(searchPageUrl, window.location.origin);
                    url.searchParams.set(
                      'keyword',
                      InputRef.current?.value || ''
                    );

                    window.location.href = url.toString();
                  }
                }}
                enterKeyHint="done"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'icon-wrapper',
  sortOrder: 5
};

export const query = `
  query Query {
    searchPageUrl: url(routeId: "catalogSearch")
  }
`;
