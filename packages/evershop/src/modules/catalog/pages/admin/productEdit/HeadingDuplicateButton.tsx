import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Copy } from 'lucide-react';
import React from 'react';
import { DUPLICATE_PRODUCT_EVENT } from './ProductEditForm.js';

/**
 * Duplicate action in the page heading. Lives outside the form provider, so
 * it only dispatches the event — FormButton (inside the form) listens and
 * runs the guarded duplicate flow (unsaved-changes check + navigation).
 */
export default function HeadingDuplicateButton() {
  return (
    <Button
      variant="outline"
      onClick={() => {
        document.dispatchEvent(new Event(DUPLICATE_PRODUCT_EVENT));
      }}
    >
      <Copy className="h-4 w-4" />
      {_('Duplicate')}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};
