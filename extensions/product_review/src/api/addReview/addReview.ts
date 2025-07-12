import { pool } from "@evershop/evershop/lib/postgres";
import { insert } from "@evershop/postgres-query-builder";

export default async function (request, response, next) {
  try {
    const {
      body: { product_id, customer_name, rating, comment },
    } = request;

    // Make sure rating is between 1 and 5
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    // Insert the comment into the database
    const review = await insert("product_review")
      .given({
        product_id,
        rating,
        customer_name,
        comment,
      })
      .execute(pool);
    response.$body = {
      data: review,
    };
    next();
  } catch (error) {
    next(error);
  }
}
