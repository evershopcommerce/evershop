CKEDITOR.plugins.add('nodejscartimages', {
    icons: 'nodejscartimages',
    init: function (editor) {
        editor.addCommand('openFileBrowser', {
            exec: function (editor) {
                PubSub.publishSync("FILE_BROWSER_REQUESTED", { editor });
            }
        });

        editor.ui.addButton('nodejscartimages', {
            label: 'nodejscart file browser',
            command: 'openFileBrowser',
            toolbar: 'editing'
        });
    }
});