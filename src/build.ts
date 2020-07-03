const fs = require('fs'),
  path = require('path');
const vinyl = require('vinyl'),
  gulp = require('gulp');
const Readable = require('stream').Readable;

import GenericFile from "./fileTypes/file";
import FileFactory from "./fileTypes/factory";

/**
 * Configuration object
 * Exported to share variables accross files
 */
let config = {
  watcher: undefined,
  watchFile: undefined,
  entry: "",
  src: "src",
  build: "build",
};

/**
 * Build file
 * @param {string} content file content
 * @param {vinyl|string} file vinyl file or string (path)
 * @param {string} parent parent file
 * @returns {string} new content
 */
const build = (
  content: string = undefined,
  file: typeof vinyl|string = undefined,
  parent: string = undefined
): string => {
  if (!config.entry) return;
  if (!fs.existsSync(config.build)) fs.mkdirSync(config.build);
  if (!file || !content) {
    const isValid = file && typeof file === "string";
    file = isValid ? file : config.entry;
    try {
      content = fs.readFileSync(file);
    } catch (err) {
      throw `${isValid ? 'File' : 'Entry'} ${file} doesn't exist`;
    }
    file = new vinyl({ path: path.resolve(file) });
  }
  if (config.watchFile === undefined) config.watchFile = file.path;
  content = content.toString();

  FileFactory.clearIncludes(file.path);

  const ext = path.extname(file.path);
  console.log('Building', file.path, 'with', ext);

  const f = FileFactory.createFile(ext, parent, file);
  content = f.setContent(content);

  // write combined file
  if (file.path === config.entry && config.watchFile === config.entry) {
    let out = new Readable({ objectMode: true });
    out._read = function () {
      this.push(new vinyl({
        cwd: config.src,
        path: file.path,
        contents: Buffer.from(content)
      }));
      this.push(null);
    };
    out.pipe(gulp.dest(config.build));
  }

  return content;
}
/**
 * Unwatch unneeded files and clean up
 * Forwarded to Factory
 */
const clean = () => FileFactory.clean();

export default { build, config, clean };