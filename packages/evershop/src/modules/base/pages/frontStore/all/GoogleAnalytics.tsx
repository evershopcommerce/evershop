import { toGa4Event } from '@components/frontStore/googleAnalytics/ga4Events.js';
import { isGa4MeasurementId } from '@components/frontStore/googleAnalytics/googleAnalyticsHead.js';
import { onCommerceEvent } from '@evershop/evershop/components/common/commerceEvents';
import React from 'react';

interface GoogleAnalyticsProps {
  setting: {
    gaMeasurementId?: string | null;
  };
}

type GaWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  __evershopGa4Events?: boolean;
};

/**
 * Sends the commerce events (product viewed, added to cart, checkout steps,
 * purchase, ...) to Google Analytics 4 as its ecommerce events
 * (`ga4Events.ts`), when the store has a valid Measurement ID.
 *
 * The page head loads GA4 and sends the page view (`GoogleAnalyticsHead.tsx`),
 * with Google's consent default first, so this component only listens. It
 * runs nothing without a valid id, or without the `gtag()` the head script
 * defines. One listener per page, never removed: it subscribes with replay,
 * so the page's earlier events are sent too, and a second listener (the
 * effect running again, such as after a fast refresh of this file in
 * development) would send them twice.
 *
 * It lives in the `body` area: head-area components are rendered on the
 * server but not hydrated in production, so their effects never run there.
 */
export default function GoogleAnalytics({
  setting: { gaMeasurementId }
}: GoogleAnalyticsProps) {
  React.useEffect(() => {
    const w = window as GaWindow;
    if (
      !isGa4MeasurementId(gaMeasurementId) ||
      typeof w.gtag !== 'function' ||
      w.__evershopGa4Events
    ) {
      return;
    }
    w.__evershopGa4Events = true;
    onCommerceEvent('*', (event) => {
      const ga4Event = toGa4Event(event);
      if (ga4Event) {
        w.gtag?.('event', ga4Event.name, ga4Event.params);
      }
    });
  }, [gaMeasurementId]);

  return null;
}

export const layout = {
  areaId: 'body',
  sortOrder: 1
};

export const query = `
  query Query {
    setting {
      gaMeasurementId
    }
  }
`;
