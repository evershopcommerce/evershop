import React from 'react';
import { Card } from '../../../../../cms/components/admin/Card';
import { CreateVariantGroup } from './CreateVariantGroup';

export function New() {
  const [action, setAction] = React.useState(undefined);
  return (
    <>
      <Card.Session>
        {action === undefined && (
          <div>
            <div className="justify-center text-center">
              <div className="mb-4">
                <span className="pr-1">This product has some variants like color or size?</span>
                <a className="text-interactive hover:underline" href="#" onClick={(e) => { e.preventDefault(); setAction('create'); }}>Create a variant group</a>
              </div>
            </div>
          </div>
        )}
        {action === 'create' && (
          <div>
            <CreateVariantGroup />
          </div>
        )}
      </Card.Session>
      {action === 'create' && (
        <Card.Session>
          <a className="text-critical hover:underline" href="#" onClick={(e) => { e.preventDefault(); setAction(undefined); }}>Cancel</a>
        </Card.Session>
      )}
    </>
  );
}
