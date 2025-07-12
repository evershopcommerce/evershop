import { select } from '@evershop/postgres-query-builder';
import uniqid from 'uniqid';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getEnabledWidgets } from '../../../../../lib/widget/widgetManager.js';
import { getCmsPagesBaseQuery } from '../../../services/getCmsPagesBaseQuery.js';
import { getWidgetsBaseQuery } from '../../../services/getWidgetsBaseQuery.js';
import { WidgetCollection } from '../../../services/WidgetCollection.js';

export default {
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
        settingComponent: row.settingComponent,
        component: row.component,
        defaultSettings: row.defaultSettings,
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
            settingComponent: type.settingComponent,
            component: type.component,
            defaultSettings: type.defaultSettings,
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

          url: url ? url.url : menu.type === 'custom' ? menu.url : null,
          children: menu.children.map((child) => {
            const url = urls.find((u) => u.uuid === child.uuid);
            return {
              ...child,
              id: uniqid(),

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
