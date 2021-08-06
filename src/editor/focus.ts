import { ConstructName } from "./consts";
import { Module } from "../syntax-tree/module";
import { DataType } from "./../syntax-tree/consts";
import { Position, Selection } from "monaco-editor";
import { CallbackType } from "../syntax-tree/callback";
import {
    CodeConstruct,
    EditableTextTkn,
    EmptyLineStmt,
    Expression,
    IdentifierTkn,
    LiteralValExpr,
    NonEditableTkn,
    Statement,
    TextEditable,
    Token,
} from "../syntax-tree/ast";

export class Focus {
    module: Module;

    onNavChangeCallbacks = new Array<(c: Context) => void>();
    onNavOffCallbacks = new Map<ConstructName, Array<(c: Context) => void>>();

    prevPosition: Position = null;

    constructor(module: Module) {
        this.module = module;

        this.module.editor.monaco.onDidChangeCursorPosition((e) => this.fireOnNavChangeCallbacks());
    }

    subscribeOnNavChangeCallback(callback: (c: Context) => void) {
        this.onNavChangeCallbacks.push(callback);
    }

    subscribeOnNavOffCallbacks(constructName: ConstructName, callback: (c: Context) => void) {
        if (this.onNavOffCallbacks.get(constructName)) {
            const callbackArr = this.onNavOffCallbacks.get(constructName);
            callbackArr.push(callback);
            this.onNavOffCallbacks.set(constructName, callbackArr);
        } else {
            this.onNavOffCallbacks.set(constructName, [callback]);
        }
    }

    getContainingDraftNode(providedContext?: Context): CodeConstruct {
        const context = providedContext ? providedContext : this.getContext();
        const focusedNode = context.token && context.selected ? context.token : context.lineStatement;

        let node = null;

        if (context.expressionToLeft?.draftModeEnabled) {
            node = context.expressionToLeft;
        } else if (context.expressionToRight?.draftModeEnabled) {
            node = context.expressionToRight;
        } else if (
            focusedNode instanceof Token &&
            !(focusedNode.rootNode instanceof Module) &&
            focusedNode.rootNode.draftModeEnabled
        ) {
            node = focusedNode.rootNode;
        }

        return node;
    }

    getTextEditableItem(providedContext?: Context): TextEditable {
        const context = providedContext ? providedContext : this.getContext();

        if (context.token instanceof IdentifierTkn || context.token instanceof EditableTextTkn) {
            return context.token;
        } else if (context.tokenToLeft instanceof IdentifierTkn || context.tokenToLeft instanceof EditableTextTkn) {
            return context.tokenToLeft;
        } else if (context.tokenToRight instanceof IdentifierTkn || context.tokenToRight instanceof EditableTextTkn) {
            return context.tokenToRight;
        }
    }

    // TODO: when changing context (through navigation) and updating focusedToken => make sure to call .notify

    /**
     * Calculates and returns the current context based on the focused position, or selected code in the editor.
     */
    getContext(): Context {
        const curPosition = this.module.editor.monaco.getPosition();
        const curSelection = this.module.editor.monaco.getSelection();
        const curLine = this.getStatementAtLineNumber(curPosition.lineNumber);
        let context: Context;

        if (curSelection.startColumn != curSelection.endColumn) {
            context = this.getContextFromSelection(curLine, curSelection.startColumn, curSelection.endColumn);
        } else context = this.getContextFromPosition(curLine, curPosition.column);

        context.position = curPosition;

        return context;
    }

    getFocusedStatement(): Statement {
        return this.getStatementAtLineNumber(this.module.editor.monaco.getPosition().lineNumber);
    }

    /**
     * This is mostly called from the AST, for example after a code has been inserted and the cursor should focus to
     * the first empty hole or after the inserted code.
     */
    updateContext(newContext: UpdatableContext) {
        const curPos = this.module.editor.monaco.getPosition();
        const focusedLineStatement = this.getStatementAtLineNumber(curPos.lineNumber);

        if (newContext.tokenToSelect != undefined) {
            const selection = new Selection(
                newContext.tokenToSelect.getLineNumber(),
                newContext.tokenToSelect.right,
                newContext.tokenToSelect.getLineNumber(),
                newContext.tokenToSelect.left
            );
            this.module.editor.monaco.setSelection(selection);
        } else if (newContext.positionToMove != undefined) {
            this.module.editor.monaco.setPosition(newContext.positionToMove);
        }

        this.fireOnNavOffCallbacks(
            focusedLineStatement,
            this.getStatementAtLineNumber(this.module.editor.monaco.getPosition().lineNumber)
        );
        this.fireOnNavChangeCallbacks();
    }

