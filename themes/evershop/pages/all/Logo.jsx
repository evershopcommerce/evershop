import React from "react";

function Logo() {
  return (
    <div className="justify-self-start md:justify-self-center flex items-center">
      <a href="/">
        <img className="h-5" src="/dagaz.svg" alt="New Day Artistry" />
      </a>
    </div>
  );
}

export default Logo;

export const layout = {
  areaId: "header",
  sortOrder: 5,
};
