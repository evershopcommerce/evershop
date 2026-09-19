import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';

interface PackageRowCamel {
  packageId: number;
  uuid: string;
  name: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  isDefault: boolean;
}

export default {
  Query: {
    packages: async (): Promise<PackageRowCamel[]> => {
      const rows = await select()
        .from('package')
        .orderBy('is_default', 'DESC')
        .execute(pool);
      return rows.map((row) => camelCase(row) as PackageRowCamel);
    },
    package: async (
      _: unknown,
      { id }: { id: string }
    ): Promise<PackageRowCamel | null> => {
      const row = await select()
        .from('package')
        .where('uuid', '=', id)
        .load(pool);
      return row ? (camelCase(row) as PackageRowCamel) : null;
    }
  },
  Package: {
    length: ({ length }: PackageRowCamel): number => parseFloat(length),
    width: ({ width }: PackageRowCamel): number => parseFloat(width),
    height: ({ height }: PackageRowCamel): number => parseFloat(height),
    // Raw value handed to the existing `Weight` type (value/unit/text in the
    // store's weight unit) — tare rides the same formatting as item weights.
    weight: ({ weight }: PackageRowCamel): string => weight,
    updateApi: ({ uuid }: PackageRowCamel): string =>
      buildUrl('updatePackage', { id: uuid }),
    deleteApi: ({ uuid }: PackageRowCamel): string =>
      buildUrl('deletePackage', { id: uuid })
  }
};
