import React from "react";
import "./MainBanner.scss";
import "./tailwind.scss";

function MainBanner() {
  return (
    <div className="main-banner-home page-width flex place-items-start">
      <div className="mt-auto mx-auto mb-4 text-center px-2">
        <a className="button button-primary" href="/all">SHOP NOW</a>
      </div>
    </div>
  );
}

export default MainBanner;

export const layout = {
  areaId: "content",
  sortOrder: 1,
};
