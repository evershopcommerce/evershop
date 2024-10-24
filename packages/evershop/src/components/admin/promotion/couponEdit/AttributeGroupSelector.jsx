import { Card } from '@components/admin/cms/Card';
import Spinner from '@components/common/Spinner';
import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import CheckIcon from '@heroicons/react/outline/CheckIcon';
import { SimplePageination } from '@components/common/SimplePagination';

const SearchQuery = `
  query Query ($filters: [FilterInput!]) {
    attributeGroups(filters: $filters) {
      items {
        attributeGroupId
        uuid
        groupName
      }
      total
    }
  }
`;

function AttributeGroupSelector({
  onSelect,
  onUnSelect,
  selectedIDs,
  closeModal
}) {
  const limit = 10;
  const [inputValue, setInputValue] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [selectedGroups, setSelectedGroups] = React.useState(selectedIDs);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'name', operation: 'eq', value: inputValue },
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: limit.toString() }
          ]
        : [
            { key: 'limit', operation: 'eq', value: limit.toString() },
            { key: 'page', operation: 'eq', value: page.toString() }
          ]
    },
    pause: true
  });

  const selectGroup = async (ID) => {
    try {
      await onSelect(ID);
      setSelectedGroups([...selectedGroups, ID]);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const unSelectGroup = async (ID) => {
    try {
      await onUnSelect(ID);
      setSelectedGroups(selectedGroups.filter((e) => e !== ID));
    } catch (e) {
      toast.error(e.message);
    }
  };

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== null) {
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, [page]);

  const { data, fetching, error } = result;

  if (error) {
    return (
      <p>
        There was an error fetching categories.
        {error.message}
      </p>
    );
  }

  return (
    <Card title="Select Products">
      <div className="modal-content">
        <Card.Session>
          <div>
            <div className="border rounded border-divider mb-8">
              <input
                type="text"
                value={inputValue || ''}
                placeholder="Search attribute groups"
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            {fetching && (
              <div className="p-3 border border-divider rounded flex justify-center items-center">
                <Spinner width={25} height={25} />
              </div>
            )}
            {!fetching && data && (
              <div className="divide-y">
                {data.attributeGroups.items.length === 0 && (
                  <div className="p-3 border border-divider rounded flex justify-center items-center">
                    {inputValue ? (
                      <p>No groups found for query &quot;{inputValue}&rdquo;</p>
                    ) : (
                      <p>You have no groups to display</p>
                    )}
                  </div>
                )}
                {data.attributeGroups.items.map((group) => (
                  <div
                    key={group.uuid}
                    className="grid grid-cols-8 gap-8 py-4 border-divider items-center"
                  >
                    <div className="col-span-5">
                      <h3>{group.groupName}</h3>
                    </div>
                    <div className="col-span-2 text-right">
                      {!selectedGroups.includes(group.attributeGroupId) && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={async (e) => {
                            e.preventDefault();
                            await selectGroup(group.attributeGroupId);
                          }}
                        >
                          Select
                        </button>
                      )}
                      {selectedGroups.includes(group.attributeGroupId) && (
                        <a
                          className="button primary"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            unSelectGroup(group.attributeGroupId);
                          }}
                        >
                          <CheckIcon width={20} height={20} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card.Session>
      </div>
      <Card.Session>
        <div className="flex justify-between gap-8">
          <SimplePageination
            total={data?.attributeGroups.total || 0}
            count={data?.attributeGroups?.items?.length || 0}
            page={page}
            hasNext={limit * page < data?.attributeGroups.total}
            setPage={setPage}
          />
          <Button title="Close" variant="secondary" onAction={closeModal} />
        </div>
      </Card.Session>
    </Card>
  );
}

AttributeGroupSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onUnSelect: PropTypes.func.isRequired,
  selectedIDs: PropTypes.arrayOf(PropTypes.string),
  closeModal: PropTypes.func.isRequired
};

AttributeGroupSelector.defaultProps = {
  selectedIDs: []
};

export default AttributeGroupSelector;
