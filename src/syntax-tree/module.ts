import { Position, Range } from "monaco-editor";
import { ActionExecutor } from "../editor/action-executor";
import { ActionFilter } from "../editor/action-filter";
import { CodeStatus, EditActionType } from "../editor/consts";
import { EditAction } from "../editor/data-types";
import { DraftRecord } from "../editor/draft";
import { Editor } from "../editor/editor";
import { EventRouter } from "../editor/event-router";
import { EventStack } from "../editor/event-stack";
import { Context, Focus } from "../editor/focus";
import { Hole } from "../editor/hole";
import { loadToolboxFromJson, updateButtonsVisualMode } from "../editor/toolbox";
import { Validator } from "../editor/validator";
import { ConstructHighlight } from "../notification-system/notification";
import { NotificationSystemController } from "../notification-system/notification-system-controller";
import { MenuController } from "../suggestions/suggestions-controller";
import { Util } from "../utilities/util";
import {
    AutocompleteTkn,
    CodeConstruct,
    EmptyLineStmt,
    Expression,
    ForStatement,
    Importable,
    ImportStatement,
    ListLiteralExpression,
    Statement,
    Token,
    TypedEmptyExpr,
    VarAssignmentStmt,
    VariableReferenceExpr,
} from "./ast";
import { rebuildBody } from "./body";
import { CallbackType } from "./callback";
import { DataType, MISSING_IMPORT_DRAFT_MODE_STR, TAB_SPACES } from "./consts";
import { Reference, Scope } from "./scope";
import { TypeChecker } from "./type-checker";
import { VariableController } from "./variable-controller";

const ERROR_HIGHLIGHT_COLOUR: [number, number, number, number] = [255, 153, 153, 0.5];

/**
 * The main body of the code which includes an array of statements.
 */
export class Module {
    static draftModeButtonClass = "draftModeButton";
    static disabledButtonClass = "disabled";

    body = new Array<Statement>();
    focus: Focus;
    validator: Validator;
    executer: ActionExecutor;
    eventRouter: EventRouter;
    eventStack: EventStack;
    editor: Editor;
    variableButtons: HTMLDivElement[] = [];
    notificationSystem: NotificationSystemController;
    menuController: MenuController;
    typeSystem: TypeChecker;

    scope: Scope;
    draftExpressions: DraftRecord[];

    variableController: VariableController;
    actionFilter: ActionFilter;

    globals: { hoveringOverCascadedMenu: boolean; hoveringOverVarRefButton: boolean; lastPressedRunButtonId: string };

    constructor(editorId: string) {
        this.editor = new Editor(document.getElementById(editorId), this);
        this.focus = new Focus(this);
        this.validator = new Validator(this);
        this.executer = new ActionExecutor(this);
        this.typeSystem = new TypeChecker(this);
        this.variableController = new VariableController(this);
        this.actionFilter = new ActionFilter(this);

        this.globals = {
            hoveringOverCascadedMenu: false,
            hoveringOverVarRefButton: false,
            lastPressedRunButtonId: "",
        };

        loadToolboxFromJson();

        this.draftExpressions = [];

        Hole.setModule(this);

        this.focus.subscribeOnNavChangeCallback((c: Context) => {
            const statementAtLine = this.focus.getStatementAtLineNumber(this.editor.monaco.getPosition().lineNumber);
            const statementScope = statementAtLine.scope ?? (statementAtLine.rootNode as Statement | Module).scope;

            this.variableController.hideUnavailableVarsInToolbox(
                statementScope,
                this.editor.monaco.getPosition().lineNumber
            );

            Hole.disableEditableHoleOutlines();
            Hole.disableVarHighlights();
            Hole.outlineTextEditableHole(c);
            Hole.highlightValidVarHoles(c);
        });

        this.focus.subscribeOnNavChangeCallback((c: Context) => {
            Hole.disableEditableHoleOutlines();
            Hole.disableVarHighlights();
            Hole.outlineTextEditableHole(c);
            Hole.highlightValidVarHoles(c);
        });

        //TODO: Don't know where functionality like this should go, but once we decide on that, it would be better to refactor this one to
        //use methods like above code
        this.focus.subscribeOnNavChangeCallback(
            ((c: Context) => {
                // if (
                //     !(
                //         c.tokenToLeft instanceof AutocompleteTkn ||
                //         c.tokenToRight instanceof AutocompleteTkn ||
                //         c.token instanceof AutocompleteTkn
                //     )
                // ) {
                const inserts = this.actionFilter.getProcessedInsertionsList();

                //mark draft mode buttons
                updateButtonsVisualMode(inserts);
                // }
            }).bind(this)
        );

        this.focus.subscribeOnNavChangeCallback((c: Context) => {
            const menuController = MenuController.getInstance();

            if (
                !(
                    c.token instanceof AutocompleteTkn ||
                    c.tokenToLeft instanceof AutocompleteTkn ||
                    c.tokenToRight instanceof AutocompleteTkn
                ) &&
                menuController.isMenuOpen()
            )
                menuController.removeMenus();
        });

        this.body.push(new EmptyLineStmt(this, 0));
        this.scope = new Scope();
        this.body[0].build(new Position(1, 1));

        this.focus.updateContext({ tokenToSelect: this.body[0] });
        this.editor.monaco.focus();

        this.eventRouter = new EventRouter(this);
        this.eventStack = new EventStack(this);

        this.notificationSystem = new NotificationSystemController(this.editor, this);

        this.variableButtons = [];

        this.menuController = MenuController.getInstance();
        this.menuController.setInstance(this, this.editor);

        Util.getInstance(this);
    }

