import fs from 'fs';
import path from 'path';
import vinyl from 'vinyl';
import gulp from 'gulp';
import { Readable } from 'stream';

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
      throw `${isFilename ? 'File' : 'Entry'} ${filename} doesn't exist`;
    }
    file = new vinyl({ path: path.resolve(filename as string) });
  } else {
    file = filename as vinyl;
  }
  if (config.watchFile === undefined) config.watchFile = file.path;

  FileFactory.clearIncludes(file.path);

  const ext = path.extname(file.path);
  console.log('Building', file.path, 'with', ext);

  const f = FileFactory.createFile(ext, parent, file);
  content = await f.setContent(content);

  // write combined file
  if (file.path === config.entry && config.watchFile === config.entry) {
    return new Promise<string>((resolve, reject) => {
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
      out.on('end', () => resolve(content));
      out.on('error', reject);
    });
  }

  return Promise.resolve(content);
}
/**
 * Rebuild
 * Used by watcher
 */
const rebuild = async () => {
  if (config.watchFile !== config.entry) {
    config.watchFile = config.entry;
    console.log('Building entry:');
    await build();
  }
  clean();
  config.watchFile = undefined;
}
/**
 * Unwatch unneeded files and clean up
 * Forwarded to Factory
 */
const clean = () => FileFactory.clean();

export default { build, clean, rebuild, config };