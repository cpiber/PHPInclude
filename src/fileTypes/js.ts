import WebpackFile from './webpack';

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