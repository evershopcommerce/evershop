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
        setIsRefreshing(true);
        const url = new URL(document.location.href);
        url.searchParams.append('fashRefresh', 'true');

        const response = await axios.get(url.toString(), {
          validateStatus(status) {
            return status >= 200 && status <= 500;
          }
        });
        // get the final url incase of redirect
        if (response.request) {
          const finalUrl = response.request.responseURL;
          if (finalUrl !== url.href) {
            window.location.href = finalUrl;
            return;
          }
        }
        if (response.status < 300) {
          setData(
            produce(appContext, (draff) => {
              draff = response.data.eContext;
              return draff;
            })
          );
        } else {
          window.location.reload();
        }
      }
    });
  }, []);

  return isRefreshing ? <div>Refreshing</div> : null;
}