    recursiveNotify(code: CodeConstruct, callbackType: CallbackType) {
        code.notify(callbackType);

        if (code instanceof Expression || code instanceof Statement) {
            const codeStack = new Array<CodeConstruct>();
            codeStack.unshift(...code.tokens);

            if (code instanceof Statement && code.hasBody()) codeStack.unshift(...code.body);

            while (codeStack.length > 0) {
                const curCode = codeStack.pop();
                curCode.notify(callbackType);

                if (curCode instanceof Statement || curCode instanceof Expression) codeStack.unshift(...curCode.tokens);
                if (curCode instanceof Statement && curCode.hasBody()) codeStack.unshift(...curCode.body);
            }
        } else if (code instanceof Token) code.notify(callbackType);
    }

    indentBackStatement(line: Statement) {
        const root = line.rootNode;

        if (root instanceof Statement) {
            if (!line.hasBody()) {
                const removedItem = root.body.splice(line.indexInRoot, 1);

                let outerRoot = root.rootNode as Module | Statement;

                removedItem[0].rootNode = root.rootNode;
                removedItem[0].indexInRoot = root.indexInRoot + 1;
                removedItem[0].build(new Position(line.lineNumber, line.left - TAB_SPACES));

                outerRoot.body.splice(root.indexInRoot + 1, 0, ...removedItem);
                rebuildBody(this, 0, 1);

                if (line instanceof VarAssignmentStmt) {
                    root.scope.references = root.scope.references.filter((ref) => {
                        ref.statement !== line;
                    });
                }

                outerRoot.scope.references.push(new Reference(line, outerRoot.scope));
            } else {
                const removedItem = root.body.splice(line.indexInRoot, 1);

                let outerRoot = root.rootNode as Module | Statement;

                removedItem[0].rootNode = root.rootNode;
                removedItem[0].indexInRoot = root.indexInRoot + 1;
                removedItem[0].build(new Position(line.lineNumber, line.left - TAB_SPACES));

                const stmtStack = new Array<Statement>();
                stmtStack.unshift(...removedItem[0].body);

                while (stmtStack.length > 0) {
                    const curStmt = stmtStack.pop();
                    curStmt.build(new Position(curStmt.lineNumber, curStmt.left - TAB_SPACES));

                    if (curStmt.hasBody()) stmtStack.unshift(...curStmt.body);
                }

                removedItem[0].scope.parentScope = outerRoot.scope;

                outerRoot.body.splice(root.indexInRoot + 1, 0, ...removedItem);
                rebuildBody(this, 0, 1);
            }
        }
    }

    indentForwardStatement(line: Statement) {
        const root = line.rootNode;

        if (root instanceof Statement || root instanceof Module) {
            if (!line.hasBody()) {
                const aboveMultilineStmt = root.body[line.indexInRoot - 1];
                const removedItem = root.body.splice(line.indexInRoot, 1);

                removedItem[0].rootNode = aboveMultilineStmt;
                removedItem[0].indexInRoot = aboveMultilineStmt.body.length;
                removedItem[0].build(new Position(line.lineNumber, line.left + TAB_SPACES));

                aboveMultilineStmt.body.push(removedItem[0]);
                rebuildBody(this, 0, 1);

                if (line instanceof VarAssignmentStmt) {
                    root.scope.references = root.scope.references.filter((ref) => {
                        ref.statement !== line;
                    });
                }

                aboveMultilineStmt.scope.references.push(new Reference(line, aboveMultilineStmt.scope));
            } else {
                const aboveMultilineStmt = root.body[line.indexInRoot - 1];
                const removedItem = root.body.splice(line.indexInRoot, 1);

                removedItem[0].rootNode = aboveMultilineStmt;
                removedItem[0].indexInRoot = aboveMultilineStmt.body.length;
                removedItem[0].build(new Position(line.lineNumber, line.left + TAB_SPACES));

                const stmtStack = new Array<Statement>();
                stmtStack.unshift(...removedItem[0].body);

                while (stmtStack.length > 0) {
                    const curStmt = stmtStack.pop();
                    curStmt.build(new Position(curStmt.lineNumber, curStmt.left + TAB_SPACES));

                    if (curStmt.hasBody()) stmtStack.unshift(...curStmt.body);
                }

                aboveMultilineStmt.body.push(removedItem[0]);
                rebuildBody(this, 0, 1);

                line.scope.parentScope = aboveMultilineStmt.scope;
            }
        }
    }

