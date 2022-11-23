import PropTypes from 'prop-types';
import React from 'react';
import './Pagination.scss';

export function Pagination({
  total, limit, currentPage
}) {
  const [, setIsOnEdit] = React.useState(false);
  const [, setInPutVal] = React.useState(currentPage);

  const max = Math.ceil(total / limit);
  React.useEffect(() => {
    setInPutVal(currentPage);
  }, [currentPage]);

  const onPage = (page) => {
    let pageNum;
    if (page < 1) pageNum = 1;
    else if (page > max) pageNum = max;
    else pageNum = page;
    const url = new URL(window.location.href, window.location.origin);
    url.searchParams.set('page', pageNum);
    window.location.href = url;
    setIsOnEdit(false);
  };

  const onPrev = (e) => {
    e.preventDefault();
    const prev = currentPage - 1;
    if (currentPage === 1) { return; }
    const url = new URL(currentUrl, window.location.origin);
    url.searchParams.set('page', prev);
    window.location.href = url;
  };

  const onNext = (e) => {
    e.preventDefault();
    const next = currentPage + 1;
    if (currentPage * limit >= total) { return; }
    const url = new URL(currentUrl, window.location.origin);
    url.searchParams.set('page', next);
    window.location.href = url;
  };

  return (
    <div className="products-pagination">
      <ul className="pagination flex justify-center space-x-1">
        {currentPage > 1 && (
          <li className="page-item prev self-center">
            <button type="button" className="link-button page-link" onClick={(e) => onPrev(e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        )}
        {Array.from({ length: max }, (_, i) => i + 1).map((page) => {
          if (parseInt(page) === parseInt(currentPage)) {
            return (
              <li key={page} className="page-item current self-center">
                <button type="button" className="link-button page-link" onClick={(e) => { e.preventDefault(); }}>{page}</button>
              </li>
            );
          } else {
            return (
              <li key={page} className="page-item self-center">
                <button type="button" className="link-button page-link" onClick={(e) => { e.preventDefault(); onPage(page); }}>{page}</button>
              </li>
            );
          }
        })}
        {(currentPage * limit) < total && (
          <li className="page-item next self-center">
            <button type="button" className="page-link link-button" onClick={(e) => onNext(e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired
};
