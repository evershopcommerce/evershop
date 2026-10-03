import Area from '@components/common/Area.js';
import React from 'react';

/**
 * Prints an address from `formatted` (spec § 3.6): the display lines the
 * server renders for the address's country and the request locale, so no
 * summary names fields and a line can never be dropped again (§ 1.2 #4). The
 * telephone follows on its own line. Shared by the storefront (address book,
 * checkout success) and the admin order view; stays inside Area
 * `addressSummary` so the two slots (`formatted`, `telephone`) can be
 * decorated or replaced.
 */
export interface AddressSummaryAddress {
  formatted?: string[] | null;
  telephone?: string | null;
  [key: string]: unknown;
}

function FormattedLines({ formatted }: { formatted: string[] }) {
  return (
    <div className="address-lines">
      {formatted.map((line, index) => (
         
        <div key={index}>{line}</div>
      ))}
    </div>
  );
}

function Telephone({ telephone }: { telephone?: string | null }) {
  return telephone ? <div className="telephone">{telephone}</div> : null;
}

export function AddressSummary({
  address
}: {
  address?: AddressSummaryAddress | null;
}) {
  const formatted = Array.isArray(address?.formatted) ? address.formatted : [];
  return (
    <Area
      id="addressSummary"
      className="address__summary"
      coreComponents={[
        {
          id: 'formatted',
          component: { default: FormattedLines },
          props: { formatted },
          sortOrder: 10
        },
        {
          id: 'telephone',
          component: { default: Telephone },
          props: { telephone: address?.telephone },
          sortOrder: 60
        }
      ]}
    />
  );
}

export default AddressSummary;
