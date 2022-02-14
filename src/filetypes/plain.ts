import { BuildFile } from './file';

class PlainFile extends BuildFile {
  async process(filename: string, contents: string | Buffer) {
    contents = contents.toString();
    // TODO: content might contain $ -> escape!
    this.setContent(filename, `return ${JSON.stringify(contents)};`);
    return true;
  }
}

export { PlainFile };
