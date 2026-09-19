import React from 'react';

interface CopyRightProps {
  themeConfig: {
    copyRight: string;
  };
}
export default function CopyRight({
  themeConfig: { copyRight } = {
    copyRight: '© 2025 Evershop. All Rights Reserved.'
  }
}: CopyRightProps) {
  return (
    <div className="copyright">
      <span>{copyRight}</span>
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
    }
  }
`;
