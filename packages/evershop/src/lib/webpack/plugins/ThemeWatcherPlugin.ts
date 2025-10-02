import path from 'path';
import watcher from '@parcel/watcher';
import touch from 'touch';
import type { Compiler, WebpackPluginInstance } from 'webpack';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../helpers.js';
import { debug } from '../../log/logger.js';
import { getEnabledTheme } from '../../util/getEnabledTheme.js';

interface AsyncWebpackSubscription {
  unsubscribe(): Promise<void>;
}

declare module 'webpack' {
  interface Module {
    resource?: string;
  }
}

let globalWatcher: AsyncWebpackSubscription | null = null;
const watcherSubscribers = new Set<Compiler>();

export class ThemeWatcherPlugin implements WebpackPluginInstance {
  private pendingFiles: Set<string>;

  constructor() {
    this.pendingFiles = new Set<string>();
  }

  apply(compiler: Compiler): void {
    if (compiler.options.mode !== 'development') {
      return;
    }

    const theme = getEnabledTheme();
    if (!theme) {
      return;
    }

    watcherSubscribers.add(compiler);

    if (!globalWatcher) {
      this.initializeGlobalWatcher();
    }

    compiler.hooks.compilation.tap('ThemeWatcherPlugin', (compilation) => {
      compilation.hooks.finishModules.tap(
        'ThemeWatcherPlugin',
        (modules: Set<any>) => {
          if (this.pendingFiles.size === 0) {
            return;
          }

          const extensions = getEnabledExtensions();
          const watchPath = path.join(theme.path, 'dist', 'components');
          const filesToProcess = Array.from(this.pendingFiles);
          this.pendingFiles.clear(); // Clear immediately to prevent loops

          filesToProcess.forEach((filePath: string) => {
            const relativePath = path.relative(watchPath, filePath);

            let targetModule: any = null;
            let targetPath: string | null = null;

            for (const extension of extensions) {
              const extensionComponentPath = path.resolve(
                extension.resolve,
                'dist/components',
                relativePath
              );

              targetModule = Array.from(modules).find(
                (module) =>
                  module.resource && module.resource === extensionComponentPath
              );

              if (targetModule) {
                targetPath = extensionComponentPath;
                break;
              }
            }

            if (!targetModule) {
              const coreComponentPath = path.resolve(
                CONSTANTS.MODULESPATH,
                '../components',
                relativePath
              );

              targetModule = Array.from(modules).find(
                (module) =>
                  module.resource && module.resource === coreComponentPath
              );

              if (targetModule) {
                targetPath = coreComponentPath;
              }
            }

            if (targetModule) {
              const issuers: any[] = [];

              for (const module of modules) {
                if (module.dependencies) {
                  for (const dependency of module.dependencies) {
                    const depModule =
                      compilation.moduleGraph.getModule(dependency);
                    if (depModule === targetModule) {
                      issuers.push(module);
                      break;
                    }
                  }
                }
              }
              if (issuers.length > 0) {
                for (const issuer of issuers) {
                  if (issuer.resource) {
                    touch.sync(issuer.resource);
                  }
                }
              }
            }
          });
        }
      );
    });

    compiler.hooks.watchClose.tap('ThemeWatcherPlugin', () => {
      watcherSubscribers.delete(compiler);

      if (watcherSubscribers.size === 0) {
        this.cleanupGlobalWatcher();
      }
    });
  }

  private initializeGlobalWatcher(): void {
    const theme = getEnabledTheme();
    if (!theme) return;

    const watchPath = path.join(theme.path, 'dist', 'components');

    watcher
      .subscribe(watchPath, (err: Error | null, events: any[]) => {
        if (err) {
          debug(err);
          return;
        }

        const createEvents = events.filter((event) => event.type === 'create');

        if (createEvents.length > 0) {
          watcherSubscribers.forEach((compiler: Compiler) => {
            const plugin = compiler.options.plugins?.find(
              (p: any) => p instanceof ThemeWatcherPlugin
            ) as ThemeWatcherPlugin | undefined;
            if (plugin) {
              createEvents.forEach((event) => {
                plugin.pendingFiles.add(event.path);
              });
              if (compiler.watching) {
                compiler.watching.invalidate();
              }
            }
          });
        }
      })
      .then((subscription: AsyncWebpackSubscription) => {
        globalWatcher = subscription;
      })
      .catch((error: Error) => {
        debug(error);
      });
  }

  private cleanupGlobalWatcher(): void {
    if (globalWatcher) {
      globalWatcher.unsubscribe();
      globalWatcher = null;
    }
  }
}
