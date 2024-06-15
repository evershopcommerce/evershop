import PropTypes from 'prop-types';
import React from 'react';
import { useAppDispatch } from '@components/common/context/app';
import './Pagination.scss';

export function Pagination({ total, limit, currentPage }) {
  const [, setIsOnEdit] = React.useState(false);
  const [, setInPutVal] = React.useState(currentPage);
  const AppContextDispatch = useAppDispatch();
  const [page, setPage] = React.useState(currentPage);

  const max = Math.ceil(total / limit);
  React.useEffect(() => {
    setInPutVal(currentPage);
  }, [currentPage]);

  const onPage = async (p) => {
    let pageNum;
    if (p < 1) pageNum = 1;
    else if (p > max) pageNum = max;
    else pageNum = p;
    const url = new URL(window.location.href, window.location.origin);
    url.searchParams.set('page', pageNum);
    url.searchParams.append('ajax', true);
    setPage(p);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');
    // eslint-disable-next-line no-restricted-globals
    history.pushState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsOnEdit(false);
  };

  const onPrev = async (e) => {
    e.preventDefault();
    const prev = page - 1;
    if (page === 1) {
      return;
    }
    const url = new URL(window.location.href, window.location.origin);
    url.searchParams.set('page', prev);
    setPage(prev);
    url.searchParams.append('ajax', true);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');
    // eslint-disable-next-line no-restricted-globals
    history.pushState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onNext = async (e) => {
    e.preventDefault();
    const next = page + 1;
    if (page * limit >= total) {
      return;
    }
    const url = new URL(window.location.href, window.location.origin);
    url.searchParams.set('page', next);
    setPage(next);
    url.searchParams.append('ajax', true);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');
    // eslint-disable-next-line no-restricted-globals
    history.pushState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="products-pagination">
      <ul className="pagination flex justify-center space-x-4">
        {currentPage > 1 && (
          <li className="page-item prev self-center">
            <button
              type="button"
              className="link-button page-link"
              onClick={(e) => onPrev(e)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </li>
        )}
        {Array.from({ length: max }, (_, i) => i + 1).map((p) => {
          if (parseInt(p, 10) === parseInt(currentPage, 10)) {
            return (
              <li key={p} className="page-item current self-center">
                <button
                  type="button"
                  className="link-button page-link"
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  {p}
                </button>
              </li>
            );
          } else {
            return (
              <li key={p} className="page-item self-center">
                <button
                  type="button"
                  className="link-button page-link"
                  onClick={(e) => {
                    e.preventDefault();
                    onPage(p);
                  }}
                >
                  {p}
                </button>
              </li>
            );
          }
        })}
        {currentPage * limit < total && (
          <li className="page-item next self-center">
            <button
              type="button"
              className="page-link link-button"
              onClick={(e) => onNext(e)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
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
