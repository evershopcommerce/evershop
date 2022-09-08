import React from 'react';
import { get } from '../../../../../../../lib/util/get';
import { useAppState } from '../../../../../../../lib/context/app';
import { Card } from '../../../../../../cms/views/admin/Card';
import { New } from './New';
import { Edit } from './Edit';

export default function VariantGroup() {
  const variantGroupId = get(useAppState(), 'product.variant_group_id');
  return (
    <Card
      title="Variant"
    >
      {!variantGroupId && <New />}
      {variantGroupId && (
        <div>
          <input type="hidden" value={variantGroupId} name="variant_group[variant_group_id]" />
          <Edit />
        </div>
      )}
    </Card>
  );
}
