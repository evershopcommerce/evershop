import * as fs from 'fs';
import * as path from 'path';
import { Widget } from '../../types/widget.js';
import { warning } from '../log/logger.js';
import { generateComponentKey } from '../webpack/util/keyGenerator.js';

/**
 * Checks if a given path is a valid and resolvable JavaScript file path.
 * A path is considered valid if it's a string, not empty, exists on the filesystem,
 * and has a .js extension.
 *
 * @param {string | undefined} filePath - The path to check. Can be undefined.
 * @returns {boolean} True if the path is a resolvable JavaScript file, false otherwise.
 */
function isValidJsFilePath(filePath: string | undefined): boolean {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return false;
  }

  const resolvedPath = path.resolve(filePath);
  const fileExtension = path.extname(resolvedPath);

  try {
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      return false;
    }
  } catch (e) {
    return false;
  }

  return fileExtension === '.js';
}

/**
 * Checks if the base filename of a given path starts with an uppercase letter.
 * This is typically used for validating component names, following common conventions.
 *
 * @param {string | undefined} filePath - The path to check. Can be undefined.
 * @returns {boolean} True if the base filename starts with an uppercase letter, false otherwise.
 */
function isComponentNameUppercase(filePath: string | undefined): boolean {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return false;
  }
  const baseName = path.parse(filePath).name;
  return (
    baseName.length > 0 &&
    baseName[0] === baseName[0].toUpperCase() &&
    !!baseName[0].match(/[A-Z]/)
  );
}

/**
 * Validates the type of a widget. Only characters and underscores are allowed, no spaces or special characters.
 * @param type - The type of the widget to validate.
 * @returns {boolean} True if the type is valid, false otherwise.
 */
function isValidType(type: string | undefined): boolean {
  return (
    typeof type === 'string' &&
    type.trim() !== '' &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(type)
  );
}

class WidgetManager {
  /**
   * @private
   * A private map to store registered widgets. The key is the widget's unique name,
   * and the value is the widget object adhering to the Widget interface.
   */
  private widgets: Map<string, Widget> = new Map();

  /**
   * @private
   * A flag indicating whether the widget manager has entered a read-only state.
   * Once set to true (after `getAllWidgets` is called for the first time),
   * no further mutations (add, remove, update) are allowed.
   */
  private _isFrozen: boolean = false;

  /**
   * Internal helper to check if mutations are allowed.
   * Throws an error if the manager is in a frozen (read-only) state.
   * @private
   * @throws {Error} If a mutation attempt is made after the manager is frozen.
   */
  private _ensureMutable(): void {
    if (this._isFrozen) {
      throw new Error(
        'Widget manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a widget from the bootstrap file.'
      );
    }
  }

  /**
   * Registers a new widget with the manager.
   * A widget must have a unique 'type' property.
   * If a widget with the same type already exists, it will not be registered.
   * Additionally, `settingComponent` and `component` paths must
   * be resolvable paths to a JavaScript file, and their base filename must start
   * with an uppercase letter.
   *
   * @param {Widget} widget - The widget object to register.
   * @returns {boolean} True if the widget was successfully registered, false otherwise.
   * @throws {Error} If called after the manager has entered a read-only state or on invalid widget data/paths.
   */
  public registerWidget(widget: Widget): boolean {
    this._ensureMutable();

    if (!widget || isValidType(widget.type) === false) {
      throw new Error(
        'Cannot register widget. Widget object must have a valid "type" property.'
      );
    }

    const widgetType = widget.type;

    if (this.widgets.has(widgetType)) {
      warning(
        `Widget with type "${widgetType}" is already registered. Skipping registration.`
      );
      return false;
    }

    if (!isValidJsFilePath(widget.settingComponent)) {
      throw new Error(
        `Cannot register widget "${widgetType}". Invalid or unresolvable settingComponent path: "${widget.settingComponent}". Please ensure it's a valid path to an existing JS file.`
      );
    }
    if (!isComponentNameUppercase(widget.settingComponent)) {
      throw new Error(
        `Cannot register widget "${widgetType}". Setting component filename "${
          path.parse(widget.settingComponent).name
        }" must start with an uppercase letter.`
      );
    }

    if (!isValidJsFilePath(widget.component)) {
      throw new Error(
        `Cannot register widget "${widgetType}". Invalid or unresolvable component path: "${widget.component}". Please ensure it's a valid path to an existing JS file.`
      );
    }
    if (!isComponentNameUppercase(widget.component)) {
      throw new Error(
        `Cannot register widget "${widgetType}". Main component filename "${
          path.parse(widget.component).name
        }" must start with an uppercase letter.`
      );
    }

    this.widgets.set(widgetType, widget);
    return true;
  }

