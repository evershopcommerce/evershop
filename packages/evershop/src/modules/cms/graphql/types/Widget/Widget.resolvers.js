const uniqid = require('uniqid');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getEnabledWidgets
} = require('@evershop/evershop/src/lib/util/getEnabledWidgets');
const { select } = require('@evershop/postgres-query-builder');
const {
  getWidgetsBaseQuery
} = require('../../../services/getWidgetsBaseQuery');
const { WidgetCollection } = require('../../../services/WidgetCollection');
const {
  getCmsPagesBaseQuery
} = require('../../../services/getCmsPagesBaseQuery');

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
    },
    basicMenuWidget: async (_, { settings }, { pool }) => {
      const categories = [];
      const pages = [];
      const menus = settings?.menus || undefined;
      const isMain = [1, '1', 'true', true].includes(settings?.isMain) || false;
      if (!menus) {
        return { menus: [] };
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const menu of menus) {
        if (menu.type === 'category') {
          categories.push(menu.uuid);
        }
        if (menu.type === 'page') {
          pages.push(menu.uuid);
        }
        menu.children.forEach((child) => {
          if (child.type === 'category') {
            categories.push(child.uuid);
          }
          if (child.type === 'page') {
            pages.push(child.uuid);
          }
        });
      }
      let urls = [];
      if (categories.length > 0) {
        const rewrites = await select()
          .from('url_rewrite')
          .where('entity_uuid', 'IN', categories)
          .execute(pool);
        urls = urls.concat(
          rewrites.map((r) => ({
            uuid: r.entity_uuid,
            url: r.request_path
          }))
        );
      }
      if (pages.length > 0) {
        const query = getCmsPagesBaseQuery();
        query.where('uuid', 'IN', pages);
        const cmsPages = await query.execute(pool);
        urls = urls.concat(
          cmsPages.map((p) => ({
            uuid: p.uuid,
            url: buildUrl('cmsPageView', { url_key: p.url_key })
          }))
        );
      }
      const items = menus.map((menu) => {
        const url = urls.find((u) => u.uuid === menu.uuid);
        return {
          ...menu,
          id: uniqid(),
          // eslint-disable-next-line no-nested-ternary
          url: url ? url.url : menu.type === 'custom' ? menu.url : null,
          children: menu.children.map((child) => {
            const url = urls.find((u) => u.uuid === child.uuid);
            return {
              ...child,
              id: uniqid(),
              // eslint-disable-next-line no-nested-ternary
              url: url ? url.url : child.type === 'custom' ? child.url : null
            };
          })
        };
      });
      return { menus: items, isMain, className: settings?.className };
    }
  },
  Widget: {
    editUrl: ({ uuid }) => buildUrl('widgetEdit', { id: uuid }),
    updateApi: (widget) => buildUrl('updateWidget', { id: widget.uuid }),
    deleteApi: (widget) => buildUrl('deleteWidget', { id: widget.uuid })
  }
};
