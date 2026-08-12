export default {
  OrderItem: {
    packageDimensions: (item: Record<string, unknown>) => {
      const length = Number(item.packageLength ?? item.package_length);
      const width = Number(item.packageWidth ?? item.package_width);
      const height = Number(item.packageHeight ?? item.package_height);
      if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0) {
        return null;
      }
      return {
        length,
        width,
        height: Number.isFinite(height) ? height : 0
      };
    }
  }
};
