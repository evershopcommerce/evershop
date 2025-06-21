import { useAppDispatch, useAppState } from '@components/common/context/app';
import axios from 'axios';
import produce from 'immer';
import PropTypes from 'prop-types';
import React from 'react';

export function HotReload({ hot }) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const appContext = useAppState();
  const { setData } = useAppDispatch();

  React.useEffect(() => {
    hot.subscribe(async (event) => {
      if (event.action === 'serverReloaded') {
        setIsRefreshing(true);
        const url = new URL(document.location);
        url.searchParams.append('fashRefresh', 'true');

        const response = await axios.get(url, {
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

HotReload.propTypes = {
  hot: PropTypes.shape({
    subscribe: PropTypes.func
  }).isRequired
};
