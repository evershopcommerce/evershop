const fooList = [
  {
    id: 1,
    name: 'Foo',
    description: 'This is a Foo object'
  },
  {
    id: 2,
    name: 'Bar',
    description: 'This is a Bar object'
  },
  {
    id: 3,
    name: 'Baz',
    description: 'This is a Baz object'
  }
];

export default {
  Query: {
    foo: (root, { id }) => {
      return fooList.find((foo) => foo.id === id);
    },
    foos: () => {
      return fooList;
    }
  },
  Foo: {
    id: (foo) => {
      return foo.id;
    },
    name: (foo) => {
      return foo.name;
    },
    description: (foo) => {
      return foo.description;
    }
  }
};