    navigatePos(pos: Position) {
        const focusedLineStatement = this.getStatementAtLineNumber(pos.lineNumber);

        // clicked at an empty statement => just update focusedStatement
        if (focusedLineStatement instanceof EmptyLineStmt) {
            this.module.editor.monaco.setPosition(new Position(pos.lineNumber, focusedLineStatement.left));
        }

        // clicked before a statement => navigate to the beginning of the statement
        else if (pos.column <= focusedLineStatement.left) {
            this.module.editor.monaco.setPosition(new Position(pos.lineNumber, focusedLineStatement.left));
        }

        // clicked before a statement => navigate to the end of the line
        else if (pos.column >= focusedLineStatement.right) {
            this.module.editor.monaco.setPosition(new Position(pos.lineNumber, focusedLineStatement.right));
        } else {
            // look into the tokens of the statement:
            const focusedToken = this.getTokenAtStatementColumn(focusedLineStatement, pos.column);

            if (focusedToken instanceof Token && focusedToken.isEmpty) {
                // if clicked on a hole => select the hole
                this.selectCode(focusedToken);
            } else if (focusedToken instanceof EditableTextTkn || focusedToken instanceof IdentifierTkn) {
                // if clicked on a text-editable code construct (identifier or a literal) => navigate to the clicked position (or select it if it's empty)

                if (focusedToken.text.length != 0) this.module.editor.monaco.setPosition(pos);
                else this.selectCode(focusedToken);
            } else {
                const hitDistance = pos.column - focusedToken.left;
                const tokenLength = focusedToken.right - focusedToken.left + 1;

                if (hitDistance < tokenLength / 2) {
                    // go to the beginning (or the empty token before this)

                    if (focusedToken.left - 1 > focusedLineStatement.left) {
                        const tokenBefore = this.getTokenAtStatementColumn(focusedLineStatement, focusedToken.left - 1);

                        if (tokenBefore instanceof Token && tokenBefore.isEmpty) {
                            this.selectCode(tokenBefore);
                        }
                    }

                    this.module.editor.monaco.setPosition(new Position(pos.lineNumber, focusedToken.left));
                } else {
                    // navigate to the end (or the empty token right after this token)
                    const tokenAfter = this.getTokenAtStatementColumn(focusedLineStatement, focusedToken.right + 1);

                    if (tokenAfter instanceof Token && tokenAfter.isEmpty) {
                        this.selectCode(tokenAfter);
                    } else {
                        this.module.editor.monaco.setPosition(new Position(pos.lineNumber, focusedToken.right));
                    }
                }
            }
        }

        const curPos = this.module.editor.monaco.getPosition();

        if (this.prevPosition != null && this.prevPosition.lineNumber != curPos.lineNumber) {
            this.fireOnNavOffCallbacks(
                this.getStatementAtLineNumber(this.prevPosition.lineNumber),
                this.getStatementAtLineNumber(curPos.lineNumber)
            );
        }

        this.prevPosition = curPos;

        this.fireOnNavChangeCallbacks();
    }

    navigateUp() {
        const curPosition = this.module.editor.monaco.getPosition();
        const focusedLineStatement = this.getStatementAtLineNumber(curPosition.lineNumber);

        this.fireOnNavOffCallbacks(
            focusedLineStatement,
            this.getStatementAtLineNumber(this.module.editor.monaco.getPosition().lineNumber)
        );

        if (curPosition.lineNumber > 1) this.navigatePos(new Position(curPosition.lineNumber - 1, curPosition.column));
        else {
            this.module.editor.monaco.setPosition(new Position(curPosition.lineNumber, 1));

            this.fireOnNavChangeCallbacks();
        }
    }

