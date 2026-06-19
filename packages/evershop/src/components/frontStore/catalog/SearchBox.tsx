import { Image } from '@components/common/Image.js';
import { Input } from '@components/common/ui/Input.js';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@components/common/ui/InputGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Search, X } from 'lucide-react';
import React, { useRef, useState, ReactNode, useCallback } from 'react';
import { useClient } from 'urql';

const SEARCH_PRODUCTS_QUERY = `
  query Query($filters: [FilterInput]) {
    products(filters: $filters) {
      items {
        ...Product
      }
    }
  }
`;

const PRODUCT_FRAGMENT = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    image {
      url
      alt
    }
    url
    inventory {
      isInStock
    }
  }
`;

export interface SearchResult {
  id: string;
  title: string;
  url?: string;
  image?: string;
  price?: string;
  type?: 'product' | 'category' | 'page';
  [key: string]: unknown;
}

interface SearchBoxProps {
  searchPageUrl: string;
  enableAutocomplete?: boolean;
  autocompleteDelay?: number;
  minSearchLength?: number;
  maxResults?: number;
  onSearch?: (query: string) => Promise<SearchResult[]>;
  renderSearchInput?: (props: {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
    onFocus: () => void;
    onBlur: () => void;
    placeholder: string;
    ref: React.RefObject<HTMLInputElement | null>;
  }) => ReactNode;
  renderSearchResults?: (props: {
    results: SearchResult[];
    query: string;
    onSelect: (result: SearchResult) => void;
    isLoading: boolean;
  }) => ReactNode;
  renderSearchIcon?: () => ReactNode;
  renderCloseIcon?: () => ReactNode;
}
export function SearchBox({
  searchPageUrl,
  enableAutocomplete = false,
  autocompleteDelay = 300,
  minSearchLength = 2,
  maxResults = 10,
  onSearch,
  renderSearchInput,
  renderSearchResults,
  renderSearchIcon,
  renderCloseIcon
}: SearchBoxProps) {
  const InputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const client = useClient();

  const [keyword, setKeyword] = useState<string>('');
  const [showing, setShowing] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const defaultSearchFunction = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      try {
        const result = await client
          .query(
            `
            ${PRODUCT_FRAGMENT}
            ${SEARCH_PRODUCTS_QUERY}
          `,
            {
              filters: [
                {
                  key: 'keyword',
                  operation: 'eq',
                  value: query
                },
                {
                  key: 'limit',
                  operation: 'eq',
                  value: `${maxResults}`
                }
              ]
            }
          )
          .toPromise();

        if (result.error) {
          return [];
        }

        if (!result.data?.products?.items) {
          return [];
        }

        return result.data.products.items.map((product: any) => ({
          id: product.productId,
          title: product.name,
          url: product.url,
          image: product.image?.url,
          price: product.price?.special?.text || product.price?.regular?.text,
          type: 'product' as const,
          sku: product.sku,
          isInStock: product.inventory?.isInStock
        }));
      } catch (error) {
        return [];
      }
    },
    [client]
  );

  const searchFunction = onSearch || defaultSearchFunction;

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

  const performSearch = useCallback(
    async (query: string) => {
      if (!enableAutocomplete || query.length < minSearchLength) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchFunction(query);
        setSearchResults(results.slice(0, maxResults));
        setShowResults(true);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [enableAutocomplete, searchFunction, minSearchLength, maxResults]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setKeyword(value);

      if (enableAutocomplete) {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
          performSearch(value);
        }, autocompleteDelay);
      }
    },
    [enableAutocomplete, autocompleteDelay, performSearch]
  );

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      if (result.url) {
        window.location.href = result.url;
      } else {
        const url = new URL(searchPageUrl, window.location.origin);
        url.searchParams.set('keyword', result.title);
        window.location.href = url.toString();
      }
      setShowing(false);
      setShowResults(false);
    },
    [searchPageUrl]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        setShowResults(false);
        const url = new URL(searchPageUrl, window.location.origin);
        url.searchParams.set('keyword', keyword);
        window.location.href = url.toString();
      } else if (event.key === 'Escape') {
        setShowResults(false);
        setShowing(false);
      }
    },
    [searchPageUrl, keyword]
  );

  const handleFocus = useCallback(() => {
    if (
      enableAutocomplete &&
      keyword.length >= minSearchLength &&
      searchResults.length > 0
    ) {
      setShowResults(true);
    }
  }, [enableAutocomplete, keyword, minSearchLength, searchResults.length]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setShowResults(false);
    }, 150);
  }, []);

  const defaultSearchIcon = () => (
    <Search className="w-5 h-5 text-foreground hover:text-primary" />
  );

  const defaultCloseIcon = () => (
    <X className="w-5 h-5 text-foreground hover:text-primary" />
  );

  return (
    <div className="search__box">
      <a
        href="#"
        className="search__icon"
        onClick={(e) => {
          e.preventDefault();
          setShowing(!showing);
        }}
      >
        {renderSearchIcon ? renderSearchIcon() : defaultSearchIcon()}
      </a>
      {showing && (
        <div className="search__input__container fixed top-0 left-0 right-0 bottom-0 bg-white shadow-md z-50 p-10">
          <div className="search__input relative flex justify-between">
            {renderSearchInput
              ? renderSearchInput({
                  value: keyword || '',
                  onChange: handleInputChange,
                  onKeyDown: handleKeyDown,
                  onFocus: handleFocus,
                  onBlur: handleBlur,
                  placeholder: _('Search'),
                  ref: InputRef
                })
              : defaultSearchInput({
                  value: keyword || '',
                  onChange: handleInputChange,
                  onKeyDown: handleKeyDown,
                  onFocus: handleFocus,
                  onBlur: handleBlur,
                  placeholder: _('Search'),
                  ref: InputRef
                })}
            <a
              href="#"
              className="close-icon flex items-center p-3"
              onClick={(e) => {
                e.preventDefault();
                setShowing(false);
                setShowResults(false);
              }}
            >
              {renderCloseIcon ? renderCloseIcon() : defaultCloseIcon()}
            </a>
            {enableAutocomplete &&
              showResults &&
              (renderSearchResults
                ? renderSearchResults({
                    results: searchResults,
                    query: keyword || '',
                    onSelect: handleResultSelect,
                    isLoading: isSearching
                  })
                : defaultSearchResults({
                    results: searchResults,
                    query: keyword || '',
                    onSelect: handleResultSelect,
                    isLoading: isSearching
                  }))}
          </div>
        </div>
      )}
    </div>
  );
}

const defaultSearchInput = (props: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  ref: React.RefObject<HTMLInputElement | null>;
}) => (
  <div className="form__field flex items-center justify-center relative grow">
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        ref={props.ref}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={props.onKeyDown}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        enterKeyHint="done"
        className="w-full focus:outline-none"
      />
    </InputGroup>
  </div>
);

const defaultSearchResults = (props: {
  results: SearchResult[];
  query: string;
  onSelect: (result: SearchResult) => void;
  isLoading: boolean;
}) => {
  return (
    <div className="search__results absolute top-full left-0 right-0 bg-white border border-border rounded-b-lg shadow-lg z-50 max-h-64 overflow-y-auto">
      {props.isLoading && (
        <div className="p-3 text-center text-gray-500">
          <span>{_('Searching...')}</span>
        </div>
      )}
      {!props.isLoading && props.results.length === 0 && (
        <div className="p-3 text-center text-gray-500">
          <span>No results found for &ldquo;{props.query}&rdquo;</span>
        </div>
      )}
      {!props.isLoading &&
        props.results.map((result) => (
          <div
            key={result.id}
            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-border last:border-b-0"
            onClick={(e) => {
              e.preventDefault();
              props.onSelect(result);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onSelect(result);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {result.image && (
              <Image
                src={result.image}
                alt={result.title}
                width={100}
                height={100}
                className="w-10 h-10 object-cover rounded mr-3 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{result.title}</div>
              {result.price && <div className="text-sm">{result.price}</div>}
              {result.type && (
                <div className="text-xs text-gray-400 capitalize">
                  {result.type}
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
};
