import { pool, getConnection } from "@evershop/evershop/lib/postgres";
import {
  commit,
  del,
  rollback,
  select,
  startTransaction,
} from "@evershop/postgres-query-builder";

export default async function (request, response, next) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { id } = request.params;
    const review = await select()
      .from("product_review")
      .where("uuid", "=", id)
      .load(pool);
    if (!review) {
      throw new Error("Review not found");
    }
    // Insert the comment into the database
    await del("product_review").where("uuid", "=", id).execute(pool);
    await commit(connection);
    response.$body = {
      data: review,
    };
    next();
  } catch (error) {
    await rollback(connection);
    next(error);
  }
}
