import fs from 'fs';
import path from 'path';
import vinyl from 'vinyl';
import gulp from 'gulp';
import { Readable } from 'stream';

import FileFactory from './fileTypes/factory';
import { error } from './gulpfile';

/**
 * Configuration object
 * Exported to share variables accross files
 */
let config = {
  watcher: undefined,
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
const build = async (
  content: string = undefined,
  filename: vinyl|string = undefined,
  parent: string = undefined
): Promise<string> => {
  if (!config.entry) return;
  if (!fs.existsSync(config.build)) fs.mkdirSync(config.build);
  
  let file: vinyl;
  const isFilename = filename && typeof filename === "string";
  if (isFilename || !content) {
    filename = isFilename ? filename : config.entry;
    try {
      content = fs.readFileSync(filename as string).toString();
    } catch (err) {
      return Promise.reject(
        `${isFilename ? 'File' : 'Entry'} ${filename} doesn't exist`);
    }
    file = new vinyl({ path: path.resolve(filename as string) });
  } else {
    file = filename as vinyl;
  }

  FileFactory.clearIncludes(file.path);

  const ext = path.extname(file.path);
  console.log('Building', file.path, 'with', ext);

  const f = FileFactory.createFile(ext, parent, file);
  return f.setContent(content);
}
/**
 * Rebuild
 * Used by watcher
 */
const rebuild = async () => {
  console.log('Building entry:');
  const content = await build();

  const p = new Promise<string>((resolve, reject) => {
    let out = new Readable({ objectMode: true });
    out._read = function () {
      this.push(new vinyl({
        cwd: config.src,
        path: config.entry,
        contents: Buffer.from(content)
      }));
      this.push(null);
    };
    out.pipe(gulp.dest(config.build));
    out.on('end', () => resolve(content));
    out.on('error', reject);
  });
  p.then(clean, clean); // doesn't modify original promise (doesn't catch!)
  return p;
}
/**
 * Unwatch unneeded files and clean up
 * Forwarded to Factory
 */
const clean = () => FileFactory.clean();

export default { build, clean, rebuild, config };