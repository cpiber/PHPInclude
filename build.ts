const fs = require('fs'),
  path = require('path');
const vinyl = require('vinyl'),
  gulp = require('gulp');
const Readable = require('stream').Readable;

const GenericFile = require('./fileTypes/file'),
  PhpFile = require('./fileTypes/php');

let config = {
  watcher: undefined,
  watchFile: undefined,
  entry: "",
  src: "src"
};

function build(content = undefined, file = undefined, parent = undefined) {
  if (!config.entry) return;
  if (!fs.existsSync('build')) fs.mkdirSync('build');
  if (!file || !content) {
    file = (file && typeof file === "string") ? file : config.entry;
    content = fs.readFileSync(file);
    file = new vinyl({ path: path.resolve(file) });
  }
  if (config.watchFile === undefined) config.watchFile = file.path;
  content = content.toString();

  GenericFile.clearIncludes(file.path);

  const ext = path.extname(file.path);
  console.log('Building', file.path, 'with', ext);

  let f: { setContent: (content: string) => string; };
  switch (ext) {
    case '.php':
      f = new PhpFile(parent, file);
      break;
    default:
      f = new GenericFile(parent, file);
      break;
  }

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
    out.pipe(gulp.dest('build'));
  }

  return content;
}

exports.build = build;
exports.config = config;
exports.clean = () => GenericFile.clean();