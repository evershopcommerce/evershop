const path = require('path');
const { scanRouteComponents } = require('../../scanForComponents');

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
      'all/Menu.jsx': path.resolve(
        __dirname,
        './__mocks__/modules/firstModule/pages/frontStore/all/Menu.jsx'
      ),
      'all/Banner.jsx': path.resolve(
        __dirname,
        './__mocks__/extensions/firstExtension/pages/frontStore/all/Banner.jsx'
      ),
      'all/CommentList.jsx': path.resolve(
        __dirname,
        './__mocks__/extensions/firstExtension/pages/frontStore/all/CommentList.jsx'
      )
    });
  });

  it('It should get the component from extension when the component is dublicated with the one in core module', () => {
    const components = scanRouteComponents(
      { id: 'productView', isAdmin: false },
      [...modules, ...extensions],
      themePath
    );

    expect(components['productView/Price.jsx']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/extensions/firstExtension/pages/frontStore/productView/Price.jsx'
      )
    );
  });

  it('It should get the component from higher priority extension when the component is dublicated', () => {
    const components = scanRouteComponents(
      { id: 'productView', isAdmin: false },
      [...modules, ...extensions],
      themePath
    );

    expect(components['productView/Name.jsx']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/extensions/firstExtension/pages/frontStore/productView/Name.jsx'
      )
    );
  });

  it('It should get the components theme, theme should be higest priority', () => {
    const components = scanRouteComponents(
      { id: 'productView', isAdmin: false },
      [...modules, ...extensions],
      path.resolve(__dirname, './__mocks__/themes/justatheme')
    );

    expect(components['all/Shipping.jsx']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/all/Shipping.jsx'
      )
    );

    expect(components['all/CommentList.jsx']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/all/CommentList.jsx'
      )
    );

    expect(components['productView/Name.jsx']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/productView/Name.jsx'
      )
    );

    expect(components['productView/Price.jsx']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/productView/Price.jsx'
      )
    );

    expect(components['productView/OutOfStock.jsx']).toEqual(
      path.resolve(
        __dirname,
        './__mocks__/themes/justatheme/pages/productView/OutOfStock.jsx'
      )
    );
  });
});
