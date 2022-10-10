import React from "react";
import produce from 'immer';
import axios from 'axios';
import { useAppDispatch, useAppState } from '../../../context/app';

export const HotReload = ({ hot }) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const appContext = useAppState();
  const appDispatch = useAppDispatch();

  React.useEffect(() => {
    hot.subscribe(async function (event) {
      if (event.action === 'serverReloaded') {
        setIsRefreshing(true);
        let url = new URL(document.location);
        url.searchParams.append('fashRefresh', 'true');

        const response = await axios.get(url, {
          validateStatus: function (status) {
            return status >= 200 && status <= 500;
          }
        });
        if (response.status < 300) {
          appDispatch(produce(appContext, (draff) => {
            // eslint-disable-next-line no-param-reassign
            draff = response.data.eContext;
            return draff;
          }));
        } else {
          location.reload();
        }
      }
    }
    );
  }, []);

  return isRefreshing ? <div>Refreshing</div> : null;
};