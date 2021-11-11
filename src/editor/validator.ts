import Fuse from "fuse.js";
import {
    AssignmentModifier,
    AugmentedAssignmentModifier,
    AutocompleteTkn,
    CodeConstruct,
    EditableTextTkn,
    ElseStatement,
    EmptyLineStmt,
    FormattedStringCurlyBracketsExpr as FormattedStringCurlyBracketsExpr,
    FormattedStringExpr,
    IdentifierTkn,
    IfStatement,
    ImportStatement,
    ListLiteralExpression,
    LiteralValExpr,
    Modifier,
    NonEditableTkn,
    Statement,
    TypedEmptyExpr,
    ValueOperationExpr,
    VarAssignmentStmt,
    VariableReferenceExpr,
} from "../syntax-tree/ast";
import { Module } from "../syntax-tree/module";
import { Reference } from "../syntax-tree/scope";
import { VariableController } from "../syntax-tree/variable-controller";
import { isImportable } from "../utilities/util";
import { DataType, InsertionType, NumberRegex } from "./../syntax-tree/consts";
import { EditCodeAction } from "./action-filter";
import { Context } from "./focus";

export class Validator {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    canSwitchLeftNumToAutocomplete(pressedKey: string, providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            context.expressionToLeft instanceof LiteralValExpr &&
            !(context.tokenToRight instanceof AutocompleteTkn) &&
            !NumberRegex.test(context.expressionToLeft.getValue() + pressedKey)
        );
    }

    canSwitchRightNumToAutocomplete(pressedKey: string, providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            context.expressionToRight instanceof LiteralValExpr &&
            !(context.tokenToLeft instanceof AutocompleteTkn) &&
            !NumberRegex.test(context.expressionToRight.getValue() + pressedKey)
        );
    }

    atBeginningOfValOperation(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        const isCorrectExprType =
            context.expressionToRight instanceof VariableReferenceExpr ||
            context.expressionToRight instanceof LiteralValExpr;

        const hasCorrectRootType =
            context.expressionToRight.rootNode instanceof Modifier ||
            context.expressionToRight.rootNode instanceof VarAssignmentStmt ||
            context.expressionToRight.rootNode instanceof ValueOperationExpr;

        return isCorrectExprType && hasCorrectRootType;
    }

    isAboveElseStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return this.getNextSibling(context) instanceof ElseStatement;
    }

    onBeginningOfLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.position.column == context.lineStatement.left;
    }

    /**
     * logic: if next statement is either else or elif => false
     * if prev is either if or elif => return true
     */
    canInsertElseStmtAtCurIndent(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        const prevStmt = this.getPrevSibling(context);
        const nextStmt = this.getNextSibling(context);

        if (nextStmt instanceof ElseStatement) return false; // either else or elif

        if (prevStmt instanceof IfStatement || (prevStmt instanceof ElseStatement && prevStmt.hasCondition))
            return true;

        return false;
    }

    /**
     * logic: if next statement is either else => false
     * if prev is either if or elif => return true
     */
    canInsertElifStmtAtCurIndent(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const prevStmt = this.getPrevSibling(context);

        if (prevStmt instanceof ElseStatement && !prevStmt.hasCondition) return false;

        if (prevStmt instanceof IfStatement || (prevStmt instanceof ElseStatement && prevStmt.hasCondition))
            return true;

        return false;
    }

    /**
     * This function expects that we've tried inserting the else at the current indent
     * before calling this function.
     *
     * logic: returns false if inside else, or the item's root has a sibling before it which was an else,
     * or the item's root has a sibling after it which is either an if or an elif.
     * returns true => within if AND the current body does not have a else/elif sibling afterwards
     * returns true => within elif AND the current body does not have an else sibling afterwards
     */
    canInsertElseStmtAtPrevIndent(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        const prevStmtOfRoot = this.getPrevSiblingOfRoot(context);
        const nextStmtOfRoot = this.getNextSiblingOfRoot(context);
        const curStmtRoot = context.lineStatement.rootNode as Statement | Module;

        if (
            (curStmtRoot instanceof ElseStatement && !curStmtRoot.hasCondition) ||
            nextStmtOfRoot instanceof ElseStatement ||
            (prevStmtOfRoot instanceof ElseStatement && !prevStmtOfRoot.hasCondition) ||
            context.lineStatement.indexInRoot == 0
        ) {
            // if inside else statement
            // if this item's root has a sibling afterward which is either an else or an elif
            // if this item's root has a sibling before it which was an else
            return false;
        }

        if (curStmtRoot instanceof IfStatement && !(nextStmtOfRoot instanceof ElseStatement)) return true;
        if (
            curStmtRoot instanceof ElseStatement &&
            curStmtRoot.hasCondition &&
            !(nextStmtOfRoot instanceof ElseStatement && !nextStmtOfRoot.hasCondition)
        )
            return true;

        return false;
    }

    /**
     * This function expects that we've tried inserting the elif at the current indent
     * before calling this function.
     *
     * logic: returns false if inside else, or the item's root has a sibling before it which was an else.
     * returns true if current item's root is either an if or an elif.
     */
    canInsertElifStmtAtPrevIndent(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        const prevStmtOfRoot = this.getPrevSiblingOfRoot(context);
        const curStmtRoot = context.lineStatement.rootNode as Statement | Module;

        if (
            (curStmtRoot instanceof ElseStatement && !curStmtRoot.hasCondition) ||
            (prevStmtOfRoot instanceof ElseStatement && !prevStmtOfRoot.hasCondition) ||
            context.lineStatement.indexInRoot == 0
        ) {
            // if inside else statement
            // if this item's root has a sibling before it which was an else
            return false;
        }

        if (curStmtRoot instanceof IfStatement || (curStmtRoot instanceof ElseStatement && curStmtRoot.hasCondition)) {
            return true;
        }

        return false;
    }

    /**
     * Checks if context.lineStatement is an empty line
     */
    onEmptyLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.lineStatement instanceof EmptyLineStmt;
    }

    /**
     * logic: checks if at the end of an editable text
     * OR selected an empty editable text / identifier
     * OR right before an editable item and need to select it
     */
    canMoveToNextTokenAtTextEditable(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            ((context.tokenToRight instanceof IdentifierTkn || context.tokenToRight instanceof EditableTextTkn) &&
                context.tokenToRight.isEmpty) ||
            context.tokenToLeft instanceof EditableTextTkn ||
            context.tokenToLeft instanceof IdentifierTkn ||
            (context.token?.isEmpty && context.selected)
        );
    }

    /**
     * logic: checks if at the beginning of an editable text
     * OR selected an empty editable text / identifier
     */
    canMoveToPrevTokenAtTextEditable(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            (context.tokenToLeft instanceof IdentifierTkn && context.tokenToRight.isEmpty) ||
            context.tokenToRight instanceof EditableTextTkn ||
            context.tokenToRight instanceof IdentifierTkn ||
            (context.token?.isEmpty && context.selected)
        );
    }

    canInsertEmptyLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const curPosition = this.module.editor.monaco.getPosition();

        return (
            !context.selected &&
            (curPosition.column == context.lineStatement.left || curPosition.column == context.lineStatement.right)
        );
    }

    /**
     * logic: checks if currently at an empty line.
     * AND is not the only line of the body of a compound statement or Module.
     * AND is not the last line (in the Module or in a compound statement)
     */
    canDeleteCurLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.lineStatement instanceof EmptyLineStmt) {
            return (
                (context.lineStatement.rootNode instanceof Statement ||
                    context.lineStatement.rootNode instanceof Module) &&
                context.lineStatement.rootNode.body.length != 1 &&
                context.lineStatement.indexInRoot != context.lineStatement.rootNode.body.length - 1
            );
        }

        return false;
    }

    canBackspaceCurEmptyLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.lineStatement instanceof EmptyLineStmt) {
            return (
                (context.lineStatement.rootNode instanceof Statement ||
                    context.lineStatement.rootNode instanceof Module) &&
                context.lineStatement.rootNode.body.length != 1 &&
                context.lineStatement.lineNumber != 1
            );
        }

        return false;
    }

    /**
     * logic: checks if the above line is an empty line.
     * AND should be at the beginning of the line.
     */
    canDeletePrevLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const curPosition = this.module.editor.monaco.getPosition();

        return curPosition.column == context.lineStatement.left && this.getLineAbove() instanceof EmptyLineStmt;
    }

    /**
     * logic: checks if at the beginning of a statement, and not text editable.
     * the statement must NOT have a body
     */
    canDeleteNextStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            !(context.lineStatement instanceof EmptyLineStmt) &&
            this.module.focus.onBeginningOfLine() &&
            !context.lineStatement.hasBody()
        ) {
            if (this.module.focus.isTextEditable(providedContext)) {
                if (context.tokenToRight.isEmpty) return true;
                else return false;
            } else return true;
        }

        return false;
    }

    /**
     * logic: checks if at the beginning of a statement, and not text editable.
     * the statement must have a body
     */
    canDeleteNextMultilineStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            !(context.lineStatement instanceof EmptyLineStmt) &&
            this.module.focus.onBeginningOfLine() &&
            context.lineStatement.hasBody()
        ) {
            if (this.module.focus.isTextEditable(providedContext)) {
                if (context.tokenToRight.isEmpty) return true;
                else return false;
            } else return true;
        }

        return false;
    }

    /**
     * logic: checks if at the beginning of a multiline statement
     */
    canMoveLeftOnEmptyMultilineStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            context.lineStatement instanceof EmptyLineStmt &&
            context.lineStatement.indexInRoot == 0 &&
            context.lineStatement.rootNode instanceof Statement
        );
    }

    /**
     * logic: checks if at the end of a statement, and not text editable.
     * AND does not have a body.
     * AND prev item is not an expression that could be deleted by it self.
     */
    canDeletePrevStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            !(context.lineStatement instanceof EmptyLineStmt) &&
            !context.lineStatement?.hasBody() &&
            this.module.focus.onEndOfLine() &&
            !this.module.focus.isTextEditable(providedContext)
        ) {
            if (context.expressionToLeft != null) return false;

            return true;
        }

        return false;
    }

    /**
     * logic: checks if at the end of a statement, and not text editable.
     * AND prev item is not an expression that could be deleted by it self.
     */
    canDeletePrevMultiLineStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            !(context.lineStatement instanceof EmptyLineStmt) &&
            this.module.focus.onEndOfLine() &&
            !this.module.focus.isTextEditable(providedContext)
        ) {
            if (context.expressionToLeft != null) return false;

            return true;
        }

        return false;
    }

    canDeletePrevFStringCurlyBrackets(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // "print(f'{}|')"
        return context.expressionToLeft instanceof FormattedStringCurlyBracketsExpr;
    }

    canDeleteNextFStringCurlyBrackets(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // "print(f'|{}')"
        return context.expressionToRight instanceof FormattedStringCurlyBracketsExpr;
    }

    canDeleteStringLiteral(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            (context.tokenToLeft?.text == '"' || context.tokenToLeft?.text == "'") &&
            (context.tokenToRight?.text == '"' || context.tokenToRight?.text == "'")
        );
    }

    /**
     * logic: checks if at the beginning of an expression, and not at the beginning of a line (statement)
     */
    canDeleteNextToken(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            !this.module.focus.onBeginningOfLine() &&
            context.expressionToRight != null &&
            !this.module.focus.isTextEditable(providedContext)
        );
    }

    /**
     * logic: checks if at the end of an expression
     */
    canDeletePrevToken(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.expressionToLeft != null && !this.module.focus.isTextEditable(providedContext);
    }

    shouldDeleteVarAssignmentOnHole(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.token instanceof TypedEmptyExpr && context.selected) {
            const root = context.token.rootNode;

            if (root instanceof VarAssignmentStmt) {
                return true; // this.module.variableController.isVarStmtReassignment(root, this.module);
            }
        }

        return false;
    }

    shouldDeleteHole(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.token instanceof TypedEmptyExpr && context.selected) {
            const root = context.token.rootNode;

            if (root instanceof AugmentedAssignmentModifier || root instanceof AssignmentModifier) return true;
        }

        return false;
    }

    canIndentBackIfStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            this.module.focus.onBeginningOfLine() &&
            context.lineStatement.rootNode instanceof Statement &&
            context.lineStatement.rootNode.hasBody() &&
            context.lineStatement instanceof IfStatement &&
            !(this.getNextSiblingOfRoot() instanceof ElseStatement) &&
            !this.canDeletePrevLine(context)
        ) {
            const rootsBody = context.lineStatement.rootNode.body;

            if (rootsBody.length != 1) {
                for (let i = context.lineStatement.indexInRoot + 1; i < rootsBody.length; i++) {
                    if (!(rootsBody[i] instanceof ElseStatement)) return false;
                }
            }

            return true;
        }

        return false;
    }

    isAboveLineIndentedForward(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.lineStatement.lineNumber > 2) {
            const lineAbove = this.module.focus.getStatementAtLineNumber(context.lineStatement.lineNumber - 1);

            return context.lineStatement.left < lineAbove.left;
        }
    }

    canIndentForwardIfStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            this.module.focus.onBeginningOfLine() &&
            this.isAboveLineIndentedForward() &&
            context.lineStatement instanceof IfStatement
        );
    }

    /**
     * logic:
     * checks if at the beginning of a line
     * AND if it is inside the body of another statement
     * AND if it is the last line of that body
     * AND if the above line is not an empty line
     * AND if it is not the only line of that body
     */
    canIndentBack(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            this.module.focus.onBeginningOfLine() &&
            context.lineStatement.rootNode instanceof Statement &&
            !(context.lineStatement instanceof ElseStatement) &&
            !(context.lineStatement instanceof IfStatement) &&
            !(this.getNextSiblingOfRoot(context) instanceof ElseStatement) &&
            context.lineStatement.rootNode.hasBody()
        ) {
            const rootsBody = context.lineStatement.rootNode.body;

            return (
                !this.canDeletePrevLine(context) &&
                rootsBody.length != 1 &&
                context.lineStatement.indexInRoot == rootsBody.length - 1
            );
        }

        return false;
    }

    /**
     * logic:
     * checks if at the beginning of an empty line
     * AND if it is inside the body of another statement
     * AND if every other line after this line is an empty line
     * AND if the above line is not an empty line
     * AND if it is not the only line of that body
     */
    canDeleteBackMultiEmptyLines(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            context.lineStatement instanceof EmptyLineStmt &&
            context.lineStatement.rootNode instanceof Statement &&
            context.lineStatement.rootNode.hasBody() &&
            !(this.getNextSiblingOfRoot(context) instanceof ElseStatement)
        ) {
            const rootsBody = context.lineStatement.rootNode.body;
            let onlyEmptyLines = true;

            for (let i = context.lineStatement.indexInRoot + 1; i < rootsBody.length; i++) {
                if (!(rootsBody[i] instanceof EmptyLineStmt)) {
                    onlyEmptyLines = false;

                    break;
                }
            }

            return onlyEmptyLines && context.lineStatement.indexInRoot != 0;
        }

        return false;
    }

    /**
     * logic:
     * checks if at the beginning of a line
     * AND if the above line is an indented line.
     */
    canIndentForward(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            this.module.focus.onBeginningOfLine() &&
            !(context.lineStatement instanceof ElseStatement) &&
            !(context.lineStatement instanceof IfStatement) &&
            this.isAboveLineIndentedForward()
        );
    }

    canInsertEmptyList(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            context.token instanceof TypedEmptyExpr &&
            context.token.isEmpty &&
            (context.token.type.indexOf(DataType.Any) >= 0 || context.token.type.indexOf(DataType.AnyList) >= 0)
        );
    }

    canDeleteListItemToLeft(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.selected && context.token != null && context.token.rootNode instanceof ListLiteralExpression) {
            const itemBefore = context.token.rootNode.tokens[context.token.indexInRoot - 1];

            // [---, |---|] [---, "123", |---|] [---, |---|, 123]
            if (itemBefore instanceof NonEditableTkn && itemBefore.text == ", ") return true;
        }

        return false;
    }

    canDeleteListItemToRight(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            context.selected &&
            context.token != null &&
            context.token.rootNode instanceof ListLiteralExpression &&
            context.token.rootNode.tokens.length != 3
        ) {
            const itemBefore = context.token.rootNode.tokens[context.token.indexInRoot - 1];

            // [|---|, ---] [|---|, "123"] [|---|, ---, 123]
            if (itemBefore instanceof NonEditableTkn && itemBefore.text == "[") return true;
        }

        return false;
    }

    canAddListItemToRight(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // [asd|] [asd, fgh|] [asd|, fgh] => , ---
        return (
            context?.tokenToRight instanceof NonEditableTkn &&
            context?.tokenToRight?.rootNode instanceof ListLiteralExpression &&
            (context?.tokenToRight?.text == "]" || context?.tokenToRight?.text == ", ")
        );
    }

    canAddListItemToLeft(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // [|asd] [|asd, fgh] [asd, |fgh] => ---,

        return (
            context?.tokenToLeft instanceof NonEditableTkn &&
            context?.tokenToLeft?.rootNode instanceof ListLiteralExpression &&
            (context?.tokenToLeft?.text == "[" || context?.tokenToLeft?.text == ", ")
        );
    }

    atRightOfExpression(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context?.expressionToLeft != null && context?.expressionToLeft?.returns != DataType.Void;
    }

    atLeftOfExpression(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context?.expressionToRight != null && context?.expressionToRight?.returns != DataType.Void;
    }

    atEmptyExpressionHole(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.selected && context?.token?.isEmpty && context.token instanceof TypedEmptyExpr;
    }

    insideFormattedString(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.token instanceof FormattedStringExpr;
    }

    canInsertFormattedString(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            context.selected &&
            context?.token?.isEmpty &&
            context.token instanceof TypedEmptyExpr &&
            !(context.token.rootNode instanceof FormattedStringCurlyBracketsExpr)
        );
    }

    canConvertAutocompleteToString(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            context.tokenToRight instanceof AutocompleteTkn && context.tokenToRight.left != context.lineStatement.left
        );
    }

    private getPrevSibling(providedContext?: Context): Statement {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return this.getStatementInBody(
            context?.lineStatement?.rootNode as Statement | Module,
            context?.lineStatement?.indexInRoot - 1
        );
    }

    private getNextSibling(providedContext?: Context): Statement {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return this.getStatementInBody(
            context?.lineStatement?.rootNode as Statement | Module,
            context?.lineStatement?.indexInRoot + 1
        );
    }

    private getNextSiblingOfRoot(providedContext?: Context): Statement {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const curRoot = context?.lineStatement?.rootNode;

        if (curRoot instanceof Statement) {
            return this.getStatementInBody(curRoot.rootNode as Statement | Module, curRoot.indexInRoot + 1);
        }

        return null;
    }

    private getPrevSiblingOfRoot(providedContext?: Context): Statement {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const curRoot = context?.lineStatement?.rootNode;

        if (curRoot instanceof Statement) {
            return this.getStatementInBody(curRoot.rootNode as Statement | Module, curRoot.indexInRoot - 1);
        }

        return null;
    }

    private getStatementInBody(bodyContainer: Statement | Module, index: number): Statement {
        if (index >= 0 && index < bodyContainer.body.length) {
            return bodyContainer.body[index];
        }

        return null;
    }

    private getLineBelow(providedContext?: Context): Statement {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return this.module.focus.getStatementAtLineNumber(context?.lineStatement?.lineNumber + 1);
    }

    private getLineAbove(providedContext?: Context): Statement {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        const curLineNumber = context?.lineStatement?.lineNumber;

        if (curLineNumber > 1) return this.module.focus.getStatementAtLineNumber(curLineNumber - 1);

        return null;
    }

    //returns a nested list [[Reference, InsertionType], ...]
    static getValidVariableReferences(
        code: CodeConstruct,
        variableController: VariableController
    ): [Reference, InsertionType][] {
        const refs: Reference[] = [];
        const mappedRefs: [Reference, InsertionType][] = []; //no point of making this a map since we don't have access to the refs whereever this method is used. Otherwise would have to use buttonId or uniqueId as keys into the map.

        try {
            if (code instanceof TypedEmptyExpr || code instanceof EmptyLineStmt) {
                let scope =
                    code instanceof TypedEmptyExpr ? code.getParentStatement()?.scope : (code.rootNode as Module).scope; //line that contains "code"
                let currRootNode = code.rootNode;

                while (!scope) {
                    if (!(currRootNode instanceof Module)) {
                        if (currRootNode.getParentStatement()?.hasScope()) {
                            scope = currRootNode.getParentStatement().scope;
                        } else if (currRootNode.rootNode instanceof Statement) {
                            currRootNode = currRootNode.rootNode;
                        } else if (currRootNode.rootNode instanceof Module) {
                            scope = currRootNode.rootNode.scope;
                        }
                    } else {
                        break;
                    }
                }

                refs.push(...scope.getValidReferences(code.getSelection().startLineNumber));

                for (const ref of refs) {
                    if (ref.statement instanceof VarAssignmentStmt) {
                        if (code instanceof TypedEmptyExpr) {
                            if (
                                code.type.indexOf(
                                    variableController.getVariableTypeNearLine(
                                        scope,
                                        code.getLineNumber(),
                                        ref.statement.getIdentifier()
                                    )
                                ) > -1 ||
                                code.type.indexOf(DataType.Any) > -1
                            ) {
                                mappedRefs.push([ref, InsertionType.Valid]);
                            } else {
                                mappedRefs.push([ref, InsertionType.DraftMode]);
                            }
                        } else if (code instanceof EmptyLineStmt) {
                            //all variables can become var = --- so allow all of them to trigger draft mode
                            mappedRefs.push([ref, InsertionType.DraftMode]);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Unable to get valid variable references for " + code + "\n\n" + e);
        } finally {
            return mappedRefs;
        }
    }

    static matchEditCodeAction(
        searchString: string,
        possibilities: EditCodeAction[],
        searchKeys: string[]
    ): Fuse.FuseResult<EditCodeAction>[] {
        const options = {
            includeScore: true,
            includeMatches: true,
            shouldSort: true,
            findAllMatches: true,
            threshold: 0.5,
            keys: searchKeys,
        };
        const fuse = new Fuse(possibilities, options);

        return fuse.search(searchString);
    }

    validateImports(stmts?: ImportStatement[]) {
        if (!stmts) {
            stmts = this.module.getAllImportStmts();
        }
        this.module.performActionOnBFS((code: CodeConstruct) => {
            if (isImportable(code) && code.requiresImport()) {
                const importStatus = code.validateImportFromImportList(stmts);

                //This check is required otherwise it won't compile. In practice, it will always be a Statement becuase tokens are not importables
                if (code instanceof Statement) {
                    if (importStatus && code.draftModeEnabled) {
                        this.module.closeConstructDraftRecord(code);
                    } else if (!importStatus && !code.draftModeEnabled) {
                        this.module.openImportDraftMode(code);
                    }
                }
            }
        });
    }
}
