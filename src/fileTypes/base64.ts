import GenericFile from './file';

class Base64File extends GenericFile {

  constructor(builder: any, parent: string, file: any) {
    super(builder, parent, file);
  }

  /**
   * Set content
   * Resolves require/include
   * @param {string} content file content
   * @returns {string} content
   */
  async setContent(content: string): Promise<string> {
    this.contents = Buffer.from(content).toString('base64');
    return Promise.resolve(this.contents);
  }

  /**
   * Register loader names
   */
  static registerLoader(): string[] {
    return ['base64'];
  }
}

export default Base64File;