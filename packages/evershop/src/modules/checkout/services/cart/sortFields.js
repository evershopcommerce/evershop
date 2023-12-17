const Topo = require('@hapi/topo');

module.exports.sortFields = (fields) => {
  // Filter the fields.
  const newFields = [];
  fields.forEach((f) => {
    const field = newFields.find((m) => m.key === f.key);
    if (!field) {
      newFields.push(f);
    } else {
      // Push the resolver and dependencies to the existed field
      // Check if resolvers is an array
      const resolvers = f.resolvers || [];
      const dependencies = f.dependencies || [];
      if (!Array.isArray(resolvers)) {
        field.resolvers = [...field.resolvers, resolvers];
      } else {
        field.resolvers = [...field.resolvers, ...resolvers];
      }
      field.dependencies = field.dependencies
        ? [...dependencies, ...field.dependencies]
        : dependencies;
    }
  });
  // // eslint-disable-next-line no-shadow
  // const refinedFields = newFields.filter((f, index, currentArray) => {
  //   if (!f.dependencies) {
  //     return true;
  //   }
  //   const { dependencies } = f;
  //   let flag = true;
  //   // Field will be removed if it's dependency missing
  //   dependencies.forEach((d) => {
  //     if (flag === false || currentArray.findIndex((m) => m.key === d) === -1) {
  //       flag = false;
  //     }
  //   });

  //   return flag;
  // });
  const sorter = new Topo.Sorter();
  newFields.forEach((f) => {
    sorter.add(f.key, { before: [], after: f.dependencies, group: f.key });
  });

  const finalFields = sorter.nodes.map((key) => {
    const index = newFields.findIndex((f) => f.key === key);
    const f = newFields[index];
    return { ...f };
  });

  return finalFields;
};
