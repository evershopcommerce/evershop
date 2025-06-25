export type Extension = {
  name: string;
  resolve: string;
  srcPath?: string;
  path: string;
  enabled: boolean;
  priority: number;
};
