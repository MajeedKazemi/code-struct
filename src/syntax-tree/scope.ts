import { hasMatchWithIndex } from "../utilities/util";
import { CodeConstruct, ForStatement, Statement, VarAssignmentStmt } from "./ast";
import { Module } from "./module";

/**
 * These scopes are created by multi-line statements
 */
export class Scope {
    parentScope: Scope = null;
    references = new Array<Reference>();

    isValidReference(uniqueId: string, line: number): boolean {
        const validReferences = this.getValidReferences(line);

        for (let ref of validReferences) {
            if (
                (ref.statement instanceof VarAssignmentStmt && ref.statement.buttonId == uniqueId) ||
                (ref.statement instanceof ForStatement && ref.statement.buttonId == uniqueId)
            ) {
                return true;
            }
        }

        return false;
    }

    getValidReferences(line: number): Array<Reference> {
        let validReferences = this.references.filter((ref) => ref.line() < line);

        if (this.parentScope != null) {
            validReferences = validReferences.concat(this.parentScope.getValidReferences(line));
        }

        return validReferences;
    }

    //return all existing references to the variable with the given identifier in this scope
    //we can be sure that there is at most one variable with this identifier in the scope
    //because we disallow creation of duplicates through checks when a new variable is created
    //NOTE: the references are tied to variable assignment statements so this is equivalent to finding all assignments to a variable
    getAllAssignmentsToVariableWithinScope(identifier: string, excludeStmt?: VarAssignmentStmt | ForStatement) {
        let validReferences = this.references.filter((ref) => {
            if (ref.statement instanceof ForStatement) {
                return ref.statement.loopVar.getIdentifier() === identifier && excludeStmt !== ref.statement;
            } else if (ref.statement instanceof VarAssignmentStmt) {
                return ref.statement.getIdentifier() === identifier && excludeStmt !== ref.statement;
            }
        });

        if (this.parentScope != null) {
            validReferences = validReferences.concat(
                this.parentScope.getAllAssignmentsToVariableWithinScope(identifier)
            );
        }

        return validReferences;
    }

    private getAllScopesOfStmt(stmt: Statement) {
        let currStatement: Statement | Module = stmt;
        const scopes: Scope[] = [];

        while (currStatement && !(currStatement instanceof Module)) {
            scopes.push((currStatement.rootNode as Statement | Module).scope);
            currStatement = currStatement.rootNode as Statement | Module;
        }

        return scopes;
    }

    private getAllAssignmentsToVar(identifier: string, module: Module) {
        const assignments: VarAssignmentStmt[] = [];
        //Find all assignments to vars with this identifier
        const Q: CodeConstruct[] = [];
        Q.push(...module.body);

        let currNode;
        while (Q.length > 0) {
            currNode = Q.splice(0, 1)[0];

            if (currNode instanceof VarAssignmentStmt && currNode.getIdentifier() === identifier) {
                assignments.push(currNode);
            } else if (currNode instanceof ForStatement && currNode.loopVar.getIdentifier() === identifier) {
                assignments.push(currNode.loopVar);
            }

            if (currNode instanceof Statement) {
                Q.push(...currNode.tokens);
                Q.push(...currNode.body);
            }
        }

        return assignments;
    }

    /**
     * This method determines whether an assignment to a given variable exists and would be covered by the scope at
     * lineNumber. If not, then we are creating a new variable. It returns all such assignments in an array.
     */
    getAllVarAssignmentsToNewVar(
        identifier: string,
        module: Module,
        lineNumber: number,
        excludeStmt: VarAssignmentStmt = null
    ) {
        let assignments: VarAssignmentStmt[] = this.getAllAssignmentsToVar(identifier, module);

        //We know these are the same vaiable if their scopes match at some point
        let statement = module.focus.getStatementAtLineNumber(lineNumber);

        //find the scope that contains the current line
        let workingScope = statement.scope;
        let currStatement = statement;
        while (!workingScope && currStatement && currStatement.rootNode) {
            workingScope = (currStatement.rootNode as Module | Statement).scope;

            if (currStatement.rootNode instanceof Module) {
                break;
            } else {
                currStatement = currStatement.rootNode as Statement;
            }
        }

        //filter out variable assignments that are not in this scope
        assignments = assignments.filter((assignmentStmt) => {
            if (assignmentStmt !== excludeStmt) {
                const newAssignmentScopes = this.getAllScopesOfStmt(excludeStmt);
                const oldAssignmentScopes = this.getAllScopesOfStmt(assignmentStmt);
                const matchInfo = hasMatchWithIndex(newAssignmentScopes, oldAssignmentScopes);

                if (lineNumber < assignmentStmt.lineNumber) {
                    //new var is above old var assignment; new is in-scope of old
                    return true;
                } else if (lineNumber > assignmentStmt.lineNumber && matchInfo[0] < matchInfo[1]) {
                    //new is below old assignment, if scope of old assignment is at least one level deeper than the scope of the new var assign, they are diff vars
                    return false;
                } else if (matchInfo[0] === matchInfo[1]) {
                    //if var scopes are on the same level, then they are the same as long as the roots of both assignments match
                    return excludeStmt ? assignmentStmt.rootNode === excludeStmt.rootNode : false;
                } else {
                    return excludeStmt ? assignmentStmt.scope === excludeStmt.scope : false; //two vars are in same scope
                }
            }
        });

        return assignments;
    }

    getAllVarAssignmentsAboveLine(
        identifier: string,
        module: Module,
        lineNumber: number,
        excludeCurrentLine: boolean = true
    ) {
        if (excludeCurrentLine) {
            return this.getAllAssignmentsToVar(identifier, module).filter((stmt) => stmt.lineNumber < lineNumber);
        }

        return this.getAllAssignmentsToVar(identifier, module).filter((stmt) => stmt.lineNumber <= lineNumber);
    }
}

export class Reference {
    /**
     * Currently, either a variable or a function declaration. Could later be a class declaration.
     */
    statement: Statement;

    /**
     * The valid scope in which this item could be referenced.
     */
    scope: Scope;

    constructor(statement: Statement, scope: Scope) {
        this.statement = statement;
        this.scope = scope;
    }

    line(): number {
        return this.statement.lineNumber;
    }
}
