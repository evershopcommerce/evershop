export interface MetaDataUpdate {
  sql: string;
  params: unknown[];
}

/**
 * Build the UPDATE for writing one metafield into a `meta_data` JSONB column.
 *
 * A defined value merges via `jsonb_set`, creating the namespace object if
 * missing. `undefined` — validateMetafield's cleaned form of a blank optional
 * value — REMOVES the key with `#-` instead of storing a JSON null residue
 * (`#-` is a no-op on missing paths; every meta_data column is NOT NULL
 * DEFAULT '{}').
 *
 * The key param inside `jsonb_build_object` carries an explicit `::text`
 * cast: the function is VARIADIC "any", so a parameter appearing only there
 * gives Postgres nothing to infer its type from and the statement fails at
 * parse time with `could not determine data type of parameter $N`.
 */
export function buildMetaDataUpdate(opts: {
  /** Unquoted table name; quoted here so reserved words ("order") are safe. */
  table: string;
  /** WHERE clause consuming $1..$n for opts.idParams (e.g. 'product_id = $1'). */
  whereClause: string;
  idParams: unknown[];
  namespace: string;
  key: string;
  /** The value returned by validateMetafield; undefined removes the key. */
  validated: unknown;
}): MetaDataUpdate {
  const { table, whereClause, idParams, namespace, key, validated } = opts;
  const ns = idParams.length + 1;
  const k = idParams.length + 2;
  const v = idParams.length + 3;
  if (validated === undefined) {
    return {
      sql: `UPDATE "${table}"
        SET meta_data = meta_data #- ARRAY[$${ns}::text, $${k}::text]
      WHERE ${whereClause}`,
      params: [...idParams, namespace, key]
    };
  }
  return {
    sql: `UPDATE "${table}"
        SET meta_data = jsonb_set(
              meta_data,
              ARRAY[$${ns}],
              COALESCE(meta_data -> $${ns}, '{}'::jsonb) || jsonb_build_object($${k}::text, $${v}::jsonb),
              true)
      WHERE ${whereClause}`,
    params: [...idParams, namespace, key, JSON.stringify(validated)]
  };
}
