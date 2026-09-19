import React from 'react';

interface GoogleAnalyticsProps {
  setting: {
    gaMeasurementId?: string | null;
  };
}

// GA4 Measurement IDs look like `G-XXXXXXXXXX`. Validating before injection also
// guarantees the id is safe to interpolate into the inline bootstrap script.
const GA4_ID_PATTERN = /^G-[A-Z0-9]+$/i;

/**
 * Loads Google Analytics 4 when a Measurement ID is configured in the store
 * settings. The gtag scripts are injected into `document.head` from a client
 * effect, and the `__evershopGaLoaded` guard keeps a re-mount / re-hydration
 * from double-counting page_view.
 *
 * This component lives in the `body` area, NOT `head`, on purpose. Head-area
 * components are server-rendered but never hydrated on the client in
 * production: `Hydrate`/`HydrateFrontStore` mount only `<Area id="body">`,
 * whereas the dev client renders the whole tree (head included, via `Head`'s
 * portal). An effect on a `head`-area component therefore runs in dev but
 * NEVER in production — which is why GA rendered in dev only. The `body` area
 * is hydrated in both, so the injection effect fires in both.
 */
export default function GoogleAnalytics({
  setting: { gaMeasurementId }
}: GoogleAnalyticsProps) {
  React.useEffect(() => {
    if (!gaMeasurementId || !GA4_ID_PATTERN.test(gaMeasurementId)) {
      return;
    }
    const w = window as unknown as { __evershopGaLoaded?: string };
    if (w.__evershopGaLoaded === gaMeasurementId) {
      return;
    }
    w.__evershopGaLoaded = gaMeasurementId;

    const loader = document.createElement('script');
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      gaMeasurementId
    )}`;
    document.head.appendChild(loader);

    // Google's canonical bootstrap, verbatim (pushes the `arguments` object).
    const inline = document.createElement('script');
    inline.text =
      `window.dataLayer=window.dataLayer||[];` +
      `function gtag(){dataLayer.push(arguments);}` +
      `gtag('js',new Date());` +
      `gtag('config','${gaMeasurementId}');`;
    document.head.appendChild(inline);
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
