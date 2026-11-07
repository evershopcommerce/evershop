import { googleAnalyticsHeadScript } from '@components/frontStore/googleAnalytics/googleAnalyticsHead.js';
import React from 'react';

interface GoogleAnalyticsHeadProps {
  setting: {
    gaMeasurementId?: string | null;
    gaConsentDefault?: string | null;
  };
}

/**
 * Loads Google Analytics 4 and sends the page view (`googleAnalyticsHead.ts`),
 * when the store has a valid Measurement ID. `GoogleAnalytics.tsx` (`body`
 * area) then sends the commerce events.
 *
 * Production: the server renders the script in the page head, and the
 * browser runs it while it reads the page, before the page bundle. The sort
 * order puts it after `HeadTags` (5), so a cookie banner among the merchant's
 * head scripts runs first and can set its own consent default. A banner
 * added as a `head` area component needs a sort order below this one.
 *
 * Development: the browser draws the head after the page has loaded
 * (`Head.jsx`), and a script React adds does not run, so the effect adds
 * one that does. The effect never runs in production, where the head area
 * is not hydrated; the script's `__evershopGaLoaded` flag stops a second
 * load.
 */
export default function GoogleAnalyticsHead({
  setting: { gaMeasurementId, gaConsentDefault }
}: GoogleAnalyticsHeadProps) {
  const script = googleAnalyticsHeadScript(gaMeasurementId, gaConsentDefault);

  React.useEffect(() => {
    const w = window as Window & { __evershopGaLoaded?: string };
    if (!script || w.__evershopGaLoaded) {
      return;
    }
    const element = document.createElement('script');
    element.text = script;
    document.head.appendChild(element);
  }, [script]);

  if (!script) {
    return null;
  }
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export const layout = {
  areaId: 'head',
  sortOrder: 50
};

export const query = `
  query Query {
    setting {
      gaMeasurementId
      gaConsentDefault
    }
  }
`;
