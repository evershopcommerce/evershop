import PropTypes from 'prop-types';
import React from 'react';
import produce from 'immer';
import axios from 'axios';
import { useAppDispatch, useAppState } from '@components/common/context/app';

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
        if (response.status < 300) {
          setData(
            produce(appContext, (draff) => {
              // eslint-disable-next-line no-param-reassign
              draff = response.data.eContext;
              return draff;
            })
          );
        } else {
          // eslint-disable-next-line no-restricted-globals
          location.reload();
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
