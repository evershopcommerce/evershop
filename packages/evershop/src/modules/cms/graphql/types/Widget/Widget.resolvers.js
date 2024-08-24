const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getEnabledWidgets
} = require('@evershop/evershop/src/lib/util/getEnabledWidgets');
const {
  getWidgetsBaseQuery
} = require('../../../services/getWidgetsBaseQuery');
const { WidgetCollection } = require('../../../services/WidgetCollection');

module.exports = {
  Query: {
    widget: async (root, { id }, { pool }) => {
      const query = getWidgetsBaseQuery();
      query.where('widget_id', '=', id);
      const widget = await query.load(pool);
      return widget ? camelCase(widget) : null;
    },
    widgets: async (_, { filters = [] }, { user }) => {
      const query = getWidgetsBaseQuery();
      const root = new WidgetCollection(query);
      await root.init(filters, !!user);
      return root;
    },
    widgetTypes: () => {
      const types = getEnabledWidgets();
      return types.map((row) => ({
        code: row.type,
        name: row.name,
        description: row.description,
        settingComponent: row.setting_component,
        component: row.component,
        defaultSettings: row.default_settings,
        createWidgetUrl: buildUrl('widgetNew', { type: row.type })
      }));
    },
    widgetType: (_, { code }) => {
      const types = getEnabledWidgets();
      const type = types.find((row) => row.type === code);
      return type
        ? {
            code: type.type,
            name: type.name,
            description: type.description,
            settingComponent: type.setting_component,
            component: type.component,
            defaultSettings: type.default_settings,
            createWidgetUrl: buildUrl('widgetNew', { type: type.type })
          }
        : null;
    },
    textWidget(_, { text, className }) {
      const replacements = {
        '&lt;': '<',
        '&gt;': '>'
      };
      const jsonText = text
        ? text.replace(/&lt;|&gt;/g, (match) => replacements[match])
        : '[]';
      return { text: JSON.parse(jsonText), className };
    }
  },
  Widget: {
    editUrl: ({ uuid }) => buildUrl('widgetEdit', { id: uuid }),
    updateApi: (widget) => buildUrl('updateWidget', { id: widget.uuid }),
    deleteApi: (widget) => buildUrl('deleteWidget', { id: widget.uuid })
  }
};
