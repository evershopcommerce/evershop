import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import Badge from '../../../../../../lib/components/Badge';

export default function PaymentStatus() {
  const context = useAppState();
  const status = get(context, 'paymentStatus', []).find((s) => s.code === get(context, 'order.payment_status'));

  if (status) {
    return <Badge variant={status.badge} title={status.name} progress={status.progress} />;
  } else { return null; }
}