    navigateDown() {
        const curPosition = this.module.editor.monaco.getPosition();
        const focusedLineStatement = this.getStatementAtLineNumber(curPosition.lineNumber);
        const lineBelow = this.getStatementAtLineNumber(curPosition.lineNumber + 1);

        this.fireOnNavOffCallbacks(focusedLineStatement, lineBelow);

        if (lineBelow != null) {
            this.navigatePos(new Position(curPosition.lineNumber + 1, curPosition.column));
        } else {
            // navigate to the end of current line
            const curLine = this.getStatementAtLineNumber(curPosition.lineNumber);
            this.module.editor.monaco.setPosition(new Position(curPosition.lineNumber, curLine.right));

            this.fireOnNavChangeCallbacks();
        }
    }

    navigateRight() {
        const curPos = this.module.editor.monaco.getPosition();
        const focusedLineStatement = this.getStatementAtLineNumber(curPos.lineNumber);

        if (this.onEndOfLine()) {
            const lineBelow = this.getStatementAtLineNumber(curPos.lineNumber + 1);

            if (lineBelow != null) {
                this.module.editor.monaco.setPosition(new Position(lineBelow.lineNumber, lineBelow.left));
            }
        } else {
            const curSelection = this.module.editor.monaco.getSelection();
            const focusedLineStatement = this.getStatementAtLineNumber(curPos.lineNumber);
            let nextColumn = curPos.column;

            if (curSelection.endColumn != curSelection.startColumn) nextColumn = curSelection.endColumn;

            if (
                curSelection.startColumn != curSelection.endColumn &&
                curSelection.endColumn == focusedLineStatement.right
            ) {
                // if selected a thing that is at the beginning of a line (usually an identifier) => nav to the beginning of the line
                this.module.editor.monaco.setPosition(new Position(curPos.lineNumber, focusedLineStatement.right));
            } else {
                const tokenAfter = this.getTokenAtStatementColumn(focusedLineStatement, nextColumn);

                if (tokenAfter instanceof NonEditableTkn) {
                    // should skip this NonEditableTkn, and move to the next thing after it.

                    const tokenAfterAfter = this.getTokenAtStatementColumn(focusedLineStatement, tokenAfter.right);

                    if (tokenAfterAfter instanceof Token && tokenAfterAfter.isEmpty) {
                        this.selectCode(tokenAfterAfter);
                    } else if (tokenAfterAfter instanceof EditableTextTkn || tokenAfterAfter instanceof IdentifierTkn) {
                        this.module.editor.monaco.setPosition(new Position(curPos.lineNumber, tokenAfterAfter.left));
                    } else if (tokenAfterAfter != null) {
                        // probably its another expression, but should go to the beginning of it
                        this.module.editor.monaco.setPosition(new Position(curPos.lineNumber, tokenAfterAfter.left));
                    } else {
                        this.module.editor.monaco.setPosition(new Position(curPos.lineNumber, tokenAfter.right));
                    }
                } else if (tokenAfter instanceof Token && tokenAfter.isEmpty) {
                    // if char[col + 1] is H => just select H

                    this.selectCode(tokenAfter);
                } else if (tokenAfter instanceof EditableTextTkn || tokenAfter instanceof IdentifierTkn) {
                    // if char[col + 1] is a literal => go through it

                    this.module.editor.monaco.setPosition(new Position(curPos.lineNumber, tokenAfter.left));
                }
            }
        }

        this.fireOnNavOffCallbacks(
            focusedLineStatement,
            this.getStatementAtLineNumber(this.module.editor.monaco.getPosition().lineNumber)
        );
        this.fireOnNavChangeCallbacks();
    }