    removeItems(code: CodeConstruct, start: number, count: number): Array<CodeConstruct> {
        if (code instanceof Statement) {
            const removedItems = code.tokens.splice(start, count);

            for (const item of removedItems) {
                this.recursiveNotify(item, CallbackType.delete);
            }

            code.rebuild(code.getLeftPosition(), 0);

            return removedItems;
        }

        return [];
    }

    removeStatement(line: Statement): CodeConstruct {
        const root = line.rootNode;

        if (root instanceof Module || root instanceof Statement) {
            const replacement = new EmptyLineStmt(root, line.indexInRoot);
            this.recursiveNotify(line, CallbackType.delete);
            root.body.splice(line.indexInRoot, 1, replacement);
            replacement.build(line.getLeftPosition());
            rebuildBody(this, 0, 1);

            return replacement;
        }

        return null;
    }

    deleteLine(line: Statement) {
        const root = line.rootNode;

        if (root instanceof Module || root instanceof Statement) {
            this.recursiveNotify(line, CallbackType.delete);
            root.body.splice(line.indexInRoot, 1);
            rebuildBody(this, 0, 1);
        }
    }

    removeItem(item: CodeConstruct, { replaceType = null }): CodeConstruct {
        const root = item.rootNode;

        if (root instanceof Statement) {
            if (root instanceof ListLiteralExpression) replaceType = DataType.Any;

            const replacedItem = new TypedEmptyExpr(replaceType ? replaceType : root.typeOfHoles[item.indexInRoot]);
            this.recursiveNotify(item, CallbackType.delete);

            root.tokens.splice(item.indexInRoot, 1, replacedItem)[0];

            for (let i = 0; i < root.tokens.length; i++) {
                root.tokens[i].indexInRoot = i;
                root.tokens[i].rootNode = root;
            }

            root.rebuild(root.getLeftPosition(), 0);

            return replacedItem;
        }

        return null;
    }

    reset() {
        this.body = new Array<Statement>();

        this.body.push(new EmptyLineStmt(this, 0));
        this.scope = new Scope();

        this.body[0].build(new Position(1, 1));
        this.focus.updateContext({ tokenToSelect: this.body[0] });

        this.editor.reset();
        this.editor.monaco.focus();

        this.variableButtons.forEach((button) => button.remove());
        this.variableButtons = [];

        this.notificationSystem.clearAllNotifications();
    }

    getVarRefHandler(ref: VarAssignmentStmt) {
        return function () {
            this.insert(new VariableReferenceExpr(ref.getIdentifier(), ref.dataType, ref.buttonId));
        };
    }

    /**
     * Adds `code` to the body at the given index
     * @param code the statement to be added
     * @param index the index to add the `code` statement
     * @param line the line number that will be given to the newly added statement
     */
    addStatementToBody(bodyContainer: Statement | Module, code: Statement, index: number, line: number) {
        bodyContainer.body.splice(index, 0, code);
        for (let i = index + 1; i < bodyContainer.body.length; i++) bodyContainer.body[i].indexInRoot++;

        rebuildBody(bodyContainer, index + 1, line + code.getHeight());
        if (code.hasScope()) code.scope.parentScope = bodyContainer.scope;

        if (bodyContainer instanceof Statement) {
            bodyContainer.notify(CallbackType.change);
        }
    }

    processNewVariable(statement: Statement, workingScope: Scope) {
        if (statement instanceof VarAssignmentStmt) {
            workingScope.references.push(new Reference(statement, workingScope));
        }

        if (statement instanceof ForStatement) {
            statement.scope.references.push(new Reference(statement.loopVar, workingScope));
        }
    }

