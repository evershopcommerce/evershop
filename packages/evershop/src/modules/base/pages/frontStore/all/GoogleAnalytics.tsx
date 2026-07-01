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
 * settings. Injection happens client-side in an effect — not as SSR'd <script>
 * tags — so it runs identically in dev (client render) and prod (SSR), and the
 * one-time guard keeps a re-mount / re-hydration from double-counting page_view.
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
  areaId: 'head',
  sortOrder: 1
};

export const query = `
  query Query {
    setting {
      gaMeasurementId
    }
  }
`;