  /**
   * Updates properties of an existing widget. This is useful for third-party extensions
   * to modify or "overwrite" parts of a core widget, such as its `settingComponent` or `component`.
   *
   * @param {string} widgetType - The type of the widget to update.
   * @param {Partial<Widget>} updates - An object containing the properties to update.
   * @returns {boolean} True if the widget was successfully updated, false otherwise.
   * @throws {Error} If called after the manager has entered a read-only state or on invalid update data/paths.
   */
  public updateWidget(widgetType: string, updates: Partial<Widget>): boolean {
    this._ensureMutable();
    if (
      !updates ||
      typeof updates !== 'object' ||
      Object.keys(updates).length === 0
    ) {
      throw new Error(
        `Cannot update widget "${widgetType}". No updates provided or updates object is invalid.`
      );
    }

    const typeToUpdate = widgetType;
    const existingWidget = this.widgets.get(typeToUpdate);

    if (!existingWidget) {
      throw new Error(
        `Cannot update widget "${typeToUpdate}". Widget not found.`
      );
    }

    if (updates.settingComponent !== undefined) {
      if (!isValidJsFilePath(updates.settingComponent)) {
        throw new Error(
          `Cannot update widget "${typeToUpdate}". Invalid or unresolvable new settingComponent path: "${updates.settingComponent}". Please ensure it's a valid path to an existing JS file.`
        );
      } else if (!isComponentNameUppercase(updates.settingComponent)) {
        throw new Error(
          `Cannot update widget "${typeToUpdate}". New setting component filename "${
            path.parse(updates.settingComponent).name
          }" must start with an uppercase letter.`
        );
      } else {
        existingWidget.settingComponent = updates.settingComponent;
      }
    }

    if (updates.component !== undefined) {
      if (!isValidJsFilePath(updates.component)) {
        throw new Error(
          `Error: Cannot update widget "${typeToUpdate}". Invalid or unresolvable new component path: "${updates.component}". Please ensure it's a valid path to an existing JS file.`
        );
      } else if (!isComponentNameUppercase(updates.component)) {
        throw new Error(
          `Error: Cannot update widget "${typeToUpdate}". New main component filename "${
            path.parse(updates.component).name
          }" must start with an uppercase letter.`
        );
      } else {
        existingWidget.component = updates.component;
      }
    }

    for (const key in updates) {
      if (
        Object.prototype.hasOwnProperty.call(updates, key) &&
        key !== 'settingComponent' &&
        key !== 'component'
      ) {
        (existingWidget as any)[key] = (updates as any)[key];
      }
    }

    return true;
  }

  /**
   * Removes a widget from the manager based on its unique type.
   *
   * @param {string} widgetType - The type of the widget to remove.
   * @returns {boolean} True if the widget was successfully removed, false otherwise.
   * @throws {Error} If called after the manager has entered a read-only state or on invalid widget type.
   */
  public removeWidget(widgetType: string): boolean {
    this._ensureMutable();

    const typeToRemove = widgetType;

    if (this.widgets.has(typeToRemove)) {
      this.widgets.delete(typeToRemove);
      return true;
    } else {
      warning(`Widget with type "${typeToRemove}" not found. Cannot remove.`);
      return false;
    }
  }

  /**
   * Retrieves a registered widget by its unique type.
   *
   * @param {string} widgetType - The type of the widget to retrieve.
   * @returns {Widget | undefined} The widget object if found, otherwise undefined.
   */
  public getWidget(widgetType: string): Widget | undefined {
    if (this.widgets.has(widgetType)) {
      return this.widgets.get(widgetType);
    } else {
      warning(`Widget with type "${widgetType}" not found.`);
      return undefined;
    }
  }

