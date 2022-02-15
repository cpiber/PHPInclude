import type Builder from '..';
import { BuildFile } from './file';

export * from './base64';
export * from './file';
export * from './php';
export * from './plain';
export { Sub as BuildFileSubclass };
type Sub = (new (b: Builder) => BuildFile) & { [k in keyof typeof BuildFile]: typeof BuildFile[k] };