    navigateLeft() {
        const curPos = this.module.editor.monaco.getPosition();
        const focusedLineStatement = this.getStatementAtLineNumber(curPos.lineNumber);

        if (this.onBeginningOfLine()) {
            if (curPos.lineNumber > 1) {
                const lineBelow = this.getStatementAtLineNumber(curPos.lineNumber - 1);

                if (lineBelow != null) {
                    this.module.editor.monaco.setPosition(new Position(lineBelow.lineNumber, lineBelow.right));
                }
            }
        } else {
            const curSelection = this.module.editor.monaco.getSelection();
            const focusedLineStatement = this.getStatementAtLineNumber(curPos.lineNumber);
            let prevColumn = this.module.editor.monaco.getPosition().column - 1;

            if (curSelection.endColumn != curSelection.startColumn) prevColumn = curSelection.startColumn - 1;

            if (curSelection.startColumn != curSelection.endColumn && curPos.column == focusedLineStatement.left) {
                // if selected a thing that is at the beginning of a line (usually an identifier) => nav to the beginning of the line
                this.module.editor.monaco.setPosition(new Position(curPos.lineNumber, focusedLineStatement.left));
            } else {
                const tokenBefore = this.getTokenAtStatementColumn(focusedLineStatement, prevColumn);

                if (tokenBefore instanceof NonEditableTkn) {
                    // if char[col - 1] is N => just go to the beginning of N

                    const tokenBeforeBefore = this.getTokenAtStatementColumn(
                        focusedLineStatement,
                        tokenBefore.left - 1
                    );

                    if (tokenBeforeBefore instanceof Token && tokenBeforeBefore.isEmpty) {
                        this.selectCode(tokenBeforeBefore);
                    } else if (
                        tokenBeforeBefore instanceof Token &&
                        (tokenBeforeBefore instanceof EditableTextTkn || tokenBeforeBefore instanceof IdentifierTkn)
                    ) {
                        this.module.editor.monaco.setPosition(new Position(curPos.lineNumber, tokenBeforeBefore.right));
                    } else {
                        this.module.editor.monaco.setPosition(new Position(curPos.lineNumber, tokenBefore.left));
                    }
                } else if (tokenBefore instanceof Token && tokenBefore.isEmpty) {
                    // if char[col - 1] is H => just select H

                    this.selectCode(tokenBefore);
                } else if (tokenBefore instanceof EditableTextTkn) {
                    // if char[col - 1] is a literal => go through it
                }
            }
        }

        this.fireOnNavOffCallbacks(
            focusedLineStatement,
            this.getStatementAtLineNumber(this.module.editor.monaco.getPosition().lineNumber)
        );
        this.fireOnNavChangeCallbacks();
    }

    /**
     * Returns true if the focus is within a text editable token, otherwise, returns false.
     */
    isTextEditable(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.getContext();

        return (
            (context.token != null && context.token.isTextEditable) ||
            (context.tokenToLeft != null && context.tokenToLeft.isTextEditable) ||
            (context.tokenToRight != null && context.tokenToRight.isTextEditable)
        );
    }

    /**
     * Returns true if the focus is on the end of a line, otherwise, returns false.
     */
    onEndOfLine(): boolean {
        const curSelection = this.module.editor.monaco.getSelection();

        if (curSelection.startColumn == curSelection.endColumn) {
            const curPosition = curSelection.getStartPosition();
            const focusedLineStatement = this.getStatementAtLineNumber(curPosition.lineNumber);

            if (focusedLineStatement != null && curPosition.column == focusedLineStatement.right) return true;
        }

        return false;
    }

    /**
     * Returns true if the focus is on the beginning of a line, otherwise, returns false.
     */
    onBeginningOfLine(): boolean {
        const curSelection = this.module.editor.monaco.getSelection();

        if (curSelection.startColumn == curSelection.endColumn) {
            const curPosition = curSelection.getStartPosition();
            const focusedLineStatement = this.getStatementAtLineNumber(curPosition.lineNumber);

            if (focusedLineStatement != null && curPosition.column == focusedLineStatement.left) return true;
        }

        return false;
    }

    /**
     * Returns true if focused within a line that is inside the body of another statement.
     */
    inTabbedLine(providedContext?: Context): boolean {
        const curLine = providedContext ? providedContext.lineStatement : this.getFocusedStatement();

        return curLine.getLeftPosition().column > 1;
    }

    /**
     * Returns true if a line exists below the focused line, otherwise, returns false.
     */
    existsLineBelow(): boolean {
        const curPos = this.module.editor.monaco.getPosition();

        return this.getStatementAtLineNumber(curPos.lineNumber + 1) != null;
    }

    /**
     * Returns true if the user is focused on an empty line, otherwise, returns false.
     */
    onEmptyLine(): boolean {
        const curLine = this.getFocusedStatement();

        return curLine instanceof EmptyLineStmt;
    }

