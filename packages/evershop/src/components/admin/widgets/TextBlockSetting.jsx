import { Field } from '@components/common/form/Field';
import Editor from '@components/common/form/fields/Editor';
import PropTypes from 'prop-types';
import React from 'react';

export default function TextBlockSetting({
  textWidget: { text, className },
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}) {
  return (
    <div>
      <Field
        type="text"
        name="settings[className]"
        label="Custom css classes"
        value={className}
        placeholder="Custom css classes"
      />
      <Editor
        name="settings[text]"
        label="Content"
        value={text}
        browserApi={browserApi}
        deleteApi={deleteApi}
        uploadApi={uploadApi}
        folderCreateApi={folderCreateApi}
      />
    </div>
  );
}

TextBlockSetting.propTypes = {
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired,
  textWidget: PropTypes.shape({
    text: PropTypes.array,
    className: PropTypes.string
  })
};

TextBlockSetting.defaultProps = {
  textWidget: {
    text: [],
    className: ''
  }
};

export const query = `
  query Query($text: String, $className: String) {
    textWidget(text: $text, className: $className) {
      text
      className
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;

export const variables = `{
  text: getWidgetSetting("text"),
  className: getWidgetSetting("className")
}`;
