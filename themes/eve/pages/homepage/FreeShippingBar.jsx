import React from "react";

function FreeShippingBar() {
  return (
    <div className="page-width">
      <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x border-divider border my-3">
        <div className="p-2 border-divider">
          <h2>Worldwide Shipping</h2>
          <p>Ship from China, to everywhere</p>
        </div>
        <div className="p-2 border-divider">
          <h2>Best Price</h2>
          <p>We offer the best prices on all our products.</p>
        </div>
        <div className="p-2 border-divider">
          <h2>Customization</h2>
          <p>Customization Orders Welcome</p>
        </div>
      </div>
    </div>
  );
}

export default FreeShippingBar;

export const layout = {
  areaId: "content",
  sortOrder: 2,
};
