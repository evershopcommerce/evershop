import { useAppState } from '@components/common/context/app';
import { get } from '@evershop/evershop/src/lib/util/get';
import React, { useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import './Notification.scss';

export default function Notification() {
  const notify = (type, message) => toast[type]?.(message) ?? toast(message);
  const context = useAppState();

  useEffect(() => {
    get(context, 'notifications', []).forEach((n) => notify(n.type, n.message));
  }, []);

  return (
    <div>
      <ToastContainer hideProgressBar autoClose={false} />
    </div>
  );
}
