import React from "react";

function Logo() {
  return (
    <div className="justify-self-start md:justify-self-center flex items-center">
      <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
        <img src="/emoiologo.webp" alt="E-MOIO" width="150" height="68" />
        <span className="font-bold"> </span>
      </a>
    </div>
  );
}

export default Logo;

export const layout = {
  areaId: "header",
  sortOrder: 5,
};
