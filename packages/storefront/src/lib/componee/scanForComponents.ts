import { existsSync, readdirSync } from 'fs';
import { resolve, sep } from 'path';
import { Extension } from '../../types/extension.js';
import { Route } from '../../types/route.js';

interface ComponentsMap {
  [key: string]: string;
}

function scanForComponents(path: string): string[] {
  return readdirSync(resolve(path), { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isFile() &&
        /.js$/.test(dirent.name) &&
        /^[A-Z]/.test(dirent.name[0])
    )
    .map((dirent) => resolve(path, dirent.name));
}

function scanRouteComponents(
  route: Route,
  modules: {
    name: string;
    path: string;
  }[],
  themePath: string | null = null
): ComponentsMap {
  let components: ComponentsMap = {};

  modules.forEach((module) => {
    // Scan for 'all' components
    const rootPath = route.isAdmin
      ? resolve(module.path, 'pages/admin')
      : resolve(module.path, 'pages/frontStore');
    // Get all folders in the rootPath
    const pages = existsSync(rootPath)
      ? readdirSync(rootPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name)
      : [];

    pages.forEach((page) => {
      let moduleComponents: string[] = [];
      if (page === 'all' || page === route.id) {
        moduleComponents = [
          ...moduleComponents,
          ...scanForComponents(resolve(rootPath, page))
        ];
      }
      // Check if page include `+ page` or `page+` in the name
      if (page.includes('+') && page.includes(route.id)) {
        moduleComponents = [
          ...moduleComponents,
          ...scanForComponents(resolve(rootPath, page))
        ];
      }

      const componentsObject = moduleComponents.reduce(
        (a: ComponentsMap, v: string) => {
          // Split the path by separator and get the 2 last items (routeId and component name)
          const key = v.split(sep).slice(-2).join('/');
          return { ...a, [key]: v };
        },
        {}
      );

      components = { ...components, ...componentsObject };
    });
  });

  // Scan for theme components, only support frontStore theme
  if (!route.isAdmin && themePath) {
    const themePages = existsSync(resolve(themePath, 'pages'))
      ? readdirSync(resolve(themePath, 'pages'), { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name)
      : [];

    themePages.forEach((page) => {
      let themeComponents: string[] = [];
      if (page === 'all' || page === route.id) {
        themeComponents = [
          ...themeComponents,
          ...scanForComponents(resolve(themePath, 'pages', page))
        ];
      }
      // Check if page include `+ page` or `page+` in the name
      if (page.includes('+') && page.includes(route.id)) {
        themeComponents = [
          ...themeComponents,
          ...scanForComponents(resolve(themePath, 'pages', page))
        ];
      }

      const themeComponentsObject = themeComponents.reduce(
        (a: ComponentsMap, v: string) => {
          // Split the path by separator and get the 2 last items (routeId and component name)
          const key = v.split(sep).slice(-2).join('/');
          return { ...a, [key]: v };
        },
        {}
      );

      components = { ...components, ...themeComponentsObject };
    });
  }

  return components;
}

export { scanForComponents, scanRouteComponents };
export type { ComponentsMap };
