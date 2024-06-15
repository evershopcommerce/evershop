import PropTypes from 'prop-types';
import React from 'react';
import { Card } from '@components/admin/cms/Card';
import { CreateVariantGroup } from '@components/admin/catalog/productEdit/variants/CreateVariantGroup';

export function New({ createVariantGroupApi, setGroup }) {
  const [action, setAction] = React.useState(undefined);
  return (
    <>
      <Card.Session>
        {action === undefined && (
          <div>
            <div className="justify-center text-center">
              <div className="mb-16">
                <span className="pr-4">
                  This product has some variants like color or size?
                </span>
                <a
                  className="text-interactive hover:underline"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setAction('create');
                  }}
                >
                  Create a variant group
                </a>
              </div>
            </div>
          </div>
        )}
        {action === 'create' && (
          <div>
            <CreateVariantGroup
              setGroup={setGroup}
              createVariantGroupApi={createVariantGroupApi}
            />
          </div>
        )}
      </Card.Session>
      {action === 'create' && (
        <Card.Session>
          <a
            className="text-critical hover:underline"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setAction(undefined);
            }}
          >
            Cancel
          </a>
        </Card.Session>
      )}
    </>
  );
}

New.propTypes = {
  createVariantGroupApi: PropTypes.string.isRequired,
  setGroup: PropTypes.func.isRequired
};
