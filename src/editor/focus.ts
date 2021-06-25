import * as monaco from "monaco-editor";
import * as ast from "../syntax-tree/ast";

export class Focus {
    module: ast.Module;

    // TODO: NYI
    onNavChangeCallbacks = new Array<(c: Context) => void>();

    constructor(module: ast.Module) {
        this.module = module;
    }

    subscribeCallback(callback: (c: Context) => void) {
        this.onNavChangeCallbacks.push(callback);
    }

    private onChange() {
        const context = this.getContext();

        for (const callback of this.onNavChangeCallbacks) {
            callback(context);
        }
    }

    getTextEditableItem(providedContext?: Context): ast.TextEditable {
        const context = providedContext ? providedContext : this.getContext();

        if (context.token instanceof ast.IdentifierTkn || context.token instanceof ast.EditableTextTkn) {
            return context.token;
        } else if (
            context.tokenToLeft instanceof ast.IdentifierTkn ||
            context.tokenToLeft instanceof ast.EditableTextTkn
        ) {
            return context.tokenToLeft;
        } else if (
            context.tokenToRight instanceof ast.IdentifierTkn ||
            context.tokenToRight instanceof ast.EditableTextTkn
        ) {
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

        if (curSelection.startColumn != curSelection.endColumn) {
            return this.getContextFromSelection(curLine, curSelection.startColumn, curSelection.endColumn);
        } else return this.getContextFromPosition(curLine, curPosition.column);
    }

    getFocusedStatement(): ast.Statement {
        return this.getStatementAtLineNumber(this.module.editor.monaco.getPosition().lineNumber);
    }

    /**
     * This is mostly called from the AST, for example after a code has been inserted and the cursor should focus to
     * the first empty hole or after the inserted code.
     */
    updateContext(newContext: UpdatableContext) {
        if (newContext.tokenToSelect != undefined) {
            const selection = new monaco.Selection(
                newContext.tokenToSelect.getLineNumber(),
                newContext.tokenToSelect.right,
                newContext.tokenToSelect.getLineNumber(),
                newContext.tokenToSelect.left
            );
            this.module.editor.monaco.setSelection(selection);
        } else if (newContext.positionToMove != undefined) {
            this.module.editor.monaco.setPosition(newContext.positionToMove);
        }

        this.onChange();
    }

    navigatePos(pos: monaco.Position) {
        const focusedLineStatement = this.getStatementAtLineNumber(pos.lineNumber);

        // clicked at an empty statement => just update focusedStatement
        if (focusedLineStatement instanceof ast.EmptyLineStmt) {
            this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedLineStatement.left));
        }

