import WebpackFile from './webpack';

class JsFile extends WebpackFile {
  constructor(parent: string, file: any) {
    super(parent, file, {
      output: {
        path: file.path,
        filename: 'file'
      }
    });
  }
}

export default JsFile;