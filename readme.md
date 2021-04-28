# Nova Editor
A text-based editor for novices that enables the transition from block-based to text-based programming environments.

## Features
Features of a scratch-like editor and its custom Abstract Syntax Tree (AST):
1. Holes (empty values or identifiers):
   - Expression holes (that have a type: string, number, boolean, ...)
   - Name holes: function/variable 
   - Empty lines (for initializing statements that have a body: if, for, while, def, class, …)

2. Selecting tokens:
   - Keywords select the whole block:
   - `def` (the whole function)
   - `for` and `while` (the whole loop)
   - conditional statements (`if`, `elif`, `else` are selected separately)
   - each token should have a `getSelection()` method that returns a `Selection` object corresponding to what needs to be selected for that particular item when selected.

3. Editing (modifying, deleting) types:	
   - Strings (with double quotes “sample text”)
   - Numbers
   - Booleans
   - More advanced types: `list`, `dict`, `iterable`
   - Editing a function/variable name
   - Editing an empty expression (which takes a particular data type)
   - Deleting things should convert them back to specific types of holes
   - in summary, we have the following *edit* functions:
     - literal values: `set-number`, `set-text`, `set-boolean`
     - `add-stmt`
     - `set-id`
     - `change-id`
     - `set-expr` can have a change-expr later
     - `delete-expr`
     - `delete-stmt`
     - `set-literal`
     - `change-literal`
     - future work:
       - add/remove **argument** in function call and function def
       - add/remove **methods** and **parameters** in classes
       - 

4. Focusing the cursor:
   - When adding new statements, the cursor should jump to the next editable item

5. Building start (left) and end (right) cursor positions: 
   - Each statement has two editable places for adding statements before and after it: 
   - Start: for adding a new statement before the current line
   - End: for adding a statement after the current line
   - Or a plus button between statements (when its selected)

6. Locating: when moving the cursor, or clicking
   - Every token, expression, and statement should have its left and right boundaries
   - Every statement and expression should have a line number
   - Should always know where we are in the code, and where we are in the AST.

7. Scope Management: 
   - Should maintain a reference table for user defined variables and functions

8. Cursor Navigator: listening to arrow-key presses and click positions in the editor
   - Based on the “editability” of each token, expression, and statement, the cursor manager navigates the user to the next editable (or removable) item in the text (not just the next character).

9. Balanced parenthesis:
   - All binary operators should have parenthesis

10. Infer data types:
   - the user will first add a `+` expression, and then the two operands. Therefore, the return type of the binary add expression and the other operand could be inferred (and limited) after they have been populated: + is always two numbers, but * could have a number and a string (returns string)

11. Expression Editors:
   - **beginner level**: if the argument type is Number, Text or Boolean => there could be a tiny plus button between the operands of the TypedExpression that when the user navigates there, it will allow the user to add binary/unary/literal expressions in between them.
   - **advanced level**: when the user advances, the UI should allow for editing expressions with a simple parser (and no scaffolding). The cursor at this point is able to freely move inside the parsable text.


# Navigation
Design goals for the code navigation system:
- be consistent
- prevent errors
- be similar to text-based editors
- to be useful and have a meaning

- **Start-of-line** token:
  - next: the whole line (statement)
  - prev: 
    - if there is a line above, go to the end-of-line of the top line
    - else stay here (return this)

- **End-of-line** token:
  - next: 
    - if there is a line below, go to the star-of-line of the bottom line
    - else, stay here (return this)
  - prev:
    - the previous editable item in the statement based: search for this.root.tokens => this.indexInRoot - 1 to 0
      - if its an editable token or a literal-val-expr => go to the last index of it (so the user could continue editing the textual thing)
      - else if its an expression => select the whole expression

- **Editable-text** token:
  - next: 
    - if at the end => go to the next editable item
    - o.w. => go to the next char in the text
  - prev:
    - if at the beginning => go to the prev editable item (maintain the above rule for going to prev item)
    - o.w. => go to the prev char in the text

- **Statement**:
  - next: 
    - go to the first editable item in stmt.tokens => and select the whole
  - prev:
    - go the start-of-line token

- **Expression**:
  - next: 
    - search for the first next editable item in `expr.tokens` from `expr.indexInRoot + 1` to `expr.tokens.length` => and select the whole
  - prev:
    - go the the prev editable item in `expr.root.tokens` from `expr.indexInRoot - 1` to `0`

**Meeting notes (4/27/2021)**:
   - Integrate ability to type, and update with the input
	- Simple autocomplete system
	- What are the space of possible statements given some context of where the user is at
		- Code constructs (while, if, for, def, class) not (elif, else) 
		- Built-in functions that do not return anything and do not update state of anything
			- e.g. print(...), len(...), 
		- Defining a variable
		- Updating the value of variable
		   - Member assignment (like 'list[2] = 5')
		   - Update statement
		      - +=, -=  
		- Calling a method on that variable
		- Return statement
   - What are the space of expressions
      - Literals
         - Number
            - [0-9]
         - String
            - "['a->z']"
         - Boolean
            -  True, False
      - Identifier
         - Variable
         - Member / index into list
      - List [] 
      - Call expression
         - f(x) -> y
         - range(2)
         - range(1, 5, 1)
      - Unary Operator
         - +, -
      - Binary Operations (constraint: needs a left expression to exist)
         - a + b, a * b
         - a < b, a <= b
         - if (5 > 2+):
      - A ( ,+,-, ...) close off text editable nodes (i.e. Literal or Identifier)
         - [If within array] ',' closes it off
         - [If within arguments] ',' closes it off

- Modify parent of an expression
	- e.g. from 'x = array' -> 'x = len(array)'


- Show user alternative paths to teach them concepts  
   - (a + b) / 2
   - a, b are both strings => user can type 'b.__' 
   - Suggestion button that shows an alternative
      - Tiny notification of the suggestion that the user clicks