    insertEmptyLine(): Statement {
        const curPos = this.editor.monaco.getPosition();
        const curStatement = this.focus.getFocusedStatement();
        const curStatementRoot = curStatement.rootNode;

        let leftPosToCheck = 1;
        let parentStmtHasBody = false;
        let textToAdd = "\n";
        let spaces = "";
        let atCompoundStmt = false;

        if (curStatementRoot instanceof Statement && curStatementRoot.hasBody()) {
            // is inside the body of another statement
            leftPosToCheck = curStatementRoot.left + TAB_SPACES;
            parentStmtHasBody = true;

            if (leftPosToCheck != 1) {
                for (let i = 0; i < curStatementRoot.left + TAB_SPACES - 1; i++) spaces += " ";
            }
        }

        if (curStatement instanceof Statement && curStatement.hasBody() && curPos.column != curStatement.left) {
            // is at the header statement of a statement with body
            leftPosToCheck = curStatement.left + TAB_SPACES;
            parentStmtHasBody = true;
            atCompoundStmt = true;

            if (leftPosToCheck != 1) {
                for (let i = 0; i < curStatement.left + TAB_SPACES - 1; i++) spaces += " ";
            }
        }

        if (curPos.column == leftPosToCheck) {
            // insert emptyStatement at this line, move other statements down
            const emptyLine = new EmptyLineStmt(parentStmtHasBody ? curStatementRoot : this, curStatement.indexInRoot);

            emptyLine.build(curStatement.getLeftPosition());

            if (parentStmtHasBody) {
                this.addStatementToBody(
                    curStatementRoot as Statement,
                    emptyLine,
                    curStatement.indexInRoot,
                    curStatement.lineNumber
                );
            } else this.addStatementToBody(this, emptyLine, curStatement.indexInRoot, curStatement.lineNumber);

            const range = new Range(curStatement.lineNumber - 1, 1, curStatement.lineNumber - 1, 1);
            this.editor.executeEdits(range, null, spaces + textToAdd);

            return emptyLine;
        } else {
            // insert emptyStatement on next line, move other statements down
            const emptyLine = new EmptyLineStmt(
                parentStmtHasBody ? curStatementRoot : this,
                curStatement.indexInRoot + 1
            );
            emptyLine.build(new Position(curStatement.lineNumber + 1, leftPosToCheck));

            if (parentStmtHasBody && atCompoundStmt) {
                emptyLine.indexInRoot = 0;
                emptyLine.rootNode = curStatement;
                this.addStatementToBody(curStatement as Statement, emptyLine, 0, curStatement.lineNumber + 1);
            } else if (parentStmtHasBody) {
                this.addStatementToBody(
                    curStatementRoot as Statement,
                    emptyLine,
                    curStatement.indexInRoot + 1,
                    curStatement.lineNumber + 1
                );
            } else this.addStatementToBody(this, emptyLine, curStatement.indexInRoot + 1, curStatement.lineNumber + 1);

            const range = new Range(
                curStatement.lineNumber,
                curStatement.right,
                curStatement.lineNumber,
                curStatement.right
            );
            this.editor.executeEdits(range, null, textToAdd + spaces);
            this.focus.updateContext({ tokenToSelect: emptyLine });

            return emptyLine;
        }
    }

    replaceFocusedExpression(expr: Expression) {
        const context = this.focus.getContext();

        if (context.expression != null) {
            const root = context.expression.rootNode as Statement;
            root.replace(expr, context.expression.indexInRoot);
        } else if (context.token != null) {
            const root = context.token.rootNode as Statement;
            root.replace(expr, context.token.indexInRoot);
        }
    }

    //Accepts context because this will not be part of Module in the future
    isAbleToInsertComparator(context: Context, insertEquals: boolean = false): boolean {
        return (
            (context.selected &&
                context.token instanceof TypedEmptyExpr &&
                (context.token as TypedEmptyExpr).type.indexOf(DataType.Boolean) > -1) ||
            //TODO: This case needs to be extended further since this is not always possible
            //      For example: randint(1, 2) cannot become randint(1 > 2, 2)
            //      Parent needs to be involved in the check
            //left or right is an expression
            context.expressionToLeft.returns === DataType.Number ||
            context.expressionToRight.returns === DataType.Number ||
            //equals can compare types other than Number (of course >, >=, < and <= also operate on types other than Number, but ignore that for now since our tool likely does not need it)
            (context.expressionToLeft && context.expressionToRight && insertEquals)
        );
    }