        // clicked before a statement => navigate to the beginning of the statement
        else if (pos.column <= focusedLineStatement.left) {
            this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedLineStatement.left));
        }

        // clicked before a statement => navigate to the end of the line
        else if (pos.column >= focusedLineStatement.right) {
            this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedLineStatement.right));
        } else {
            // look into the tokens of the statement:
            const focusedToken = this.getTokenAtStatementColumn(focusedLineStatement, pos.column);

            if (focusedToken instanceof ast.Token && focusedToken.isEmpty) {
                // if clicked on a hole => select the hole
                this.selectCode(focusedToken);
            } else if (focusedToken instanceof ast.EditableTextTkn || focusedToken instanceof ast.IdentifierTkn) {
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

                        if (tokenBefore instanceof ast.Token && tokenBefore.isEmpty) {
                            this.selectCode(tokenBefore);
                        }
                    }

                    this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedToken.left));
                } else {
                    // navigate to the end (or the empty token right after this token)
                    const tokenAfter = this.getTokenAtStatementColumn(focusedLineStatement, focusedToken.right + 1);

                    if (tokenAfter instanceof ast.Token && tokenAfter.isEmpty) {
                        this.selectCode(tokenAfter);
                    } else {
                        this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedToken.right));
                    }
                }
            }
        }

        this.onChange();
    }

    navigateUp() {
        const curPosition = this.module.editor.monaco.getPosition();

        if (curPosition.lineNumber > 1)
            this.navigatePos(new monaco.Position(curPosition.lineNumber - 1, curPosition.column));
        else this.module.editor.monaco.setPosition(new monaco.Position(curPosition.lineNumber, 1));
    }

    navigateDown() {
        const curPosition = this.module.editor.monaco.getPosition();

        const lineBelow = this.getStatementAtLineNumber(curPosition.lineNumber + 1);

        if (lineBelow != null) {
            this.navigatePos(new monaco.Position(curPosition.lineNumber + 1, curPosition.column));
        } else {
            // navigate to the end of current line
            const curLine = this.getStatementAtLineNumber(curPosition.lineNumber);
            this.module.editor.monaco.setPosition(new monaco.Position(curPosition.lineNumber, curLine.right));
        }
    }

    navigateRight() {
        const curPos = this.module.editor.monaco.getPosition();

        if (this.onEndOfLine()) {
            const lineBelow = this.getStatementAtLineNumber(curPos.lineNumber + 1);

            if (lineBelow != null) {
                this.module.editor.monaco.setPosition(new monaco.Position(lineBelow.lineNumber, lineBelow.left));
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
                this.module.editor.monaco.setPosition(
                    new monaco.Position(curPos.lineNumber, focusedLineStatement.right)
                );
            } else {
                const tokenAfter = this.getTokenAtStatementColumn(focusedLineStatement, nextColumn);

                if (tokenAfter instanceof ast.NonEditableTkn) {
                    // should skip this NonEditableTkn, and move to the next thing after it.

                    const tokenAfterAfter = this.getTokenAtStatementColumn(focusedLineStatement, tokenAfter.right);

                    if (tokenAfterAfter instanceof ast.Token && tokenAfterAfter.isEmpty) {
                        this.selectCode(tokenAfterAfter);
                    } else if (
                        tokenAfterAfter instanceof ast.EditableTextTkn ||
                        tokenAfterAfter instanceof ast.IdentifierTkn
                    ) {
                        this.module.editor.monaco.setPosition(
                            new monaco.Position(curPos.lineNumber, tokenAfterAfter.left)
                        );
                    } else if (tokenAfterAfter != null) {
                        // probably its another expression, but should go to the beginning of it
                        this.module.editor.monaco.setPosition(
                            new monaco.Position(curPos.lineNumber, tokenAfterAfter.left)
                        );
                    } else {
                        this.module.editor.monaco.setPosition(new monaco.Position(curPos.lineNumber, tokenAfter.right));
                    }
                } else if (tokenAfter instanceof ast.Token && tokenAfter.isEmpty) {
                    // if char[col + 1] is H => just select H

                    this.selectCode(tokenAfter);
                } else if (tokenAfter instanceof ast.EditableTextTkn || tokenAfter instanceof ast.IdentifierTkn) {
                    // if char[col + 1] is a literal => go through it

                    this.module.editor.monaco.setPosition(new monaco.Position(curPos.lineNumber, tokenAfter.left));
                }
            }
        }

        this.onChange();
    }

    navigateLeft() {
        const curPos = this.module.editor.monaco.getPosition();

        if (this.onBeginningOfLine()) {
            if (curPos.lineNumber > 1) {
                const lineBelow = this.getStatementAtLineNumber(curPos.lineNumber - 1);

                if (lineBelow != null) {
                    this.module.editor.monaco.setPosition(new monaco.Position(lineBelow.lineNumber, lineBelow.right));
                }
            }
        } else {
            const curSelection = this.module.editor.monaco.getSelection();
            const focusedLineStatement = this.getStatementAtLineNumber(curPos.lineNumber);
            let prevColumn = this.module.editor.monaco.getPosition().column - 1;

            if (curSelection.endColumn != curSelection.startColumn) prevColumn = curSelection.startColumn - 1;

            if (curSelection.startColumn != curSelection.endColumn && curPos.column == focusedLineStatement.left) {
                // if selected a thing that is at the beginning of a line (usually an identifier) => nav to the beginning of the line
                this.module.editor.monaco.setPosition(
                    new monaco.Position(curPos.lineNumber, focusedLineStatement.left)
                );
            } else {
                const tokenBefore = this.getTokenAtStatementColumn(focusedLineStatement, prevColumn);

                if (tokenBefore instanceof ast.NonEditableTkn) {
                    // if char[col - 1] is N => just go to the beginning of N

                    const tokenBeforeBefore = this.getTokenAtStatementColumn(
                        focusedLineStatement,
                        tokenBefore.left - 1
                    );

                    if (tokenBeforeBefore instanceof ast.Token && tokenBeforeBefore.isEmpty) {
                        this.selectCode(tokenBeforeBefore);
                    } else if (
                        tokenBeforeBefore instanceof ast.Token &&
                        (tokenBeforeBefore instanceof ast.EditableTextTkn ||
                            tokenBeforeBefore instanceof ast.IdentifierTkn)
                    ) {
                        this.module.editor.monaco.setPosition(
                            new monaco.Position(curPos.lineNumber, tokenBeforeBefore.right)
                        );
                    } else {
                        this.module.editor.monaco.setPosition(new monaco.Position(curPos.lineNumber, tokenBefore.left));
                    }
                } else if (tokenBefore instanceof ast.Token && tokenBefore.isEmpty) {
                    // if char[col - 1] is H => just select H

                    this.selectCode(tokenBefore);
                } else if (tokenBefore instanceof ast.EditableTextTkn) {
                    // if char[col - 1] is a literal => go through it
                }
            }
        }

        this.onChange();
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
     * Returns true if a line exists above the focused line, otherwise, returns false.
     */
    existsLineAbove(): boolean {
        const curPos = this.module.editor.monaco.getPosition();

        return curPos.lineNumber > 1;
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

        return curLine instanceof ast.EmptyLineStmt;
    }

    /**
     * Finds the closest ast.Token to the given column inside the given statement.
     * @param statement the statement to search inside.
     * @param column the given column to search with (usually from current position)
     * @returns the found ast.Token at the given column in which the following condition holds true: token.left <= column < token.right
     */
    private getTokenAtStatementColumn(statement: ast.Statement, column: number): ast.CodeConstruct {
        const tokensStack = new Array<ast.CodeConstruct>();

        for (const token of statement.tokens) tokensStack.unshift(token);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (column >= curToken.left && column < curToken.right && curToken instanceof ast.Token) return curToken;

            if (curToken instanceof ast.Expression)
                if (curToken.tokens.length > 0) for (let token of curToken.tokens) tokensStack.unshift(token);
                else return curToken;
        }

        return null;
    }

    /**
     * Recursively searches for all of the body and statements that have bodies and looks for the statement (line) with the given lineNumber.
     * @param line the given line number to search for.
     * @returns the ast.Statement object of that line.
     */
    private getStatementAtLineNumber(line: number): ast.Statement {
        const bodyStack = new Array<ast.Statement>();

        for (const stmt of this.module.body) bodyStack.unshift(stmt);

        while (bodyStack.length > 0) {
            const curStmt = bodyStack.pop();

            if (line == curStmt.lineNumber) return curStmt;
            else if (curStmt.hasBody()) {
                for (const stmt of curStmt.body) bodyStack.unshift(stmt);
            }
        }

        return null;
    }

    /**
     * Selects the given code construct.
     * @param code the editor will set its selection to the left and right of this given code.
     */
    private selectCode(code: ast.CodeConstruct) {
        if (code != null) {
            const selection = new monaco.Selection(code.getLineNumber(), code.right, code.getLineNumber(), code.left);

            this.module.editor.monaco.setSelection(selection);
        }
    }

    private getContextFromSelection(statement: ast.Statement, left: number, right: number): Context {
        const context = new Context();
        context.lineStatement = statement;
        const tokensStack = new Array<ast.CodeConstruct>();

        // initialize tokensStack
        for (const token of statement.tokens) tokensStack.unshift(token);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (curToken.left == left && curToken.right == right) {
                context.selected = true;

                if (curToken instanceof ast.Token) context.token = curToken;
                else if (curToken instanceof ast.Expression) context.expression = curToken;

                return context;
            } else if (curToken instanceof ast.Expression) {
                if (left == curToken.left && right == curToken.right) {
                    context.expression = curToken;
                    context.selected = true;

                    break;
                }

                if (curToken.tokens.length > 0) for (let token of curToken.tokens) tokensStack.unshift(token);
                else {
                    console.warn(
                        `getContextFromSelection(statement: ${statement}, left: ${left}, right: ${right}) -> found expression with no child tokens.`
                    );
                }
            }
        }

        return context;
    }

    private findNonTextualHole(statement: ast.Statement, column: number): ast.Token {
        const tokensStack = new Array<ast.CodeConstruct>();

        for (const token of statement.tokens) tokensStack.unshift(token);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (
                column == curToken.left &&
                column == curToken.right &&
                (curToken instanceof ast.EditableTextTkn ||
                    curToken instanceof ast.LiteralValExpr ||
                    curToken instanceof ast.IdentifierTkn)
            ) {
                if (curToken instanceof ast.LiteralValExpr && curToken.returns == ast.DataType.Number)
                    return curToken.tokens[0] as ast.Token;
                else if (curToken instanceof ast.EditableTextTkn) return curToken;
                else if (curToken instanceof ast.IdentifierTkn) return curToken;
            }

            if (curToken instanceof ast.Expression)
                if (curToken.tokens.length > 0) for (let token of curToken.tokens) tokensStack.unshift(token);
        }

        return null;
    }

    private getContextFromPosition(statement: ast.Statement, column: number): Context {
        const context = new Context();
        context.lineStatement = statement;
        const tokensStack = new Array<ast.CodeConstruct>();

        // initialize tokensStack
        for (const token of statement.tokens) tokensStack.unshift(token);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (curToken instanceof ast.Token) {
                // this code assumes that there is no token with an empty text

                if (column == curToken.left) {
                    context.token = this.findNonTextualHole(statement, column);
                    context.tokenToRight = curToken;
                    context.tokenToLeft = this.searchTokenWithCheck(statement, (token) => token.right == column);

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
                    context.tokenToRight = this.searchTokenWithCheck(statement, (token) => token.left == column);

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
                    // context.parentExpression = context.token.rootNode as ast.Expression;
                    context.lineStatement = context.token.getParentStatement();

                    break;
                }
            } else if (curToken instanceof ast.Expression) {
                if (curToken.tokens.length > 0) for (let token of curToken.tokens) tokensStack.unshift(token);
                else {
                    console.warn(
                        `getContextFromPosition(statement: ${statement}, column: ${column}) -> found expression with no child tokens.`
                    );
                }
            }
        }

        return context;
    }

    private getExpression(token: ast.Token, check: boolean): ast.Expression {
        if (token.rootNode instanceof ast.Expression && check) return token.rootNode;

        return null;
    }

    /**
     * Searches the tokens tree for a token that matches the passed check() condition.
     */
    private searchTokenWithCheck(statement: ast.Statement, check: (token: ast.Token) => boolean): ast.Token {
        const tokensStack = new Array<ast.CodeConstruct>();

        for (const token of statement.tokens) tokensStack.unshift(token);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (curToken instanceof ast.Token && check(curToken)) return curToken;

            if (curToken instanceof ast.Expression)
                if (curToken.tokens.length > 0) for (let token of curToken.tokens) tokensStack.unshift(token);
        }

        return null;
    }
}

export class Context {
    // hierarchical levels:

    token?: ast.Token = null;
    tokenToLeft?: ast.Token = null;
    tokenToRight?: ast.Token = null;

    /**
     * Immediate items
     */
    // parentExpression?: ast.Expression = null;
    expression?: ast.Expression = null;
    expressionToLeft?: ast.Expression = null;
    expressionToRight?: ast.Expression = null;

    lineStatement: ast.Statement;

    selected?: boolean = false; //this should not be nullable
    position?: monaco.Position = null;
}

export class UpdatableContext {
    tokenToSelect?: ast.CodeConstruct;
    positionToMove?: monaco.Position;

    constructor(tokenToSelect?: ast.Token, positionToMove?: monaco.Position) {
        this.tokenToSelect = tokenToSelect;
        this.positionToMove = positionToMove;
    }
}
