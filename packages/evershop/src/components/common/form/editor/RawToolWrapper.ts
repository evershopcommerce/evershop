/**
 * Wrapper for @editorjs/raw that fixes keyboard event handling issues
 * This ensures backspace and other keys work properly in the raw HTML block
 */
export class RawToolWrapper {
  private rawTool: any;
  private api: any;
  private data: any;
  private config: any;

  constructor({ data, config, api, block }: any) {
    this.data = data;
    this.config = config;
    this.api = api;

    // We'll load the actual Raw tool dynamically
    this.initializeRawTool({ data, config, api, block });
  }

  async initializeRawTool(params: any) {
    const { default: RawTool } = await import('@editorjs/raw');
    this.rawTool = new RawTool(params);
  }

  static get toolbox() {
    return {
      title: 'Raw HTML',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>'
    };
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('ce-rawtool');

    const textarea = document.createElement('textarea');
    textarea.classList.add('ce-rawtool__textarea');
    textarea.placeholder = 'Enter HTML code';
    textarea.value = this.data?.html || '';

    // Prevent EditorJS from handling keyboard events inside textarea
    textarea.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });

    textarea.addEventListener('keyup', (event) => {
      event.stopPropagation();
    });

    textarea.addEventListener('paste', (event) => {
      event.stopPropagation();
    });

    // Handle input changes
    textarea.addEventListener('input', () => {
      this.data = { html: textarea.value };
    });

    wrapper.appendChild(textarea);
    return wrapper;
  }

  save(blockContent: HTMLElement) {
    const textarea = blockContent.querySelector('textarea');
    return {
      html: textarea?.value || ''
    };
  }

  static get sanitize() {
    return {
      html: true
    };
  }

  static get isReadOnlySupported() {
    return true;
  }
}