    closeConstructDraftRecord(code: CodeConstruct) {
        if (code.draftModeEnabled) {
            code.draftModeEnabled = false;
            const removedRecord = this.draftExpressions.splice(this.draftExpressions.indexOf(code.draftRecord), 1)[0];

            if (removedRecord.warning) removedRecord.removeNotification();

            code.draftRecord = null;
        } else {
            console.warn("Tried closing draft mode of construct that did not have one open.");
        }
    }

    openDraftMode(code: Statement, txt: string = "Draft Mode Placeholder Txt", actionButtons: HTMLDivElement[]) {
        code.draftModeEnabled = true;
        this.draftExpressions.push(new DraftRecord(code, this, txt));
        code.draftRecord = this.draftExpressions[this.draftExpressions.length - 1];

        for (const button of actionButtons) {
            code.notification.addButton("I AM BUTTON");
        }
    }

    addHighlightToConstruct(construct: CodeConstruct, rgbColour: [number, number, number, number]) {
        const hl = new ConstructHighlight(this.editor, construct, rgbColour);
    }

    getCodeStatus(highlightConstructs: boolean = false) {
        let ret = null;
        if (this.body.length === 0 || (this.body.length === 1 && this.body[0] instanceof EmptyLineStmt)) {
            return CodeStatus.Empty;
        }
        const Q: CodeConstruct[] = [];
        Q.push(...this.body);

        while (Q.length > 0) {
            let curr: CodeConstruct = Q.splice(0, 1)[0];

            if (curr instanceof TypedEmptyExpr && !curr.isListElement()) {
                ret = ret ?? CodeStatus.ContainsEmptyHoles;

                if (highlightConstructs) {
                    this.addHighlightToConstruct(curr, ERROR_HIGHLIGHT_COLOUR);
                }
            } else if (curr instanceof AutocompleteTkn) {
                ret = ret ?? CodeStatus.ContainsAutocompleteTkns;

                if (highlightConstructs) {
                    this.addHighlightToConstruct(curr, ERROR_HIGHLIGHT_COLOUR);
                }
            } else if (curr.draftModeEnabled) {
                ret = ret ?? CodeStatus.ContainsDraftMode;

                if (highlightConstructs) {
                    this.addHighlightToConstruct(curr, ERROR_HIGHLIGHT_COLOUR);
                }
            } else if (curr instanceof Expression && curr.tokens.length > 0) {
                const addHighlight = curr instanceof ListLiteralExpression && !curr.isHolePlacementValid();
                ret = addHighlight ? CodeStatus.ContainsEmptyHoles : ret;

                for (let i = 0; i < curr.tokens.length; i++) {
                    if (curr.tokens[i] instanceof TypedEmptyExpr && addHighlight && i < curr.tokens.length - 2) {
                        this.addHighlightToConstruct(curr.tokens[i], ERROR_HIGHLIGHT_COLOUR);
                    }
                    Q.push(curr.tokens[i]);
                }
            } else if (curr instanceof Statement) {
                for (const tkn of curr.tokens) {
                    Q.push(tkn);
                }
                if (curr.body.length > 0) {
                    Q.push(...curr.body);
                }
            }
        }

        return ret ?? CodeStatus.Runnable;
    }

    performActionOnBFS(duringAction: (code: CodeConstruct) => void) {
        const Q: CodeConstruct[] = [];
        Q.push(...this.body);

        while (Q.length > 0) {
            let curr: CodeConstruct = Q.splice(0, 1)[0];

            if (curr instanceof Expression && curr.tokens.length > 0) {
                Q.push(...curr.tokens);
            } else if (curr instanceof Statement) {
                for (const tkn of curr.tokens) {
                    Q.push(tkn);
                }
                if (curr.body.length > 0) {
                    Q.push(...curr.body);
                }
            }

            duringAction(curr);
        }
    }

    getAllImportStmts(): ImportStatement[] {
        const stmts: ImportStatement[] = [];

        this.performActionOnBFS((code: CodeConstruct) => {
            if (code instanceof ImportStatement) {
                stmts.push(code);
            }
        });

        return stmts;
    }

    openImportDraftMode(code: Statement & Importable) {
        this.openDraftMode(code, MISSING_IMPORT_DRAFT_MODE_STR(code.getKeyword(), code.requiredModule), []);

        const button = code.notification.addButton(`import ${code.requiredModule}`);
        button.addEventListener(
            "click",
            (() => {
                this.executer.execute(
                    new EditAction(EditActionType.InsertImportFromDraftMode, {
                        moduleName: code.requiredModule,
                        itemName: code.getKeyword(),
                    }),
                    this.focus.getContext()
                );

                this.validator.validateImports();
            }).bind(this)
        );
    }
}
