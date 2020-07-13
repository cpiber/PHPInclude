import fs from 'fs';
import path from 'path';
import vinyl from 'vinyl';
import gulp from 'gulp';
import { Readable } from 'stream';

import FileFactory from './fileTypes/factory';

class Builder {
  watcher = undefined;
  watchMode = false;
  entry = "";
  src_dir = "src";
  build_dir = "build";
  factory: FileFactory;

  constructor(args: any) {
    this.factory = new FileFactory(this);
    this.configure(args);
  }

  /**
   * Minimal configuration
   * @param args config
   */
  configure(args: any) {
    if (args.cd) process.chdir(args.cd);
    this.entry = (args.src ? args.src : 'src') + '/'
      + (args.entry ? args.entry : 'index.php');
    this.entry = path.resolve(this.entry);
    this.src_dir = path.resolve(args.src ? args.src : 'src');
    this.build_dir = args.dest ? args.dest : 'build';
  }

  /**
   * Build file
   * @param {string} content file content
   * @param {vinyl|string} file vinyl file or string (path)
   * @param {string} parent parent file
   * @returns {string} new content
   */
  async build(
    content: string = undefined,
    filename: vinyl|string = undefined,
    parent: string = undefined
  ): Promise<string> {
    if (!this.entry) return;
    if (!fs.existsSync(this.build_dir)) fs.mkdirSync(this.build_dir);
    
    let file: vinyl;
    const isFilename = filename && typeof filename === "string";
    if (isFilename || !content) {
      filename = isFilename ? filename : this.entry;
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
    
    this.factory.clearIncludes(file.path);
    
    const ext = path.extname(file.path);
    console.log('Building', file.path, 'with', ext);

    const f = this.factory.createFile(ext, parent, file);
    f.persistent = file.path === this.entry;
    return f.setContent(content);
  }

  /**
   * Rebuild
   * Used by watcher
   */
  async rebuild() {
    console.log('Building entry:');
    const content = await this.build();

    return new Promise<string>((resolve, reject) => {
      let out = new Readable({ objectMode: true });
      const builder = this;
      out._read = function () {
        this.push(new vinyl({
          cwd: builder.src_dir,
          path: builder.entry,
          contents: Buffer.from(content)
        }));
        this.push(null);
      };
      out.pipe(gulp.dest(this.build_dir));
      out.on('end', () => resolve(content));
      out.on('error', reject);
    }).then(
      (value)  => { this.clean(); return Promise.resolve(value); },
      (reason) => { this.clean(); return Promise.reject(reason); }
    ); // add clean step without modifying promise content
  }

  /**
   * Unwatch unneeded files and clean up
   * Forwarded to Factory
   */
  clean() {
    this.factory.clean();
  }

  /**
   * Unwatch all files
   */
  close() {
    for (const fname in this.factory.cache) {
      this.factory.cache[fname].unwatch();
    }
  }
}

export default Builder;