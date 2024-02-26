import React from "react";
import "./tailwind.scss";

function Quote() {
  return (
    <img className="mx-auto mt-3 w-[800px] border" src="/yeats_quote.png" />
  );
}

export default Quote;

export const layout = {
  areaId: "content",
  sortOrder: 3,
};
