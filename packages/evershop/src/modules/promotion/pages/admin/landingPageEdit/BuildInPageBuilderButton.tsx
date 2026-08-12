import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface BuildInPageBuilderButtonProps {
  landingPage?: {
    pageBuilderUrl?: string | null;
  } | null;
}

/**
 * "Build in page builder" action, rendered in the page-heading's right slot so it
 * sits on one line with the title (instead of a separate row above the form).
 * Scoped to the edit route only — a not-yet-saved page has no page-builder URL.
 */
export default function BuildInPageBuilderButton({
  landingPage
}: BuildInPageBuilderButtonProps) {
  const pageBuilderUrl = landingPage?.pageBuilderUrl;
  if (!pageBuilderUrl) {
    return null;
  }
  return (
    <Button
      variant="outline"
      onClick={() => {
        window.location.href = pageBuilderUrl;
      }}
    >
      {_('Build in page builder')}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    landingPage(id: getContextValue("landingPageId", null)) {
      pageBuilderUrl
    }
  }
`;
