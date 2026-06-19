interface ParcelJson {
  packageUuid?: string | null;
  name?: string | null;
  length?: number;
  width?: number;
  height?: number;
  tareWeight?: number;
  goodsWeight?: number;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default {
  Cart: {
    packages: (cart: Record<string, unknown>) => {
      // `cart.packages` is a JSONB column — pg parses it to a JS array. Carts
      // saved before the feature have NULL.
      const raw = (cart.packages ?? []) as ParcelJson[];
      return Array.isArray(raw) ? raw : [];
    }
  },
  CartParcel: {
    name: (parcel: ParcelJson) => parcel.name ?? null,
    dimensions: (parcel: ParcelJson) => ({
      length: num(parcel.length),
      width: num(parcel.width),
      height: num(parcel.height)
    }),
    // Raw values handed to the Weight type (store weight unit).
    tareWeight: (parcel: ParcelJson) => num(parcel.tareWeight),
    goodsWeight: (parcel: ParcelJson) => num(parcel.goodsWeight)
  },
  CartItem: {
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
