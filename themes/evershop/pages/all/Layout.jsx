import React from "react";
import Area from "@components/common/Area";
import LoadingBar from "@components/common/LoadingBar";
import "../../css/global.scss";
import "./Layout.scss";
import "./tailwind.scss";
import Banner from "./Banner"

export default function Layout() {
  return (
    <>
      <LoadingBar />
      <Banner message={<><strong>FREE SHIPPING</strong> on all orders!</>} />
      <header className="2xl:px-[50px] border-b border-header-border">
        <div className="page-width grid grid-cols-2 md:grid-cols-3 h-6">
          <Area
            id="header"
            noOuter
            coreComponents={[
              {
                component: { default: Area },
                props: {
                  id: "icon-wrapper",
                  className: "icon-wrapper flex justify-self-end justify-end space-x-1",
                },
                sortOrder: 20,
              },
            ]}
          />
        </div>
      </header>
      <main className="content">
        <Area id="content" className="" noOuter />
      </main>
      <div className="footer">
        <div className="page-width grid grid-cols-1 xl:grid-cols-3 gap-2 justify-between">
          <div>
            <div className="card-icons flex justify-center space-x-1 xl:justify-start">
              <div>
                <a href="mailto:support@evershop.com">
                  <img src="/email.png" />
                </a>
              </div>
              <div>
                <a href="https://tiktok.com/@evershop/">
                  <img src="/tiktok.svg" />
                </a>
              </div>
              <div>
              <a href="https://www.instagram.com/evershop/">
                  <img src="/instagram.svg" />
                </a>
              </div>
            </div>
          </div>
          <div className="self-center">
            <div className="copyright text-center text-textSubdued">
              <span>Copyright © 2023 New Day Artistry</span>
            </div>
          </div>
          <div className="copyright self-center text-center xl:text-right text-textSubdued">
            <a href="https://evershop.io/">Powered by Evershop</a>
          </div>
        </div>
      </div>
    </>
  );
}

export const layout = {
  areaId: "body",
  sortOrder: 1,
};
