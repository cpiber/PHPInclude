import GenericFile from './file';

class PhpFile extends GenericFile {
  static openingRegex = /^\s*<\?php|\?>\s*$/g;

  constructor(parent: string, file: any) {
    super(parent, file);
  }

  setContent(content: string) {
    let matches: RegExpExecArray,
      content_parts = [],
      last = 0;
    const include_regex = /(?<!\/\/[^\n]*)(include|require)(_once)?\s+(?:"([A-Za-z0-9.\\\/]+)"|'([A-Za-z0-9.\\\/]+)')\s*;/g;
    do {
      matches = include_regex.exec(content);
      if (matches) {
        const include = matches[1] === "include",
          once = matches[2] !== undefined,
          fname = matches[3] || matches[4];
        //console.log(include, once, fname);

        content_parts.push(content.substring(last, matches.index));
        try {
          content_parts.push(GenericFile.fillContent(this.file.path, fname, include, once));
        } catch (e) {
          console.error(e);
        }
        last = include_regex.lastIndex;
      }
    } while (matches);
    content_parts.push(content.substring(last, content.length));

    this.contents = content_parts.join("");
    return this.contents;
  }

  getContent(parent: string) {
    this.addParent(parent);
    return this.contents.replace(PhpFile.openingRegex, '');
  }
}

export default PhpFile;