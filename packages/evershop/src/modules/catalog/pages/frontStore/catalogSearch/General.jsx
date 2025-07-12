import React from 'react';

import './General.scss';
import { _ } from '../../../../../lib/locale/translate/_.js';

export default function SearchInfo() {
  const [key, setKey] = React.useState('');

  React.useEffect(() => {
    // Get the key from the URL
    const url = new URL(window.location.href);
    const keyParam = url.searchParams.get('keyword');
    setKey(keyParam);
  });

  return (
    <div className="page-width">
      <div className="mb-4 md:mb-8">
        <div className="text-left ">
          <h1 className="search-name mt-10">
            {_('Search results for "${keyword}"', { keyword: key })}
          </h1>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};
