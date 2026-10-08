import Area from '@components/common/Area.js';
import React from 'react';
import {
  getAddressFieldRenderer,
  type AddressFieldProps
} from './addressFieldRenderers.js';

/**
 * One Area per field: `addressField.<id>` (spec § 3.9), with the core renderer
 * at sortOrder 10. An extension decorates or replaces a single field by
 * registering into that Area (sortOrder 5 above, 15 below) — the same
 * mechanism as every other Area, so it works on all three surfaces.
 */
export function MasterField(props: AddressFieldProps) {
  const Renderer = getAddressFieldRenderer(props.field.type);
  return (
    <Area
      id={`addressField.${props.field.id}`}
      noOuter
      coreComponents={[
        {
          id: `addressField.${props.field.id}.core`,
          component: { default: Renderer },
          props,
          sortOrder: 10
        }
      ]}
    />
  );
}
