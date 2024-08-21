const getColumnClasses = (size) => {
  switch (size) {
    case 1:
      return 'col-span-1';
    case 2:
      return 'col-span-2';
    case 3:
      return 'col-span-3';
    default:
      return 'col-span-1';
  }
};

export default getColumnClasses;
