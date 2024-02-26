import React from "react";

function Logo() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }} >
      <a href="/">
        <img src="/RESYO.PNG" alt="eve" style={{ width: "100px", height: "auto" }} />
      </a>
    </div>
  );
}

export default Logo;

export const layout = {
  areaId: "header",
  sortOrder: 5,
};
