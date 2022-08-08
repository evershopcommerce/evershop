const { mkdir, writeFile } = require('fs').promises;
const path = require('path');
const { inspect } = require('util');
const { Componee } = require('../../src/lib/componee/Componee');
const { getRouteBuildPath } = require('../../src/lib/webpack/getRouteBuildPath');

module.exports.createComponents = async function createComponents(routes) {
  await Promise.all(routes.map(async (route) => {
    const components = Componee.getComponentsByRoute(route.id);
    if (!components) { return; }
    Object.keys(components).forEach((area) => {
      Object.keys(components[area]).forEach((id) => {
        components[area][id].component = `---require("${components[area][id].source}")---`;
        delete components[area][id].source;
      });
    });

    let contentClient = `
import React from 'react';
import ReactDOM from 'react-dom';
import Area from "@evershop/core/src/lib/components/Area";
import { App } from "@evershop/core/src/lib/components/react/Client";
const hot = require('webpack-hot-middleware/client?path=/eHot/${route.id}&reload=true');
import axios from 'axios';
import { store } from '@evershop/core/src/lib/components/redux/store';
import { hotUpdate } from '@evershop/core/src/lib/components/redux/pageDataSlice';
import { Provider } from 'react-redux';
    `;
    contentClient += '\r\n';
    contentClient += `Area.defaultProps.components = ${inspect(components, { depth: 5 }).replace(/'---/g, '').replace(/---'/g, '')}`;
    contentClient += '\r\n';
    contentClient += `
      hot.subscribe(async function (event) {
        if (event.action === 'serverReloaded') {
          let url = new URL(document.location);
          url.searchParams.append('fashRefresh', 'true');

          const response = await axios.get(url, {
            validateStatus: function (status) {
              return status >= 200 && status <= 500;
            }
          });
          if (response.status < 300) {
            store.dispatch(hotUpdate({
              eContext: response.data.eContext,
            }));
          } else {
            location.reload();
          }
        }
      }
      );

      ReactDOM.render(<Provider store={store}><App routeId="${route.id}" /></Provider>, document.getElementById('app'));
      if (module.hot) {
        module.hot.accept();
      }
    `;

    let contentServer = `import React from 'react';`;
    contentServer += '\r\n';
    contentServer += `import ReactDOM from 'react-dom';`;
    contentServer += '\r\n';
    contentServer += 'import Area from "@evershop/core/src/lib/components/Area";';
    contentServer += '\r\n';
    contentServer += `Area.defaultProps.components = ${inspect(components, { depth: 5 }).replace(/'---/g, '').replace(/---'/g, '')}`;

    await mkdir(path.resolve(getRouteBuildPath(route), 'client'), { recursive: true });
    await mkdir(path.resolve(getRouteBuildPath(route), 'server'), { recursive: true });

    await writeFile(path.resolve(getRouteBuildPath(route), 'client', 'components.js'), contentClient);
    await writeFile(path.resolve(getRouteBuildPath(route), 'server', 'components.js'), contentServer);
  }));
}