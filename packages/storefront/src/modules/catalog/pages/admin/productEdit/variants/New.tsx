import { Card } from '@components/admin/Card.js';
import React from 'react';
import { CreateVariantGroup } from './CreateVariantGroup.js';

export const New: React.FC<{
  currentProductUuid: string;
  createVariantGroupApi: string;
  setGroup: (group: any) => void;
}> = ({ currentProductUuid, createVariantGroupApi, setGroup }) => {
  const [action, setAction] = React.useState<'create' | undefined>();
  return (
    <>
      <Card.Session>
        {action === undefined && (
          <div>
            <div className="justify-center text-center">
              <div className="mb-10">
                <span className="pr-2">
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
              currentProductUuid={currentProductUuid}
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
};
