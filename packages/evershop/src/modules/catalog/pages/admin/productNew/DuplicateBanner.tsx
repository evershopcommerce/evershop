import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@components/common/ui/Alert.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { TriangleAlert } from 'lucide-react';
import React from 'react';
import { useFormContext } from 'react-hook-form';

interface DuplicateBannerProps {
  duplicateSource?: {
    uuid: string;
    name: string;
    variantGroupId?: number | null;
  } | null;
}

export default function DuplicateBanner({
  duplicateSource
}: DuplicateBannerProps) {
  const { register } = useFormContext();
  if (!duplicateSource) {
    return null;
  }
  return (
    <Alert className="border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>
        {_('You are creating a copy of ${name}', {
          name: duplicateSource.name
        })}
      </AlertTitle>
      <AlertDescription className="col-start-2 text-amber-800 dark:text-amber-300">
        <p>
          {_(
            'Nothing is duplicated yet — hit Save to complete the duplication. Leaving this page without saving discards the copy.'
          )}
        </p>
        {duplicateSource.variantGroupId ? (
          <p>
            {_(
              "The copy is created as a standalone product — it does not join the source's variant group. Add it from the copy's edit page if needed."
            )}
          </p>
        ) : null}
      </AlertDescription>
      <input
        type="hidden"
        {...register('duplicate_of')}
        value={duplicateSource.uuid}
      />
    </Alert>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 5
};

export const query = `
  query Query {
    duplicateSource: product(id: getContextValue("duplicateSourceId", null)) {
      uuid
      name
      variantGroupId
    }
  }
`;
