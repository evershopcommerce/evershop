import Spinner from '@components/admin/Spinner.js';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@components/common/ui/InputGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Search } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useQuery } from 'urql';
import { NoResult } from './search/NoResult.js';
import { Results } from './search/Results.js';

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

const SearchQuery = `
  query Query ($filters: [FilterInput]) {
    customers(filters: $filters) {
      items {
        customerId
        uuid
        fullName
        email
        url: editUrl
      }
    }
    products(filters: $filters) {
      items {
        productId
        uuid
        sku
        name
        url: editUrl
      }
    }
    orders(filters: $filters) {
      items {
        orderId
        uuid
        orderNumber
        url: editUrl
      }
    }
  }
`;

interface SearchBoxProps {
  resourceLinks: {
    url: string;
    name: string;
  }[];
}

export default function SearchBox({ resourceLinks }: SearchBoxProps) {
  const [keyword, setKeyword] = React.useState('');
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const InputRef = useRef<HTMLInputElement>(null);

  const clickRef = React.useRef<HTMLDivElement>(null);
  const onClickOutside = () => {
    if (InputRef.current !== document.activeElement) {
      setShowResult(false);
    }
  };
  useClickOutside(clickRef, onClickOutside);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: keyword
        ? [{ key: 'keyword', operation: 'eq', value: keyword }]
        : []
    },
    pause: true
  });
  const { data, fetching } = result;

  React.useEffect(() => {
    setLoading(true);
    if (keyword) {
      setShowResult(true);
    } else {
      setShowResult(false);
    }
    const timer = setTimeout(() => {
      if (keyword) {
        reexecuteQuery({ requestPolicy: 'network-only' });
        setLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <div className="relative self-center ml-[14.563rem] w-[34.375rem]">
      <InputGroup className="bg-[#f1f2f3] rounded-[3px] border-[#f1f2f3]">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          placeholder={_('Search')}
          ref={InputRef}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </InputGroup>
      {showResult && (
        <div
          className="absolute top-[calc(100%+1rem)] left-0 bg-white rounded-[5px] w-full py-5 px-2.5 border border-border shadow-lg z-50 max-h-[30rem] overflow-y-auto"
          ref={clickRef}
        >
          {(loading || fetching) && (
            <div className="p-2 flex justify-center items-center">
              <Spinner width={25} height={25} />
            </div>
          )}
          {!keyword && (
            <div className="text-center">
              <span>
                {_('Search for products, orders, and other resources')}
              </span>
            </div>
          )}
          {data?.products.items.length === 0 &&
            data?.customers.items.length === 0 &&
            data?.orders.items.length === 0 &&
            keyword &&
            !loading && (
              <NoResult keyword={keyword} resourseLinks={resourceLinks} />
            )}
          {data &&
            !loading &&
            !fetching &&
            (data?.products.items.length > 0 ||
              data?.customers.items.length > 0 ||
              data?.orders.items.length > 0) && (
              <Results keyword={keyword} results={data} />
            )}
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'header',
  sortOrder: 20
};
