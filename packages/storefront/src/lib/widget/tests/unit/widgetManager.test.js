import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const getValidWidget = (type = 'TestWidgetType') => ({
  name: `Widget ${type}`,
  type: type,
  description: `Description for ${type}`,
  settingComponent: `${type}Settings.js`,
  component: `${type}Component.js`,
  enabled: true,
  defaultSettings: { theme: 'light' }
});

jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn((path) => {
    if (
      path.includes('InvalidComponent.js') ||
      path.includes('InvalidSetting.js')
    ) {
      return false; // Simulate unresolvable paths
    }
    return true; // Simulate valid paths for other components
  }),
  statSync: jest.fn(() => ({
    isFile: () => true
  }))
}));

const realPath = await import('path');
jest.unstable_mockModule('path', () => ({
  default: true,
  ...realPath,
  resolve: jest.fn((...args) => `/mocked/path/${args.join('/')}`)
}));

describe('Widget Manager Module', () => {
  beforeEach(async () => {
    jest.resetModules(); // Reset modules before each test to ensure fresh mocks
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mock call history after each test
  });
  // --- Test _isFrozen state enforcement ---
  describe('Mutation after getAllWidgets()', () => {
    it('should throw an error if either component or settingComponent is not a string', async () => {
      const widgetModule = await import('../../widgetManager.js');
      const invalidWidget = {
        name: 'InvalidWidget',
        type: 'InvalidType',
        description: 'This widget has invalid components',
        settingComponent: 123, // Invalid type
        component: null, // Invalid type
        enabled: true,
        defaultSettings: { theme: 'dark' }
      };
      expect(() => widgetModule.registerWidget(invalidWidget)).toThrow(
        'Invalid or unresolvable'
      );
    });

    it('should throw an error if either component or settingComponent is unresolvable path', async () => {
      const widgetModule = await import('../../widgetManager.js');
      const invalidWidget = {
        name: 'InvalidWidget',
        type: 'InvalidType',
        description: 'This widget has invalid components',
        settingComponent: 'InvalidSetting.js', // Unresolvable path
        component: 'InvalidComponent.js', // Unresolvable path
        enabled: true,
        defaultSettings: { theme: 'dark' }
      };
      expect(() => widgetModule.registerWidget(invalidWidget)).toThrow(
        'Invalid or unresolvable'
      );
    });

    it('should throw an error if registerWidget is called after getAllWidgets', async () => {
      const widgetModule = await import('../../widgetManager.js');
      widgetModule.getAllWidgets(); // This freezes the manager
      const widget = getValidWidget('NewWidget');
      expect(() => widgetModule.registerWidget(widget)).toThrow(
        'Widget manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a widget from the bootstrap file.'
      );
    });

    it('should throw an error if updateWidget is called after getAllWidgets', async () => {
      const widgetModule = await import('../../widgetManager.js');
      widgetModule.registerWidget(getValidWidget('ExistingWidget'));
      widgetModule.getAllWidgets(); // This freezes the manager
      expect(() =>
        widgetModule.updateWidget('ExistingWidget', { description: 'Updated' })
      ).toThrow(
        'Widget manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a widget from the bootstrap file.'
      );
    });

    it('should throw an error if removeWidget is called after getAllWidgets', async () => {
      const widgetModule = await import('../../widgetManager.js');
      widgetModule.registerWidget(getValidWidget('WidgetToRemove'));
      widgetModule.getAllWidgets(); // This freezes the manager
      expect(() => widgetModule.removeWidget('WidgetToRemove')).toThrow(
        'Widget manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a widget from the bootstrap file.'
      );
    });

    it('should allow getWidget after getAllWidgets', async () => {
      const widgetModule = await import('../../widgetManager.js');
      const widget = getValidWidget('ReadWidget');
      widgetModule.registerWidget(widget);
      widgetModule.getAllWidgets(); // This freezes the manager
      expect(widgetModule.getWidget('ReadWidget')).toEqual(widget);
    });

    it('should allow hasWidget after getAllWidgets', async () => {
      const widgetModule = await import('../../widgetManager.js');
      const widget = getValidWidget('CheckWidget');
      widgetModule.registerWidget(widget);
      widgetModule.getAllWidgets(); // This freezes the manager
      expect(widgetModule.hasWidget('CheckWidget')).toBe(true);
    });

    it('should allow to updateWidget', async () => {
      const widgetModule = await import('../../widgetManager.js');
      const widget = getValidWidget('UpdateWidget');
      widgetModule.registerWidget(widget);
      const newWidget = {
        ...widget,
        description: 'Updated Description',
        component: 'UpdatedComponent.js'
      };
      widgetModule.updateWidget('UpdateWidget', newWidget);
      expect(widgetModule.getWidget('UpdateWidget')).toEqual(newWidget);
      expect(widgetModule.getWidget('UpdateWidget').component).toEqual(
        'UpdatedComponent.js'
      );
      expect(widgetModule.getWidget('UpdateWidget').description).toEqual(
        'Updated Description'
      );
    });

    it('should throw error if trying to updateWidget with non-existing widget', async () => {
      const widgetModule = await import('../../widgetManager.js');
      expect(() =>
        widgetModule.updateWidget('NonExistingWidget', { description: 'Test' })
      ).toThrow('Widget not found');
    });

    it('should thrown an error if trying to update widget after calling getAllWidgets', async () => {
      const widgetModule = await import('../../widgetManager.js');
      widgetModule.registerWidget(getValidWidget('WidgetToUpdate'));
      widgetModule.getAllWidgets(); // This freezes the manager
      expect(() =>
        widgetModule.updateWidget('WidgetToUpdate', { description: 'New Desc' })
      ).toThrow(
        'Widget manager is in a read-only state. No further mutations are allowed. We suggest to register, update, or remove a widget from the bootstrap file.'
      );
    });

    it('should allow removing a widget', async () => {
      const widgetModule = await import('../../widgetManager.js');
      const widget = getValidWidget('WidgetToRemove');
      widgetModule.registerWidget(widget);
      widgetModule.removeWidget('WidgetToRemove');
      expect(widgetModule.hasWidget('WidgetToRemove')).toBe(false);
    });
  });
});
