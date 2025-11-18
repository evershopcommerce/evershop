import { useAppDispatch, useAppState } from '@components/common/context/app.js';
import axios from 'axios';
import { produce } from 'immer';
import React from 'react';

interface HotReloadProps {
  hot: {
    subscribe: (callback: (event: { action: string }) => void) => void;
  };
}

export function HotReload({ hot }: HotReloadProps): React.ReactElement | null {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const appContext = useAppState();
  const { setData } = useAppDispatch();

  React.useEffect(() => {
    hot.subscribe(async (event) => {
      if (event.action === 'serverReloaded') {
        const interval = setInterval(async () => {
          try {
            const response = await axios.get('/', {
              validateStatus(status) {
                return status >= 200 && status <= 500;
              }
            });
            if (response.status === 200) {
              // Server is back, reload the page
              window.location.reload();
              clearInterval(interval);
            }
          } catch (error) {
            // Ignore errors, server might still be down
          }
        }, 300);
      }
    });
  }, []);

  // React.useEffect(() => {
  //   if (isRefreshing) {
  //     // Use preflight request to check if server is back
  //     const interval = setInterval(async () => {
  //       try {
  //         const response = await axios.get('/', {
  //           validateStatus(status) {
  //             return status >= 200 && status <= 500;
  //           }
  //         });
  //         if (response.status === 200) {
  //           // Server is back, reload the page
  //           window.location.reload();
  //           clearInterval(interval);
  //         }
  //       } catch (error) {
  //         // Ignore errors, server might still be down
  //       }
  //     }, 300);
  //   }
  // }, [isRefreshing]);

  return null;
}
