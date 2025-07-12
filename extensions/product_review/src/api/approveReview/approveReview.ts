import { getConnection } from "@evershop/evershop/lib/postgres";
import {
  commit,
  rollback,
  select,
  startTransaction,
  update,
} from "@evershop/postgres-query-builder";

export default async function graphql(request, response, next) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { id } = request.params;
    const review = await select()
      .from("product_review")
      .where("uuid", "=", id)
      .load(connection);
    if (!review) {
      throw new Error("Review not found");
    }
    await update("product_review")
      .given({
        approved: true,
      })
      .where("uuid", "=", id)
      .execute(connection);
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
