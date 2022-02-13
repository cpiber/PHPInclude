import { strictEqual } from 'assert';
import { dirname, join } from 'path';
import { Array as _Array, ArrowFunc, Assign, AssignRef, Bin, Block, ByRef, Call, Case, Cast, Catch, Class, ClassConstant, Clone, Closure, Constant, ConstantStatement, Declare, DeclareDirective, Do, Echo, Encapsed, EncapsedPart, Engine, Entry, Eval, Exit, ExpressionStatement, For, Foreach, Function, If, Include, Interface, Magic, Method, Namespace, New, Node, OffsetLookup, Post, Pre, Property, PropertyLookup, PropertyStatement, RetIf, Return, Static, StaticLookup, StaticVariable, String, Switch, Throw, Trait, Try, Unary, Variable, While, Yield, YieldFrom } from 'php-parser';
import type Builder from '..';
import { warn } from '../helpers';
import { BuildFile } from './file';

interface Inc {
  what: string;
  require: boolean;
}

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

  async process(filename: string, contents: string | Buffer) {
    contents = contents.toString();
    const ast = PhpFile.parser.parseCode(contents, filename);
    // console.log(ast);
    // console.log(JSON.stringify(ast, undefined, 2));
    strictEqual(ast.errors.length, 0);
    
    const globals: Set<string> = new Set();
    const addIfVar = (node: Node) => {
      // TODO: support `list`
      if (NodeIsVariable(node)) {
        if (typeof node.name !== 'string') warn('encountered dynamic variable access at top level', { ...node.loc!, file: filename });
        else globals.add(node.name);
      }
    };
    for (const expr of ast.children) {
      if (NodeIsExpressionStatement(expr) && NodeIsAssign(expr.expression)) {
        addIfVar(expr.expression.left);
      }
    }

    const includes: Array<Include> = collectIncludes(ast.children);
    const incpaths: Array<Inc> = [];
    
    let newcontents = contents;
    let offset = 0;
    // TODO: replace magic constants
    for (const include of includes) {
      if (!NodeIsString(include.target)) throw `Node kind \`${include.target.kind}\` not supported for includes`;
      const what = join(dirname(filename), include.target.value);
      incpaths.push({ what, require: include.require });
      const call = BuildFile.generateModuleCall(what, include.require, include.once, newcontents[include.loc!.end.offset + offset - 1] === ';');
      const oldlen = include.loc!.end.offset - include.loc!.start.offset;
      const newlen = call.length;
      newcontents = newcontents.substring(0, include.loc!.start.offset + offset) + call + newcontents.substring(include.loc!.end.offset + offset);
      offset += newlen - oldlen;
    }
    newcontents = newcontents.trim().replace(/^<\?(php)?[^\S\r\n]*\n?|\n?[^\S\r\n]*\?>$/, '');
    if (ast.children.length) {
      if (ast.children[0].kind === 'inline' && !newcontents.match(/^\?>/)) newcontents = '?>' + newcontents;
      if (ast.children[ast.children.length - 1].kind === 'inline' && !newcontents.match(/<\?(php)?$/)) newcontents += '<?php';
    }
    if (globals.size) newcontents = `global ${Array.from(globals).map(s => `$${s}`).join(', ')};\n${newcontents}`;
    this.setContent(filename, newcontents);
    for (const inc of incpaths) {
      if (!(await this.builder.buildFileIfNotCached(inc.what, inc.require)))
        return false;
    }
    return true;
  }

}

