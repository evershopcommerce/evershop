import React from "react";

function FeaturedCategories() {
  return (
    <div className="page-width">
      <img className="mx-auto my-3 w-[300px]" src="/categories.png"></img>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="relative col-span-1 row-span-2 men-cat">
          <a href="/pottery">
            <img src="/category_pottery.png" alt="Shop pottery" />
            <span className="absolute underline top-[20px] left-[20px] bg-white px-2">
              SHOP NOW
            </span>
          </a>
        </div>
        <div className="relative col-span-1 row-span-1 women-cat">
          <a href="/soap">
            <img src="/category_soap.png" alt="Shop soap" />
            <span className="absolute underline top-[20px] left-[20px] bg-white px-2">
              SHOP NOW
            </span>
          </a>
        </div>
        <div className="relative col-span-1 row-span-1 kid-cat">
          <a href="/stickers">
            <img src="/category_stickers.png" alt="Shop stickers" />
            <span className="absolute underline top-[20px] left-[20px] bg-white px-2">
              SHOP NOW
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default FeaturedCategories;

export const layout = {
  areaId: "content",
  sortOrder: 5,
};
