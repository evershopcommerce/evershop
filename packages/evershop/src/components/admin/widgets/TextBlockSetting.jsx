import React from 'react';
import PropTypes from 'prop-types';
import Editor from '@components/common/form/fields/Editor';

export default function TextBlockSetting({
  text,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}) {
  return (
    <div>
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
  text: PropTypes.string,
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired
};

TextBlockSetting.defaultProps = {
  text: []
};
