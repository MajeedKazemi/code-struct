import { ForStatement, Statement, VarAssignmentStmt } from "./ast";

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
    //NOTE: the references are tied to variable assignment statements so this is equivalent to finding all assignments to a variable
    getAllAssignmentsToVariable(identifier: string, excludeStmt?: VarAssignmentStmt | ForStatement) {
        return this.references.filter((ref) => {
            if (ref.statement instanceof ForStatement) {
                return ref.statement.loopVar.getIdentifier() === identifier && excludeStmt !== ref.statement;
            } else if (ref.statement instanceof VarAssignmentStmt) {
                return ref.statement.getIdentifier() === identifier && excludeStmt !== ref.statement;
            }
        });
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
