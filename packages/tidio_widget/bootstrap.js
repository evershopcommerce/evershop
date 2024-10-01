const config = require('config');

module.exports = () => {
    // Register our tidio widget
    const tidioWidget = {
        tidio_widget: {
            setting_component:
                'tidio_widget/components/widget/TidioWidgetSetting.jsx',
            component:
                'tidio_widget/components/widget/TidioWidget.jsx',
            name: 'Tidio widget',
            description: '即时通信小组件',
            default_settings: {
                
            },
            enabled: true
        }
    };
    config.util.setModuleDefaults('widgets', tidioWidget);
}