    /**
     * Finds the closest Token to the given column inside the given statement.
     * @param statement the statement to search inside.
     * @param column the given column to search with (usually from current position)
     * @returns the found Token at the given column in which the following condition holds true: token.left <= column < token.right
     */
    private getTokenAtStatementColumn(statement: Statement, column: number): CodeConstruct {
        const tokensStack = new Array<CodeConstruct>();

        tokensStack.unshift(...statement.tokens);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (column >= curToken.left && column < curToken.right && curToken instanceof Token) return curToken;

            if (curToken instanceof Expression)
                if (curToken.tokens.length > 0) tokensStack.unshift(...curToken.tokens);
                else return curToken;
        }

        return null;
    }

    /**
     * This function will fire all of the subscribed nav-change callbacks.
     */
    private fireOnNavChangeCallbacks() {
        const context = this.getContext();

        for (const callback of this.onNavChangeCallbacks) {
            callback(context);
        }
    }

    /**
     * This function will fire all of the subscribed before nav off variable assignment callbacks
     */
    fireOnNavOffCallbacks(oldStatement: Statement, newStatement: Statement) {
        const context = this.getContext();

        if (oldStatement && oldStatement !== newStatement) {
            oldStatement.notify(CallbackType.onFocusOff);

            //these will run for all statements that have a callback attached, not just for oldStatement
            //if you want to run a callback only on oldStatement, use CallbackType.onFocusOff
            //Think of this array as the global list of functions that gets called when we navigate off of a certain statement type
            //and of CallbackType.onFocusOff as the callback called on a specific instance of  a code construct
            const callbackArr = this.onNavOffCallbacks.get(oldStatement.codeConstructName) ?? [];
            for (const callback of callbackArr) {
                callback(context);
            }
        }
    }

    /**
     * Recursively searches for all of the body and statements that have bodies and looks for the statement (line) with the given lineNumber.
     * @param line the given line number to search for.
     * @returns the Statement object of that line.
     */
    getStatementAtLineNumber(line: number): Statement {
        const bodyStack = new Array<Statement>();

        bodyStack.unshift(...this.module.body);

        while (bodyStack.length > 0) {
            const curStmt = bodyStack.pop();

            if (line == curStmt.lineNumber) return curStmt;
            else if (curStmt.hasBody()) bodyStack.unshift(...curStmt.body);
        }

        return null;
    }

    /**
     * Selects the given code construct.
     * @param code the editor will set its selection to the left and right of this given code.
     */
    private selectCode(code: CodeConstruct) {
        if (code != null) {
            const selection = new Selection(code.getLineNumber(), code.right, code.getLineNumber(), code.left);

            this.module.editor.monaco.setSelection(selection);
        }
    }

    private getContextFromSelection(statement: Statement, left: number, right: number): Context {
        const context = new Context();
        context.lineStatement = statement;
        const tokensStack = new Array<CodeConstruct>();

        // initialize tokensStack
        tokensStack.unshift(...statement.tokens);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (curToken.left == left && curToken.right == right) {
                context.selected = true;

                if (curToken instanceof Token) context.token = curToken;
                else if (curToken instanceof Expression) context.expression = curToken;

                return context;
            } else if (curToken instanceof Expression) {
                if (left == curToken.left && right == curToken.right) {
                    context.expression = curToken;
                    context.selected = true;

                    break;
                }

                if (curToken.tokens.length > 0) tokensStack.unshift(...curToken.tokens);
                else {
                    console.warn(
                        `getContextFromSelection(statement: ${statement}, left: ${left}, right: ${right}) -> found expression with no child tokens.`
                    );
                }
            }
        }

        return context;
    }

    private findNonTextualHole(statement: Statement, column: number): Token {
        const tokensStack = new Array<CodeConstruct>();

        for (const token of statement.tokens) tokensStack.unshift(token);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (
                column == curToken.left &&
                column == curToken.right &&
                (curToken instanceof EditableTextTkn ||
                    curToken instanceof LiteralValExpr ||
                    curToken instanceof IdentifierTkn)
            ) {
                if (curToken instanceof LiteralValExpr && curToken.returns == DataType.Number)
                    return curToken.tokens[0] as Token;
                else if (curToken instanceof EditableTextTkn) return curToken;
                else if (curToken instanceof IdentifierTkn) return curToken;
            }

            if (curToken instanceof Expression)
                if (curToken.tokens.length > 0) for (let token of curToken.tokens) tokensStack.unshift(token);
        }

        return null;
    }

    private getContextFromPosition(statement: Statement, column: number): Context {
        const context = new Context();
        context.lineStatement = statement;
        const tokensStack = new Array<CodeConstruct>();

        // initialize tokensStack
        for (const token of statement.tokens) tokensStack.unshift(token);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (curToken instanceof Token) {
                // this code assumes that there is no token with an empty text

                if (column == curToken.left) {
                    context.token = this.findNonTextualHole(statement, column);
                    context.tokenToRight = curToken;
                    context.tokenToLeft = this.searchNonEmptyTokenWithCheck(
                        statement,
                        (token) => token.right == column
                    );

                    if (context.tokenToRight != null) {
                        context.expressionToRight = this.getExpression(
                            context.tokenToRight,
                            context.tokenToRight.rootNode.left == column
                        );
                    }
                    if (context.tokenToLeft) {
                        context.expressionToLeft = this.getExpression(
                            context.tokenToLeft,
                            context.tokenToLeft.rootNode.right == column
                        );
                    }

                    context.lineStatement = context.tokenToRight.getParentStatement();

                    break;
                } else if (column == curToken.right) {
                    context.token = this.findNonTextualHole(statement, column);
                    context.tokenToLeft = curToken;
                    context.tokenToRight = this.searchNonEmptyTokenWithCheck(
                        statement,
                        (token) => token.left == column
                    );

                    if (context.tokenToRight != null) {
                        context.expressionToRight = this.getExpression(
                            context.tokenToRight,
                            context.tokenToRight.rootNode.left == column
                        );
                    }
                    if (context.tokenToLeft) {
                        context.expressionToLeft = this.getExpression(
                            context.tokenToLeft,
                            context.tokenToLeft.rootNode.right == column
                        );
                    }
                    context.lineStatement = context.tokenToLeft.getParentStatement();

                    break;
                } else if (column > curToken.left && column < curToken.right) {
                    context.token = curToken;
                    // context.parentExpression = context.token.rootNode as Expression;
                    context.lineStatement = context.token.getParentStatement();

                    break;
                }
            } else if (curToken instanceof Expression) {
                if (curToken.tokens.length > 0) tokensStack.unshift(...curToken.tokens);
                else {
                    console.warn(
                        `getContextFromPosition(statement: ${statement}, column: ${column}) -> found expression with no child tokens.`
                    );
                }
            }
        }

        return context;
    }

    /**
     * Finds the parent expression of a given token that meets the given 'check' condition.
     */
    private getExpression(token: Token, check: boolean): Expression {
        if (token.rootNode instanceof Expression && check) return token.rootNode;

        return null;
    }

    /**
     * Searches the tokens tree for a token that matches the passed check() condition.
     */
    private searchNonEmptyTokenWithCheck(statement: Statement, check: (token: Token) => boolean): Token {
        const tokensStack = new Array<CodeConstruct>();

        tokensStack.unshift(...statement.tokens);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (curToken instanceof Token && curToken.left != curToken.right && check(curToken)) return curToken;

            if (curToken instanceof Expression) {
                if (curToken.tokens.length > 0) tokensStack.unshift(...curToken.tokens);
            }
        }

        return null;
    }
}

export class Context {
    // hierarchical levels:

    token?: Token = null;
    tokenToLeft?: Token = null;
    tokenToRight?: Token = null;

    /**
     * Immediate items
     */
    // parentExpression?: Expression = null;
    expression?: Expression = null;
    expressionToLeft?: Expression = null;
    expressionToRight?: Expression = null;

    lineStatement: Statement;

    selected?: boolean = false; //this should not be nullable
    position?: Position = null;
}

export class UpdatableContext {
    tokenToSelect?: CodeConstruct;
    positionToMove?: Position;

    constructor(tokenToSelect?: Token, positionToMove?: Position) {
        this.tokenToSelect = tokenToSelect;
        this.positionToMove = positionToMove;
    }
}
