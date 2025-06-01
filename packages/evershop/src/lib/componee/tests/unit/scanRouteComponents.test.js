import path from 'path';
import { scanRouteComponents } from '../../scanForComponents.js';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test scanRouteComponents function', () => {
  const modules = [
    {
      path: path.resolve(__dirname, './__mocks__/modules/firstModule'),
      name: 'firstModule'
    },
    {
      path: path.resolve(__dirname, './__mocks__/modules/secondModule'),
      name: 'secondModule'
    }
  ];

  const extensions = [
    {
      path: path.resolve(__dirname, './__mocks__/extensions/secondExtension'),
      name: 'secondExtension',
      priority: 2
    },
    {
      path: path.resolve(__dirname, './__mocks__/extensions/firstExtension'),
      name: 'firstExtension',
      priority: 1
    }
  ];

  const themePath = path.resolve(__dirname, './__mocks__/themes/justathemes');

  it('It should return an object', () => {
    const components = scanRouteComponents(
      { id: 'home', isAdmin: false },
      [...modules, ...extensions],
      themePath
    );

    expect(components).toBeInstanceOf(Object);
  });

  it('It should get only `all` component if route does not exist', () => {
    const components = scanRouteComponents(
      { id: 'home', isAdmin: false },
      [...modules, ...extensions],
      themePath
    );

    expect(components).toEqual({
      'all/Menu.js': path.resolve(
        __dirname,
        './__mocks__/modules/firstModule/pages/frontStore/all/Menu.js'
      ),
      'all/Banner.js': path.resolve(
        __dirname,
        './__mocks__/extensions/firstExtension/pages/frontStore/all/Banner.js'
      ),
      'all/CommentList.js': path.resolve(
        __dirname,
        './__mocks__/extensions/firstExtension/pages/frontStore/all/CommentList.js'
      )
    });
  });

  it('It should get the component from extension when the component is dublicated with the one in core module', () => {
    const components = scanRouteComponents(
      { id: 'productView', isAdmin: false },
      [...modules, ...extensions],
      themePath
    );

    expect(components['productView/Price.js']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/extensions/firstExtension/pages/frontStore/productView/Price.js'
      )
    );
  });

  it('It should get the component from higher priority extension when the component is dublicated', () => {
    const components = scanRouteComponents(
      { id: 'productView', isAdmin: false },
      [...modules, ...extensions],
      themePath
    );

    expect(components['productView/Name.js']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/extensions/firstExtension/pages/frontStore/productView/Name.js'
      )
    );
  });

  it('It should get the components theme, theme should be higest priority', () => {
    const components = scanRouteComponents(
      { id: 'productView', isAdmin: false },
      [...modules, ...extensions],
      path.resolve(__dirname, './__mocks__/themes/justatheme')
    );

    expect(components['all/Shipping.js']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/all/Shipping.js'
      )
    );

    expect(components['all/CommentList.js']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/all/CommentList.js'
      )
    );

    expect(components['productView/Name.js']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/productView/Name.js'
      )
    );

    expect(components['productView/Price.js']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/productView/Price.js'
      )
    );

    expect(components['productView/OutOfStock.js']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/productView/OutOfStock.js'
      )
    );
  });
});
