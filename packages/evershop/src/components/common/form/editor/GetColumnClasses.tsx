const getColumnClasses = (size: number): string => {
  switch (size) {
    case 1:
      return 'md:col-span-1';
    case 2:
      return 'md:col-span-2';
    case 3:
      return 'md:col-span-3';
    default:
      return 'md:col-span-1';
  }
};

export { getColumnClasses };
