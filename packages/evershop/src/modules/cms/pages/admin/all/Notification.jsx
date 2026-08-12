import { useAppState } from '@components/common/context/app';
import { Toaster, toast } from '@components/common/ui/Sonner.js';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';

export default function Notification() {
  const notify = (type, message) => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast.info(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      default:
        toast(message);
    }
  };
  const context = useAppState();

  React.useEffect(() => {
    get(context, 'notifications', []).forEach((n) => notify(n.type, n.message));
  }, []);

  return (
    <div>
      <Toaster />
    </div>
  );
}

export const layout = {
  areaId: 'body',
  sortOrder: 10
};
