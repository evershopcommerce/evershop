const { mkdir, writeFile } = require('fs').promises;
const path = require('path');
const { inspect } = require('util');
const { Componee } = require('@evershop/evershop/src/lib/componee/Componee');
const isProductionMode = require('@evershop/evershop/src/lib/util/isProductionMode');
const {
  getRouteBuildPath
} = require('@evershop/evershop/src/lib/webpack/getRouteBuildPath');

module.exports.createComponents = async function createComponents(
  routes,
  clientOnly = false
) {
  await Promise.all(
    routes.map(async (route) => {
      const components = Componee.getComponentsByRoute(route.id);
      if (!components) {
        return;
      }
      Object.keys(components).forEach((area) => {
        Object.keys(components[area]).forEach((id) => {
          components[area][
            id
          ].component = `---require("${components[area][id].source}")---`;
          delete components[area][id].source;
        });
      });

      let contentClient = `
      import React from 'react';
      import ReactDOM from 'react-dom';
      import Area from '@evershop/evershop/src/lib/components/Area';
      `;
      if (isProductionMode()) {
        contentClient += `import Hydrate from '@evershop/evershop/src/lib/components/react/client/Hydrate';`;
      } else {
        contentClient += `import { App } from '@evershop/evershop/src/lib/components/react/client/Client';
      const hot = require('webpack-hot-middleware/client?path=/eHot/${route.id}&reload=true');
      import { HotReload } from '@evershop/evershop/src/lib/components/react/client/HotReload';
      `;
      }
      contentClient += '\r\n';
      contentClient += `Area.defaultProps.components = ${inspect(components, {
        depth: 5
      })
        .replace(/'---/g, '')
        .replace(/---'/g, '')} `;
      contentClient += '\r\n';
      if (isProductionMode()) {
        contentClient += `ReactDOM.hydrate(
        <Hydrate/>,
        document.getElementById('app')
      );`;
      } else {
        contentClient += `
      ReactDOM.render(<App routeId="${route.id}"><HotReload hot={hot} /></App>, document.getElementById('app'));
      if (module.hot) {
        module.hot.accept();
      }
      `;
      }
      await mkdir(path.resolve(getRouteBuildPath(route), 'client'), {
        recursive: true
      });
      await writeFile(
        path.resolve(getRouteBuildPath(route), 'client', 'components.js'),
        contentClient
      );

      if (!clientOnly) {
        let contentServer = `import React from 'react'; `;
        contentServer += '\r\n';
        contentServer += `import ReactDOM from 'react-dom'; `;
        contentServer += '\r\n';
        contentServer += `import Area from '@evershop/evershop/src/lib/components/Area';`;
        contentServer += '\r\n';
        contentServer += `Area.defaultProps.components = ${inspect(components, {
          depth: 5
        })
          .replace(/'---/g, '')
          .replace(/---'/g, '')} `;

        await mkdir(path.resolve(getRouteBuildPath(route), 'server'), {
          recursive: true
        });
        await writeFile(
          path.resolve(getRouteBuildPath(route), 'server', 'components.js'),
          contentServer
        );
      }
    })
  );
};
