import React from "react";
import Area from "../../../../lib/components/area";
import { A } from './aaaaaaaaaaaaaaaaaaaaaaaa'

export default function SiteLayout() {
  return <div className="container-wrapper">
    <div className="header">
      <div className="container"><Area id="header" noOuter={true} /></div>
    </div>
    <div className="content">
      <div className="content-top">
        <Area id="contentTop" />
      </div>
      <div className="content-middle container" >
        <div className="row">
          <Area id="leftColumn" className="col-12 col-md-3 left-column" />
          <Area id="contentMiddle" className="col-12 col-expand center-column" />
          <Area id="rightColumn" className="col-12 col-md-3 left-column" />
        </div>
      </div>
      <div className="content-bottom">
        <Area id="contentBottom" />
      </div>
    </div>
    <div className="footer"><div className="copyright"><span>Copyright © 2020 Nodejscart</span></div><div className="version"><span>Version 1.0 dev</span></div></div>
  </div>
}