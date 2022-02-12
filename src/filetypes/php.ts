import { strictEqual } from 'assert';
import { Assign, AssignRef, Engine, ExpressionStatement, Node, Variable } from 'php-parser';
import type Builder from '..';
import { warn } from '../helpers';
import { BuildFile } from './file';

class PhpFile extends BuildFile {
  static parser: Engine;

  constructor(builder: Builder) {
    super(builder);
    PhpFile.parser = PhpFile.parser || new Engine({
      parser: {
        locations: true,
      },
      ast: {
        withPositions: true
      }
    });
  }

  process(filename: string, contents: string | Buffer) {
    contents = contents.toString();
    const ast = PhpFile.parser.parseCode(contents, filename);
    // console.log(ast);
    strictEqual(ast.errors.length, 0);
    
    const globals: string[] = [];
    const addIfVar = (node: Node) => {
      if (NodeIsVariable(node)) {
        if (typeof node.name !== 'string') warn(`encountered dynamic variable access at top level (${node.loc})`);
        else globals.push(node.name);
      }
    };
    for (const expr of ast.children) {
      if (NodeIsExpression(ast) && NodeIsAssign(ast.expression)) {
        addIfVar(ast.expression.left);
      }
    }
    const g = new Set(globals);
    
    let newcontents = contents;
    // TODO: replace includes
    newcontents = newcontents.trim().replace(/^<\?(php)?[^\S\r\n]*\n?|\n?[^\S\r\n]*\?>$/, '');
    if (g.size) newcontents = `global ${Array.from(g).map(s => `$${s}`).join(', ')};\n${newcontents}`;
    this.setContent(filename, newcontents);
    return true;
  }

}

function NodeIsVariable(node: Node): node is Variable {
  return node.kind === 'variable';
}
function NodeIsExpression(node: Node): node is ExpressionStatement {
  return node.kind === 'expressionstatement';
}
function NodeIsAssign(node: Node): node is (Assign | AssignRef) {
  return node.kind === 'assign' || node.kind === 'assignref';
}

export { PhpFile };
