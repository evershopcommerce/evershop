export type Extension = {
  name: string;
  resolve: string;
  srcPath?: string;
  path: string;
  syntax?: 'typescript' | 'javascript';
  enabled: boolean;
  priority: number;
};
