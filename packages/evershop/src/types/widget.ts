export interface Widget<T = any> {
  name: string;
  type: string;
  description: string;
  settingComponent: string;
  settingComponentKey?: string;
  component: string;
  componentKey?: string;
  enabled: boolean;
  defaultSettings: Record<string, T>;
}

export interface WidgetInstance<T = any> extends Widget<T> {
  id: string;
  type: string;
  settings: Record<string, T>;
}
