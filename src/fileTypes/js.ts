import WebpackFile from './webpack';
import { env } from '../global';

class JsFile extends WebpackFile {
  constructor(builder: any, parent: string, file: any) {
    super(builder, parent, file, {
      output: {
        path: file.path,
        filename: 'file'
      }
    });
  }

  /**
   * Generate content
   * Adds surrounding comments in dev mode
   * @param {string} content
   * @returns {string} content
   */
  genContent(content: string = ""): string {
    if (env === 'production') return content;
    return `// BEGIN ${this.file.path}\n${content}\n// END ${this.file.path}`;
  }

  /**
   * Register loader names
   */
  static registerLoader(): string[] {
    return ['js'];
  }

  /**
   * Register extensions
   */
  static registerExt(): string[] {
    return ['js', 'mjs'];
  }
}

export default JsFile;