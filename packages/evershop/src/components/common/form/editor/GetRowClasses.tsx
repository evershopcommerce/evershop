const getRowClasses = (size: number): string => {
  switch (size) {
    case 1:
      return 'md:grid-cols-1';
    case 2:
      return 'md:grid-cols-2';
    case 3:
      return 'md:grid-cols-3';
    case 4:
      return 'md:grid-cols-4';
    case 5:
      return 'md:grid-cols-5';
    default:
      return 'md:grid-cols-1';
  }
};

export { getRowClasses };
