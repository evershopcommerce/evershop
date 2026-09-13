import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Home } from 'lucide-react';
import React, { useState } from 'react';
import { ReplaceHomepageDialog } from './ReplaceHomepageDialog.js';

interface ReplaceHomepageButtonProps {
  landingPage?: {
    name?: string;
    replaceHomepagePreflightApi?: string | null;
    replaceHomepageApi?: string | null;
  } | null;
}

/**
 * "Replace homepage with this page" — page-heading right slot, next to
 * "Build in page builder". Opens the preflight dialog; the action itself is
 * a two-step API call (GET preflight → POST execute with fingerprints). See
 * specifications/replace-homepage-with-landing-page.md §1, §10.
 */
export default function ReplaceHomepageButton({
  landingPage
}: ReplaceHomepageButtonProps) {
  const [open, setOpen] = useState(false);
  if (!landingPage?.replaceHomepageApi || !landingPage.replaceHomepagePreflightApi) {
    return null;
  }
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Home className="size-4" aria-hidden="true" />
        {_('Replace homepage with this page')}
      </Button>
      {open && (
        <ReplaceHomepageDialog
          open={open}
          onOpenChange={setOpen}
          landingPageName={landingPage.name ?? ''}
          preflightApi={landingPage.replaceHomepagePreflightApi}
          replaceApi={landingPage.replaceHomepageApi}
        />
      )}
    </>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 20
};

export const query = `
  query Query {
    landingPage(id: getContextValue("landingPageId", null)) {
      name
      replaceHomepagePreflightApi
      replaceHomepageApi
    }
  }
`;
