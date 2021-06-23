import * as monaco from "monaco-editor";
import * as ast from "../syntax-tree/ast";

export class Focus {
    module: ast.Module;

    // TODO: NYI
    callbacks = new Array<(Context) => {}>();

    constructor(module: ast.Module) {
        this.module = module;
    }

    getTextEditableItem(): ast.TextEditable {
        const context = this.getContext();
        let token: ast.TextEditable;

        if (context.token instanceof ast.IdentifierTkn || context.token instanceof ast.EditableTextTkn) {
            return token;
        } else {
            throw new Error("Trying to insert-char at an incorrect token or with an incorrect isTextEditable value.");
        }
    }

    onEndOrBeginningOfToken(): boolean {
        const context = this.getContext();

        if (context.tokenToLeft != null || context.tokenToRight != null) return true;
    }

    subscribeCallback() {}

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
    }

    navigatePos(pos: monaco.Position) {
        const focusedLineStatement = this.getStatementAtLineNumber(pos.lineNumber);

        // clicked at an empty statement => just update focusedStatement
        if (focusedLineStatement instanceof ast.EmptyLineStmt) {
            this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedLineStatement.left));

            return;
        }

        // clicked before a statement => navigate to the beginning of the statement
        if (pos.column <= focusedLineStatement.left) {
            this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedLineStatement.left));

            return;
        }

        // clicked before a statement => navigate to the end of the line
        if (pos.column >= focusedLineStatement.right) {
            this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedLineStatement.right));

            return;
        }

        // look into the tokens of the statement:
        const focusedToken = this.getTokenAtStatementColumn(focusedLineStatement, pos.column);

        if (focusedToken instanceof ast.Token && focusedToken.isEmpty) {
            // if clicked on a hole => select the hole
            this.selectCode(focusedToken);

            return;
        } else if (focusedToken instanceof ast.EditableTextTkn || focusedToken instanceof ast.IdentifierTkn) {
            // if clicked on a text-editable code construct (identifier or a literal) => navigate to the clicked position

            if (focusedToken.text.length != 0) {
                // don't select it
            }

            return;
        } else {
            const hitDistance = pos.column - focusedToken.left;
            const tokenLength = focusedToken.right - focusedToken.left + 1;

            if (hitDistance < tokenLength / 2) {
                // go to the beginning (or the empty token before this)

                if (focusedToken.left - 1 > focusedLineStatement.left) {
                    const tokenBefore = this.getTokenAtStatementColumn(focusedLineStatement, focusedToken.left - 1);

                    if (tokenBefore instanceof ast.Token && tokenBefore.isEmpty) {
                        this.selectCode(tokenBefore);

                        return;
                    }
                }

                this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedToken.left));

                return;
            } else {
                // navigate to the end (or the empty token right after this token)

                const tokenAfter = this.getTokenAtStatementColumn(focusedLineStatement, focusedToken.right + 1);

                if (tokenAfter instanceof ast.Token && tokenAfter.isEmpty) {
                    this.selectCode(tokenAfter);

                    return;
                } else {
                    this.module.editor.monaco.setPosition(new monaco.Position(pos.lineNumber, focusedToken.right));

                    return;
                }
            }
        }
    }

    navigateUp() {
        const curPosition = this.module.editor.monaco.getPosition();

        if (curPosition.lineNumber > 1)
            return this.navigatePos(new monaco.Position(curPosition.lineNumber - 1, curPosition.column));
        else return this.navigatePos(new monaco.Position(curPosition.lineNumber, 1));
    }

    navigateDown() {
        const navFocus = new Context();

        // could try doing navigatePos(down)
        // if null => just go to the end of the line

        return navFocus;
    }

    navigateRight() {
        if (this.onEndOfLine()) {
            // same code as navigateDown (just to the beginning of down)
            console.log("+ 1 is down");
        } else {
            const curSelection = this.module.editor.monaco.getSelection();
            const curPos = this.module.editor.monaco.getPosition();
            const focusedLineStatement = this.getStatementAtLineNumber(curPos.lineNumber);
            let nextColumn = curPos.column;

            if (curSelection.endColumn != curSelection.startColumn) nextColumn = curSelection.endColumn;

            const tokenAfter = this.getTokenAtStatementColumn(focusedLineStatement, nextColumn);

            if (tokenAfter instanceof ast.NonEditableTkn) {
                // should skip this NonEditableTkn, and move to the next thing after it.

                const tokenAfterAfter = this.getTokenAtStatementColumn(focusedLineStatement, tokenAfter.right);

                if (tokenAfterAfter instanceof ast.Token && tokenAfterAfter.isEmpty) {
                    this.selectCode(tokenAfterAfter);

                    return;
                } else if (
                    tokenAfterAfter instanceof ast.EditableTextTkn ||
                    tokenAfterAfter instanceof ast.IdentifierTkn
                ) {
                    this.module.editor.monaco.setPosition(new monaco.Position(curPos.lineNumber, tokenAfterAfter.left));

                    return;
                } else if (tokenAfterAfter != null) {
                    // probably its another expression, but should go to the beginning of it
                    this.module.editor.monaco.setPosition(new monaco.Position(curPos.lineNumber, tokenAfterAfter.left));

                    return;
                } else {
                    this.module.editor.monaco.setPosition(new monaco.Position(curPos.lineNumber, tokenAfter.right));

                    return;
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

    navigateLeft() {
        if (this.onBeginningOfLine()) {
            // same code as navigateUp (just to the end of up)
            console.log("- 1 is up");
        } else {
            const curSelection = this.module.editor.monaco.getSelection();
            const curPos = this.module.editor.monaco.getPosition();
            const focusedLineStatement = this.getStatementAtLineNumber(curPos.lineNumber);
            let prevColumn = this.module.editor.monaco.getPosition().column - 1;

            if (curSelection.endColumn != curSelection.startColumn) prevColumn = curSelection.startColumn - 1;

            const tokenBefore = this.getTokenAtStatementColumn(focusedLineStatement, prevColumn);

            if (tokenBefore instanceof ast.NonEditableTkn) {
                // if char[col - 1] is N => just go to the beginning of N

                const tokenBeforeBefore = this.getTokenAtStatementColumn(focusedLineStatement, tokenBefore.left - 1);

                if (tokenBeforeBefore instanceof ast.Token && tokenBeforeBefore.isEmpty) {
                    this.selectCode(tokenBeforeBefore);

                    return;
                } else if (
                    tokenBeforeBefore instanceof ast.Token &&
                    (tokenBeforeBefore instanceof ast.EditableTextTkn || tokenBeforeBefore instanceof ast.IdentifierTkn)
                ) {
                    this.module.editor.monaco.setPosition(
                        new monaco.Position(curPos.lineNumber, tokenBeforeBefore.right)
                    );

                    return;
                } else {
                    this.module.editor.monaco.setPosition(new monaco.Position(curPos.lineNumber, tokenBefore.left));

                    return;
                }
            } else if (tokenBefore instanceof ast.Token && tokenBefore.isEmpty) {
                // if char[col - 1] is H => just select H

                this.selectCode(tokenBefore);
            } else if (tokenBefore instanceof ast.EditableTextTkn) {
                // if char[col - 1] is a literal => go through it
            }
        }
    }

    /**
     * Returns true if the focus is within a text editable token, otherwise, returns false.
     */
    isTextEditable(): boolean {
        const context = this.getContext();

        return (
            (context.token != null && context.token.isTextEditable) ||
            (context.tokenToLeft != null && context.tokenToLeft.isTextEditable) ||
            (context.tokenToRight != null && context.tokenToRight.isTextEditable)
        );
    }

    /**
     * Returns true if the focus is on an empty line, otherwise, returns false.
     */
    onEmptyLine(): boolean {
        const curSelection = this.module.editor.monaco.getSelection();

        if (curSelection.startColumn == curSelection.endColumn) {
            const curPosition = curSelection.getStartPosition();

            return this.isEmptyLine(this.module.editor.monaco.getModel().getLineContent(curPosition.lineNumber));
        }

        return false;
    }

    /**
     * Returns true if the focus is on the end of a line, otherwise, returns false.
     */
    onEndOfLine(): boolean {
        const curSelection = this.module.editor.monaco.getSelection();

        if (curSelection.startColumn == curSelection.endColumn) {
            const curPosition = curSelection.getStartPosition();
            const focusedLineStatement = this.getStatementAtLineNumber(curPosition.lineNumber);

            if (focusedLineStatement != null && curPosition.column == focusedLineStatement.right + 1) return true;
        }

        return false;
    }

    /**
     * Returns true if the focus is on the beginning of a line, otherwise, returns false.
     */
    onBeginningOfLine(): boolean {
        let curSelection = this.module.editor.monaco.getSelection();

        // if (curSelection.startColumn == curSelection.endColumn) {
        // 	let curPosition = curSelection.getStartPosition();

        //     if (curPosition.column == 1) return true;

        // 	let lineContent = this.module.editor.monaco.getModel().getLineContent(curPosition.lineNumber);

        //     if (curPosition.column - 1 == ) return true;
        // }

        return false;
    }

    /**
     * Returns true if a line exists above the focused line, otherwise, returns false.
     */
    existsLineAbove(): boolean {
        // let curPos = this.module.editor.monaco.getPosition();
        // let lineStmt = this.getStmtFromLine(curPos.lineNumber);

        // if (lineStmt != null) {

        // }

        return false;
    }

    /**
     * Returns true if a line exists below the focused line, otherwise, returns false.
     */
    existsLineBelow(): boolean {
        return false;
    }

    // onEmptyLine(): boolean {
    //     // 1. checks based on current position => gets the statement
    //     // 2. checks if the current statement instanceof EmptyStatement
    // }

    // getFocusedToken(): FocusToken {
    //     const focusToken = new FocusToken();

    //     if (
    //         (this.focusedToken != null && this.focusedToken instanceof ast.Token) ||
    //         this.focusedToken instanceof ast.Expression
    //     ) {
    //         focusToken.token = this.focusedToken;
    //     } else {

    //     const focusedStatement = this.getFocusedStatement();
    //     const focusedPosition = this.module.editor.monaco.getPosition();

    //     	this.getTokenAtStatementColumn(focusedStatement, focusedPosition.column);
    // 	}

    //     return this.focusToken;
    // }

    // isFocusedTokenHole(): boolean {
    //     const focusedToken = this.getFocusedToken();

    //     if (focusedToken instanceof ast.Token && focusedToken.isEmpty) return true;

    //     return false;
    // }

    private getTokenAtStatementColumn(statement: ast.Statement, column: number): ast.CodeConstruct {
        const tokensStack = new Array<ast.CodeConstruct>();

        for (const token of statement.tokens) tokensStack.unshift(token);

        while (tokensStack.length > 0) {
            const curToken = tokensStack.pop();

            if (column >= curToken.left && column < curToken.right && curToken instanceof ast.Token) return curToken;

            // print("Hello")

            if (curToken instanceof ast.Expression)
                if (curToken.tokens.length > 0) for (let token of curToken.tokens) tokensStack.unshift(token);
                else return curToken;
        }

        return null;
    }

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

    private isEmptyLine(line: string): boolean {
        return line.trim().length == 0;
    }

    private selectCode(code: ast.CodeConstruct) {
        if (code != null) {
            const selection = new monaco.Selection(code.getLineNumber(), code.right, code.getLineNumber(), code.left);

            this.module.editor.monaco.setSelection(selection);
        }
    }

    // atEndOfExpression()

    // isTextEditable()

    // TODO: we can have a similar function for getContextFromSelection(statement: ast.Statement, column: number): Context {}

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
                        `getContextFromPosition(statement: ${statement}, left: ${left}, right: ${right}) -> found expression with no child tokens.`
                    );
                }
            }
        }

        return context;
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
                    context.token = null;

                    break;
                } else if (column == curToken.right) {
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
                    context.token = null;

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