  /**
   * Retrieves all registered widgets.
   * Returns a new array containing frozen (immutable) copies of the widget objects.
   * This method also marks the WidgetManager as 'frozen', preventing any further
   * calls to mutation methods (register, remove, update).
   *
   * @returns {Widget[]} An array containing all registered widget objects.
   */
  public getAllWidgets(): Widget[] {
    this._isFrozen = true;

    // Create a new array, and for each widget, create a frozen copy.
    return Array.from(this.widgets.values()).map((widget) =>
      Object.freeze({ ...widget })
    );
  }

  /**
   * Checks if a widget with the given type is registered.
   *
   * @param {string} widgetType - The type of the widget to check.
   * @returns {boolean} True if the widget is registered, false otherwise.
   */
  public hasWidget(widgetType: string): boolean {
    return this.widgets.has(widgetType);
  }
}

const widgetManager = new WidgetManager();

/**
 * Retrieves all registered widgets. This function returns a new array containing
 * all widgets, each with its `settingComponentKey` and `componentKey` properties
 * generated using the `generateComponentKey` function.
 * Calling this function will also freeze the widget manager, preventing any further mutations (register, remove, update).
 * @returns {Widget[]} An array of all registered widgets.
 */
export function getAllWidgets(): Widget[] {
  const allWidgets = widgetManager.getAllWidgets();
  return allWidgets.map((widget) => {
    return {
      ...widget,
      settingComponentKey: generateComponentKey(widget.settingComponent),
      componentKey: generateComponentKey(widget.component)
    };
  });
}

/**
 * Retrieves all enabled widgets. An enabled widget is one that has its `enabled` property set to true.
 * This function returns a new array containing only the widgets that are enabled. Calling this function
 * will also freeze the widget manager, preventing any further mutations (register, remove, update).
 * @returns {Widget[]} An array of enabled widgets.
 */
export function getEnabledWidgets(): Widget[] {
  const allWidgets = widgetManager.getAllWidgets();
  return allWidgets
    .filter((widget) => widget.enabled)
    .map((widget) => {
      return {
        ...widget,
        settingComponentKey: generateComponentKey(widget.settingComponent),
        componentKey: generateComponentKey(widget.component)
      };
    });
}

/**
 * Registers a new widget. This function is intended to be called during the
 * bootstrap phase of the application, before the widget manager is frozen.
 * @param widget - The widget object to register.
 * @returns True if the widget was successfully registered, false otherwise.
 * @throws Error if the widget is invalid or if the manager is in a read-only state.
 */
export function registerWidget(widget: Widget): boolean {
  return widgetManager.registerWidget(widget);
}

/**
 * Updates properties of an existing widget. This is useful for third-party extensions
 * to modify or "overwrite" parts of a core widget, such as its `settingComponent` or `component`.
 * @param widgetType - The type of the widget to update.
 * @param updates - An object containing the properties to update.
 * @returns True if the widget was successfully updated, false otherwise.
 */
export function updateWidget(
  widgetType: string,
  updates: Partial<Widget>
): boolean {
  return widgetManager.updateWidget(widgetType, updates);
}

/**
 * Removes a widget. This function supposed to be called from the bootstrap
 * phase of the application, before the widget manager is frozen.
 * @param widgetName - The name of the widget to remove.
 * @returns True if the widget was successfully removed, false otherwise.
 */
export function removeWidget(widgetName: string): boolean {
  return widgetManager.removeWidget(widgetName);
}
/**
 * Retrieves a widget by its type.
 * @param widgetType - The type of the widget to retrieve.
 * @returns The widget if found, undefined otherwise.
 */
export function getWidget(widgetType: string): Widget | undefined {
  return widgetManager.getWidget(widgetType);
}

/**
 * Checks if a widget with the given type is registered.
 * @param widgetType - The type of the widget to check.
 * @returns True if the widget is registered, false otherwise.
 */
export function hasWidget(widgetType: string): boolean {
  return widgetManager.hasWidget(widgetType);
}
