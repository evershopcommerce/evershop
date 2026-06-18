import { Button } from '@components/common/ui/Button.js';
import { Card, CardContent } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
      <CardContent>
        {action === undefined && (
          <div>
            <div className="justify-left text-left">
              <div className="space-y-2">
                <div>
                  {_('This product has some variants like color or size?')}
                </div>
                <Button
                  variant={'secondary'}
                  onClick={(e) => {
                    e.preventDefault();
                    setAction('create');
                  }}
                >
                  {_('Create a variant group')}
                </Button>
              </div>
            </div>
          </div>
        )}
        {action === 'create' && (
          <div>
            <CreateVariantGroup
              currentProductUuid={currentProductUuid}
              setGroup={setGroup}
              onCancel={() => setAction(undefined)}
              createVariantGroupApi={createVariantGroupApi}
            />
          </div>
        )}
      </CardContent>
    </>
  );
};
