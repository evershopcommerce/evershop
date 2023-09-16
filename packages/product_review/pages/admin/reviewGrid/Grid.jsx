/* eslint-disable react/no-unstable-nested-components */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import axios from 'axios';
import Pagination from '@components/common/grid/Pagination';
import { useAlertContext } from '@components/common/modal/Alert';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import BasicColumnHeader from '@components/common/grid/headers/Basic';
import BasicRow from '@components/common/grid/rows/BasicRow';
import IsApprovedRow from './row/IsApprovedRow';
import IsApprovedHeader from './header/IsApprovedHeader';
import RatingRow from './row/RatingRow';
import CommentRow from './row/CommentRow';
import ProductRow from './row/ProductRow';

function Actions({ reviews = [], selectedIds = [] }) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const approveReviews = async () => {
    setIsLoading(true);
    const promises = reviews
      .filter((review) => selectedIds.includes(review.uuid))
      .map((review) => axios.patch(review.approveApi));
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const unApproveReviews = async () => {
    setIsLoading(true);
    const promises = reviews
      .filter((review) => selectedIds.includes(review.uuid))
      .map((review) => axios.patch(review.unApproveApi));
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const deleteReviews = async () => {
    setIsLoading(true);
    const promises = reviews
      .filter((review) => selectedIds.includes(review.uuid))
      .map((review) => axios.delete(review.deleteApi));
    await Promise.all(promises);
    setIsLoading(false);
    // Refresh the page
    window.location.reload();
  };

  const actions = [
    {
      name: 'Unapprove',
      onAction: () => {
        openAlert({
          heading: `Unapprove ${selectedIds.length} reviews`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Unapprove',
            onAction: async () => {
              await unApproveReviews();
            },
            variant: 'critical',
            isLoading: false
          }
        });
      }
    },
    {
      name: 'Approve',
      onAction: () => {
        openAlert({
          heading: `Approve ${selectedIds.length} reviews`,
          content: 'Are you sure?',
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Approve',
            onAction: async () => {
              await approveReviews();
            },
            variant: 'critical',
            isLoading: false
          }
        });
      }
    },
    {
      name: 'Delete',
      onAction: () => {
        openAlert({
          heading: `Delete ${selectedIds.length} reviews`,
          content: <div>Can&apos;t be undone</div>,
          primaryAction: {
            title: 'Cancel',
            onAction: closeAlert,
            variant: 'primary'
          },
          secondaryAction: {
            title: 'Delete',
            onAction: async () => {
              await deleteReviews();
            },
            variant: 'critical',
            isLoading
          }
        });
      }
    }
  ];

  return (
    <tr>
      {selectedIds.length === 0 && null}
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan="100">
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a href="#" className="font-semibold pt-075 pb-075 pl-15 pr-15">
              {selectedIds.length} selected
            </a>
            {actions.map((action) => (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  action.onAction();
                }}
                className="font-semibold pt-075 pb-075 pl-15 pr-15 block border-l border-divider self-center"
              >
                <span>{action.name}</span>
              </a>
            ))}
          </div>
        </td>
      )}
    </tr>
  );
}

Actions.propTypes = {
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  reviews: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.number.isRequired,
      updateApi: PropTypes.string.isRequired,
      deleteApi: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function ReviewGrid({
  reviews: { items: reviews, total, currentFilters = [] }
}) {
  const page = currentFilters.find((filter) => filter.key === 'page')
    ? currentFilters.find((filter) => filter.key === 'page').value
    : 1;
  const limit = currentFilters.find((filter) => filter.key === 'limit')
    ? currentFilters.find((filter) => filter.key === 'limit').value
    : 20;

  const [selectedRows, setSelectedRows] = useState([]);

  return (
    <Card>
      <table className="listing sticky">
        <thead>
          <tr>
            <th className="align-bottom">
              <Checkbox
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRows(reviews.map((r) => r.uuid));
                  } else {
                    setSelectedRows([]);
                  }
                }}
              />
            </th>
            <Area
              className=""
              id="reviewGridHeader"
              noOuter
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <BasicColumnHeader
                        title="Product"
                        id="product"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 2
                },
                {
                  component: {
                    default: () => (
                      <BasicColumnHeader
                        title="Customer Name"
                        id="customer_name"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 5
                },
                {
                  component: {
                    default: () => (
                      <BasicColumnHeader
                        title="Comment"
                        id="comment"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => (
                      <BasicColumnHeader
                        title="Rating"
                        id="rating"
                        currentFilters={currentFilters}
                      />
                    )
                  },
                  sortOrder: 15
                },
                {
                  component: {
                    default: () => (
                      <IsApprovedHeader
                        title="Is Approved?"
                        id="approved"
                        currentFilter={currentFilters.find(
                          (f) => f.key === 'approved'
                        )}
                      />
                    )
                  },
                  sortOrder: 20
                }
              ]}
            />
          </tr>
        </thead>
        <tbody>
          <Actions
            reviews={reviews}
            selectedIds={selectedRows}
            setSelectedRows={setSelectedRows}
          />
          {reviews.map((r, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i}>
              <td style={{ width: '2rem' }}>
                <Checkbox
                  isChecked={selectedRows.includes(r.uuid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(selectedRows.concat([r.uuid]));
                    } else {
                      setSelectedRows(
                        selectedRows.filter((row) => row !== r.uuid)
                      );
                    }
                  }}
                />
              </td>
              <Area
                className=""
                id="reviewGridRow"
                row={r}
                noOuter
                coreComponents={[
                  {
                    component: {
                      default: () => <ProductRow product={r.product} />
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: ({ areaProps }) => (
                        <BasicRow areaProps={areaProps} id="customerName" />
                      )
                    },
                    sortOrder: 5
                  },
                  {
                    component: {
                      default: () => <CommentRow comment={r.comment} />
                    },
                    sortOrder: 10
                  },
                  {
                    component: {
                      default: () => <RatingRow rating={r.rating} />
                    },
                    sortOrder: 15
                  },
                  {
                    component: {
                      default: () => <IsApprovedRow approved={r.approved} />
                    },
                    sortOrder: 20
                  }
                ]}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {reviews.length === 0 && (
        <div className="flex w-full justify-center">
          There is no review to display
        </div>
      )}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

ReviewGrid.propTypes = {
  reviews: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        uuid: PropTypes.string.isRequired,
        rating: PropTypes.number.isRequired,
        approved: PropTypes.bool.isRequired,
        comment: PropTypes.string.isRequired,
        approveApi: PropTypes.string.isRequired,
        unApproveApi: PropTypes.string.isRequired,
        deleteApi: PropTypes.string.isRequired
      })
    ),
    total: PropTypes.number.isRequired,
    currentFilters: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        operation: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
      })
    )
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    reviews (filters: $filters) {
      items {
        reviewId
        uuid
        rating
        customerName
        approved
        comment
        approveApi
        unApproveApi
        deleteApi
        product {
          name
          editUrl
        }
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