function collectIncludes(node: Node | Node[] | null) {
  const includes: Array<Include> = [];
  // TODO: some of these could be collapsed, is that more readable?
  if (node === null) {
  } else if (Array.isArray(node)) {
    for (const n of node) {
      includes.push.apply(includes, collectIncludes(n));
    }
  } else if (NodeIsArray(node)) {
    includes.push.apply(includes, collectIncludes(node.items));
  } else if (NodeIsArrowFunc(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsAssign(node)) {
    includes.push.apply(includes, collectIncludes(node.right));
  } else if (NodeIsBin(node)) {
    includes.push.apply(includes, collectIncludes(node.left));
    includes.push.apply(includes, collectIncludes(node.right));
  } else if (NodeIsBlock(node)) {
    includes.push.apply(includes, collectIncludes(node.children));
  } else if (NodeIsByRef(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
  } else if (NodeIsCall(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
    includes.push.apply(includes, collectIncludes(node.arguments));
  } else if (NodeIsCase(node)) {
    includes.push.apply(includes, collectIncludes(node.test));
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsCast(node)) {
    includes.push.apply(includes, collectIncludes(node.expr));
  } else if (NodeIsCatch(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsClass(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsClassConstant(node)) {
    includes.push.apply(includes, collectIncludes(node.constants));
  } else if (NodeIsClone(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
  } else if (NodeIsClosure(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsConstant(node)) {
    if (typeof node.value !== "string" && typeof node.value !== "number" && typeof node.value !== "boolean")
      includes.push.apply(includes, collectIncludes(node.value));
  } else if (NodeIsConstantStatement(node)) {
    includes.push.apply(includes, collectIncludes(node.constants));
  } else if (NodeIsDeclare(node)) {
    includes.push.apply(includes, collectIncludes(node.children));
  } else if (NodeIsDeclareDirective(node)) {
    if (typeof node.value !== "string" && typeof node.value !== "number" && typeof node.value !== "boolean")
      includes.push.apply(includes, collectIncludes(node.value));
  } else if (NodeIsDo(node)) {
    includes.push.apply(includes, collectIncludes(node.test));
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsEcho(node)) {
    includes.push.apply(includes, collectIncludes(node.expressions));
  } else if (NodeIsEncapsed(node)) {
    includes.push.apply(includes, collectIncludes(node.value));
  } else if (NodeIsEncapsedPart(node)) {
    includes.push.apply(includes, collectIncludes(node.expression));
  } else if (NodeIsEntry(node)) {
    includes.push.apply(includes, collectIncludes(node.value));
  } else if (NodeIsEval(node)) {
    includes.push.apply(includes, collectIncludes(node.source));
  } else if (NodeIsExit(node)) {
    includes.push.apply(includes, collectIncludes(node.expression));
  } else if (NodeIsExpressionStatement(node)) {
    includes.push.apply(includes, collectIncludes(node.expression));
  } else if (NodeIsFor(node)) {
    includes.push.apply(includes, collectIncludes(node.init));
    includes.push.apply(includes, collectIncludes(node.test));
    includes.push.apply(includes, collectIncludes(node.increment));
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsForeach(node)) {
    includes.push.apply(includes, collectIncludes(node.source));
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsFunction(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsIf(node)) {
    includes.push.apply(includes, collectIncludes(node.test));
    includes.push.apply(includes, collectIncludes(node.body));
    includes.push.apply(includes, collectIncludes(node.alternate));
  } else if (NodeIsInclude(node)) {
    includes.push(node);
  } else if (NodeIsInterface(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsMagic(node)) {
    warn('Magic constants are not currently altered', node.loc!);
  } else if (NodeIsMethod(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsNamespace(node)) {
    throw "namespaces are not supported";
  } else if (NodeIsNew(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
    includes.push.apply(includes, collectIncludes(node.arguments));
  } else if (NodeIsOffsetLookup(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
    includes.push.apply(includes, collectIncludes(node.offset));
  } else if (NodeIsPost(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
  } else if (NodeIsPre(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
  } else if (NodeIsProperty(node)) {
    includes.push.apply(includes, collectIncludes(node.value));
  } else if (NodeIsPropertyLookup(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
    includes.push.apply(includes, collectIncludes(node.offset));
  } else if (NodeIsPropertyStatement(node)) {
    includes.push.apply(includes, collectIncludes(node.properties));
  } else if (NodeIsRetIf(node)) {
    includes.push.apply(includes, collectIncludes(node.test));
    includes.push.apply(includes, collectIncludes(node.trueExpr));
    includes.push.apply(includes, collectIncludes(node.falseExpr));
  } else if (NodeIsReturn(node)) {
    includes.push.apply(includes, collectIncludes(node.expr));
  } else if (NodeIsStatic(node)) {
    includes.push.apply(includes, collectIncludes(node.variables));
  } else if (NodeIsStaticLookup(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
    includes.push.apply(includes, collectIncludes(node.offset));
  } else if (NodeIsStaticVariable(node)) {
    if (typeof node.defaultValue !== "string" && typeof node.defaultValue !== "number" && typeof node.defaultValue !== "boolean")
      includes.push.apply(includes, collectIncludes(node.defaultValue));
  } else if (NodeIsSwitch(node)) {
    includes.push.apply(includes, collectIncludes(node.test));
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsThrow(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
  } else if (NodeIsTrait(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsTry(node)) {
    includes.push.apply(includes, collectIncludes(node.body));
    includes.push.apply(includes, collectIncludes(node.catches));
    includes.push.apply(includes, collectIncludes(node.always));
  } else if (NodeIsUnary(node)) {
    includes.push.apply(includes, collectIncludes(node.what));
  } else if (NodeIsWhile(node)) {
    includes.push.apply(includes, collectIncludes(node.test));
    includes.push.apply(includes, collectIncludes(node.body));
  } else if (NodeIsYield(node)) {
    includes.push.apply(includes, collectIncludes(node.value));
    includes.push.apply(includes, collectIncludes(node.key));
  } else if (NodeIsYieldFrom(node)) {
    includes.push.apply(includes, collectIncludes(node.value));
  } else if (node.kind === undefined) {
    throw "something went wrong";
  }
  return includes;
}
function NodeIsArray(node: Node): node is _Array { return node.kind === 'array'; }
function NodeIsArrowFunc(node: Node): node is ArrowFunc { return node.kind === 'arrowfunc'; }
function NodeIsAssign(node: Node): node is (Assign | AssignRef) { return node.kind === 'assign' || node.kind === 'assignref'; }
function NodeIsBin(node: Node): node is Bin { return node.kind === 'bin'; }
function NodeIsBlock(node: Node): node is Block { return node.kind === 'block'; }
function NodeIsByRef(node: Node): node is ByRef { return node.kind === 'byref'; }
function NodeIsCall(node: Node): node is Call { return node.kind === 'call'; }
function NodeIsCase(node: Node): node is Case { return node.kind === 'case'; }
function NodeIsCast(node: Node): node is Cast { return node.kind === 'cast'; }
function NodeIsCatch(node: Node): node is Catch { return node.kind === 'catch'; }
function NodeIsClass(node: Node): node is Class { return node.kind === 'class'; }
function NodeIsClassConstant(node: Node): node is ClassConstant { return node.kind === 'classconstant'; }
function NodeIsClone(node: Node): node is Clone { return node.kind === 'clone'; }
function NodeIsClosure(node: Node): node is Closure { return node.kind === 'closure'; }
function NodeIsConstant(node: Node): node is Constant { return node.kind === 'constant'; }
function NodeIsConstantStatement(node: Node): node is ConstantStatement { return node.kind === 'constantstatement'; }
function NodeIsDeclare(node: Node): node is Declare { return node.kind === 'declare'; }
function NodeIsDeclareDirective(node: Node): node is DeclareDirective { return node.kind === 'declaredirective'; }
function NodeIsDo(node: Node): node is Do { return node.kind === 'do'; }
function NodeIsEcho(node: Node): node is Echo { return node.kind === 'echo'; }
function NodeIsEncapsed(node: Node): node is Encapsed { return node.kind === 'encapsed'; }
function NodeIsEncapsedPart(node: Node): node is EncapsedPart { return node.kind === 'encapsedpart'; }
function NodeIsEntry(node: Node): node is Entry { return node.kind === 'entry'; }
function NodeIsEval(node: Node): node is Eval { return node.kind === 'eval'; }
function NodeIsExit(node: Node): node is Exit { return node.kind === 'exit'; }
function NodeIsExpressionStatement(node: Node): node is ExpressionStatement { return node.kind === 'expressionstatement'; }
function NodeIsFor(node: Node): node is For { return node.kind === 'for'; }
function NodeIsForeach(node: Node): node is Foreach { return node.kind === 'foreach'; }
function NodeIsFunction(node: Node): node is Function { return node.kind === 'function'; }
function NodeIsIf(node: Node): node is If { return node.kind === 'if'; }
function NodeIsInclude(node: Node): node is Include { return node.kind === 'include'; }
function NodeIsInterface(node: Node): node is Interface { return node.kind === 'interface'; }
function NodeIsMagic(node: Node): node is Magic { return node.kind === 'magic'; }
function NodeIsMethod(node: Node): node is Method { return node.kind === 'method'; }
function NodeIsNamespace(node: Node): node is Namespace { return node.kind === 'namespace'; }
function NodeIsNew(node: Node): node is New { return node.kind === 'new'; }
function NodeIsOffsetLookup(node: Node): node is OffsetLookup { return node.kind === 'offsetlookup'; }
function NodeIsPost(node: Node): node is Post { return node.kind === 'post'; }
function NodeIsPre(node: Node): node is Pre { return node.kind === 'pre'; }
function NodeIsProperty(node: Node): node is Property { return node.kind === 'property'; }
function NodeIsPropertyLookup(node: Node): node is PropertyLookup { return node.kind === 'propertylookup'; }
function NodeIsPropertyStatement(node: Node): node is PropertyStatement { return node.kind === 'propertystatement'; }
function NodeIsRetIf(node: Node): node is RetIf { return node.kind === 'retif'; }
function NodeIsReturn(node: Node): node is Return { return node.kind === 'return'; }
function NodeIsStatic(node: Node): node is Static { return node.kind === 'static'; }
function NodeIsStaticLookup(node: Node): node is StaticLookup { return node.kind === 'staticlookup'; }
function NodeIsStaticVariable(node: Node): node is StaticVariable { return node.kind === 'staticvariable'; }
function NodeIsString(node: Node): node is String { return node.kind === 'string'; }
function NodeIsSwitch(node: Node): node is Switch { return node.kind === 'switch'; }
function NodeIsThrow(node: Node): node is Throw { return node.kind === 'throw'; }
function NodeIsTrait(node: Node): node is Trait { return node.kind === 'trait'; }
function NodeIsTry(node: Node): node is Try { return node.kind === 'try'; }
function NodeIsUnary(node: Node): node is Unary { return node.kind === 'unary'; }
function NodeIsVariable(node: Node): node is Variable { return node.kind === 'variable'; }
function NodeIsWhile(node: Node): node is While { return node.kind === 'while'; }
function NodeIsYield(node: Node): node is Yield { return node.kind === 'yield'; }
function NodeIsYieldFrom(node: Node): node is YieldFrom { return node.kind === 'yieldfrom'; }

export { PhpFile };
