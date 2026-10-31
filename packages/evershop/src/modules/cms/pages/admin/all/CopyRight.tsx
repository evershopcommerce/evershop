import { PoweredByEverShop } from '@components/common/PoweredByEverShop.js';
import React from 'react';

interface CopyRightProps {
  themeConfig: {
    copyRight: string;
    showPoweredBy?: boolean;
  };
}
export default function CopyRight({
  themeConfig: { copyRight, showPoweredBy = false } = {
    copyRight: `© ${new Date().getFullYear()} EverShop`
  }
}: CopyRightProps) {
  return (
    <div className="copyright">
      <span>{copyRight}</span>
      {showPoweredBy && (
        <>
          <span aria-hidden="true">{' · '}</span>
          <PoweredByEverShop
            utmSource="footer_admin"
            className="underline-offset-4 hover:underline"
          />
        </>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'footerLeft',
  sortOrder: 10
};

export const query = `
  query query {
    themeConfig {
      copyRight
      showPoweredBy
    }
  }
`;
