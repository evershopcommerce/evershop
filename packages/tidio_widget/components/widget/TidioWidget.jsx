import React, { useEffect } from 'react';
import PropTypes from 'prop-types';



export default function TidioWidget({ tidioWidget: { text } }) {

  let src = extractSrcValue(text);
  useEffect(() => {
    if (src) {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
      return () => {
        // 卸载组件时移除脚本
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <></>
  );
}

TidioWidget.propTypes = {
  text: PropTypes.string,
};

TidioWidget.defaultProps = {
  text: '',
};

export const query = `
  query Query($settings: JSON) {
    tidioWidget(settings: $settings) {
      text
    }
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;


/**
 * 从 <script> 标签中提取 src 的值
 * @param {string} scriptTag - 包含 <script> 标签的字符串
 * @returns {string|null} - 返回 src 的值，如果未匹配则返回 null
 */
function extractSrcValue(scriptTag) {
  // 使用正则表达式匹配并提取 src 的值（带引号和不带引号两种情况）
  const match = scriptTag.match(/src=\\"([^"]+)\\"/) || scriptTag.match(/src="([^ ]+)"/);

  // 如果匹配成功，返回 src 的值；否则返回 null
  return match ? match[1] : null;
}
