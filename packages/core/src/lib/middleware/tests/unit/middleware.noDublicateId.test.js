const { noDublicateId } = require("../../noDuplicateId");

describe('Test noDublicateId function', () => {
  it('It should return false if routed middlewareID is existed', () => {
    expect(
      noDublicateId([{
        id: 'routeOne',
        routeId: 'home',
      }],
        {
          id: 'routeOne',
          routeId: 'home'
        })
    ).toEqual(false);
  });

  it('It should return false if admin middlewareID is existed', () => {
    expect(
      noDublicateId([{
        id: 'routeOne',
        routeId: 'admin',
      }],
        {
          id: 'routeOne',
          routeId: 'admin'
        })
    ).toEqual(false);
  });

  it('It should return false if site middlewareID is existed', () => {
    expect(
      noDublicateId([{
        id: 'routeOne',
        routeId: null,
      }],
        {
          id: 'routeOne',
          routeId: null
        })
    ).toEqual(false);
  });

  it('It should return false if routeId is null', () => {
    expect(
      noDublicateId([{
        id: 'routeOne',
        routeId: null,
      }],
        {
          id: 'routeOne',
          routeId: 'home'
        })
    ).toEqual(false);
  });

  it('It should return false if routeId is admin', () => {
    expect(
      noDublicateId([{
        id: 'routeOne',
        routeId: 'admin',
      }],
        {
          id: 'routeOne',
          routeId: 'home'
        })
    ).toEqual(false);
  });

  it('It should return false if routeId is site', () => {
    expect(
      noDublicateId([{
        id: 'routeOne',
        routeId: 'site',
      }],
        {
          id: 'routeOne',
          routeId: 'home'
        })
    ).toEqual(false);
  });

  it('It should return true if routeId is different', () => {
    expect(
      noDublicateId([{
        id: 'routeOne',
        routeId: 'home',
      }],
        {
          id: 'routeOne',
          routeId: 'category'
        })
    ).toEqual(true);
  });
});
