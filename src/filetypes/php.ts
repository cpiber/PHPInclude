import { strictEqual } from 'assert';
import { Array as _Array, ArrowFunc, Assign, AssignRef, Bin, Block, ByRef, Call, Case, Cast, Catch, Clone, Closure, Constant, ConstantStatement, Declare, DeclareDirective, Do, Encapsed, EncapsedPart, Engine, Entry, Eval, Exit, ExpressionStatement, For, Foreach, Function, If, Include, Lookup, Method, Namespace, New, Node, OffsetLookup, Parameter, Property, PropertyLookup, PropertyStatement, RetIf, Return, Silent, Static, StaticLookup, StaticVariable, Switch, Throw, Trait, TraitUse, Try, Unary, Variable, Variadic, While, Yield, YieldFrom } from 'php-parser';
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
    console.log(ast);
    strictEqual(ast.errors.length, 0);
    
    const globals: string[] = [];
    const addIfVar = (node: Node) => {
      if (NodeIsVariable(node)) {
        if (typeof node.name !== 'string') warn(`encountered dynamic variable access at top level (${node.loc})`);
        else globals.push(node.name);
      }
    };
    for (const expr of ast.children) {
      if (NodeIsExpressionStatement(expr) && NodeIsAssign(expr.expression)) {
        addIfVar(expr.expression.left);
      }
    }
    const g = new Set(globals);
    
    let newcontents = contents;
    // TODO: replace includes
    newcontents = newcontents.trim().replace(/^<\?(php)?[^\S\r\n]*\n?|\n?[^\S\r\n]*\?>$/, '');
    if (ast.children.length) {
      if (ast.children[ast.children.length - 1].kind === 'inline' && !newcontents.match(/<\?(php)?$/)) newcontents += '\n<?php';
      if (ast.children[0].kind === 'inline' && !newcontents.match(/^\?>/)) newcontents = '?>\n' + newcontents;
    }
    if (g.size) newcontents = `global ${Array.from(g).map(s => `$${s}`).join(', ')};\n${newcontents}`;
    this.setContent(filename, newcontents);
    return true;
  }

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
function NodeIsClone(node: Node): node is Clone { return node.kind === 'clone'; }
function NodeIsClosure(node: Node): node is Closure { return node.kind === 'closure'; }
function NodeIsConstant(node: Node): node is Constant { return node.kind === 'constant'; }
function NodeIsConstantStatement(node: Node): node is ConstantStatement { return node.kind === 'constantstatement'; }
function NodeIsDeclare(node: Node): node is Declare { return node.kind === 'declare'; }
function NodeIsDeclareDirective(node: Node): node is DeclareDirective { return node.kind === 'declaredirective'; }
function NodeIsDo(node: Node): node is Do { return node.kind === 'do'; }
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
function NodeIsLookup(node: Node): node is Lookup { return node.kind === 'lookup'; }
function NodeIsMethod(node: Node): node is Method { return node.kind === 'method'; }
function NodeIsNamespace(node: Node): node is Namespace { return node.kind === 'namespace'; }
function NodeIsNew(node: Node): node is New { return node.kind === 'new'; }
function NodeIsOffsetLookup(node: Node): node is OffsetLookup { return node.kind === 'offsetlookup'; }
function NodeIsParameter(node: Node): node is Parameter { return node.kind === 'parameter'; }
function NodeIsProperty(node: Node): node is Property { return node.kind === 'property'; }
function NodeIsPropertyLookup(node: Node): node is PropertyLookup { return node.kind === 'propertylookup'; }
function NodeIsPropertyStatement(node: Node): node is PropertyStatement { return node.kind === 'propertystatement'; }
function NodeIsRetIf(node: Node): node is RetIf { return node.kind === 'retif'; }
function NodeIsReturn(node: Node): node is Return { return node.kind === 'return'; }
function NodeIsSilent(node: Node): node is Silent { return node.kind === 'silent'; }
function NodeIsStatic(node: Node): node is Static { return node.kind === 'static'; }
function NodeIsStaticLookup(node: Node): node is StaticLookup { return node.kind === 'staticlookup'; }
function NodeIsStaticVariable(node: Node): node is StaticVariable { return node.kind === 'staticvariable'; }
function NodeIsSwitch(node: Node): node is Switch { return node.kind === 'switch'; }
function NodeIsThrow(node: Node): node is Throw { return node.kind === 'throw'; }
function NodeIsTrait(node: Node): node is Trait { return node.kind === 'trait'; }
function NodeIsTraitUse(node: Node): node is TraitUse { return node.kind === 'traituse'; }
function NodeIsTry(node: Node): node is Try { return node.kind === 'try'; }
function NodeIsUnary(node: Node): node is Unary { return node.kind === 'unary'; }
function NodeIsVariable(node: Node): node is Variable { return node.kind === 'variable'; }
function NodeIsVariadic(node: Node): node is Variadic { return node.kind === 'variadic'; }
function NodeIsWhile(node: Node): node is While { return node.kind === 'while'; }
function NodeIsYield(node: Node): node is Yield { return node.kind === 'yield'; }
function NodeIsYieldFrom(node: Node): node is YieldFrom { return node.kind === 'yieldfrom'; }

export { PhpFile };
