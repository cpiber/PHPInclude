import WebpackFile from './webpack';
import builder from '../build';


class JsFile extends WebpackFile {
  constructor(parent: string, file: any) {
    super(parent, file, {
      output: {
        path: file.path,
        filename: 'file'
      },
      mode: builder.config.watcher ? 'development' : 'production'
    });
  }
}

export default JsFile;