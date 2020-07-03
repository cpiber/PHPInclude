import GenericFile from './file';
import { error } from '../gulpfile';

class PhpFile extends GenericFile {
  static openingRegex = /^\s*<\?php|\?>\s*$/g;

  constructor(parent: string, file: any) {
    super(parent, file);
  }

  /**
   * Set content
   * Resolves require/include
   * @param {string} content file content
   * @returns {string} content
   */
  setContent(content: string): string {
    let matches: RegExpExecArray,
      content_parts: string[] = [],
      last = 0;
    const include_regex = /(?<!\/\/[^\n]*)(include|require)(_once)?\s+(?:"([A-Za-z0-9.\\\/]+)"|'([A-Za-z0-9.\\\/]+)')\s*;/g;

    // resolve all includes
    do {
      matches = include_regex.exec(content);
      if (!matches) break;
      const include = matches[1] === "include",
        once = matches[2] !== undefined,
        fname = matches[3] || matches[4];
      //console.log(include, once, fname);

      // save string until include + file contents (recursive build)
      content_parts.push(content.substring(last, matches.index));
      try {
        content_parts.push(
          GenericFile.fillContent(this.file.path, fname, include, once));
      } catch (e) {
        error(e);
      }
      last = include_regex.lastIndex;
    } while (matches);
    // push end of file (after last include)
    content_parts.push(content.substring(last, content.length));

    this.contents = content_parts.join("");
    return this.contents;
  }

  /**
   * Get content
   * Removes <?php ?> wrappers
   * @param {string} parent includer
   * @returns {string} content
   */
  getContent(parent: string): string {
    this.addParent(parent);
    return this.contents.replace(PhpFile.openingRegex, '');
  }
}

export default PhpFile;