"use strict";

const fs = require("fs");


// ============================================================
// TOKEN
// ============================================================

class Token {
    constructor(type, value = null, line = 0) {
        this.type = type;
        this.value = value;
        this.line = line;
    }
}


// ============================================================
// TOKENIZER
// ============================================================

class Tokenizer {

    constructor(code) {
        this.code = code;
        this.tokens = [];
    }

    tokenize() {

        const lines = this.code.split(/\r?\n/);
        const indentStack = [0];

        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {

            let line = lines[lineNumber];

            // Convertir tabs a 4 espacios
            line = line.replace(/\t/g, "    ");

            // Contar indentación
            let spaces = 0;

            while (
                spaces < line.length &&
                line[spaces] === " "
            ) {
                spaces++;
            }

            const text = line.slice(spaces);

            // Línea vacía
            if (text.trim() === "") {
                continue;
            }

            // Comentario
            if (text.trim().startsWith("#")) {
                continue;
            }

            // ------------------------------------------------
            // INDENT
            // ------------------------------------------------

            if (spaces > indentStack[indentStack.length - 1]) {

                indentStack.push(spaces);

                this.tokens.push(
                    new Token(
                        "INDENT",
                        null,
                        lineNumber + 1
                    )
                );

            }

            // ------------------------------------------------
            // DEDENT
            // ------------------------------------------------

            while (
                spaces <
                indentStack[indentStack.length - 1]
            ) {

                indentStack.pop();

                this.tokens.push(
                    new Token(
                        "DEDENT",
                        null,
                        lineNumber + 1
                    )
                );
            }

            // Verificar indentación inválida
            if (
                spaces !==
                indentStack[indentStack.length - 1]
            ) {

                throw new Error(
                    `IndentationError at line ${lineNumber + 1}`
                );

            }

            this.tokenizeLine(
                text,
                lineNumber + 1
            );

            this.tokens.push(
                new Token(
                    "NEWLINE",
                    null,
                    lineNumber + 1
                )
            );
        }

        // DEDENT finales

        while (indentStack.length > 1) {

            indentStack.pop();

            this.tokens.push(
                new Token(
                    "DEDENT"
                )
            );
        }

        this.tokens.push(
            new Token("EOF")
        );

        return this.tokens;
    }


    tokenizeLine(line, lineNumber) {

        let i = 0;

        while (i < line.length) {

            const char = line[i];


            // ------------------------------------------------
            // ESPACIOS
            // ------------------------------------------------

            if (
                char === " " ||
                char === "\t"
            ) {

                i++;
                continue;
            }


            // ------------------------------------------------
            // COMENTARIO
            // ------------------------------------------------

            if (char === "#") {
                break;
            }


            // ------------------------------------------------
            // NÚMERO
            // ------------------------------------------------

            if (/[0-9]/.test(char)) {

                let number = "";

                while (
                    i < line.length &&
                    /[0-9.]/.test(line[i])
                ) {

                    number += line[i];
                    i++;

                }

                if (
                    (number.match(/\./g) || []).length > 1
                ) {

                    throw new Error(
                        `Invalid number at line ${lineNumber}`
                    );

                }

                this.tokens.push(
                    new Token(
                        "NUMBER",
                        Number(number),
                        lineNumber
                    )
                );

                continue;
            }


            // ------------------------------------------------
            // STRING
            // ------------------------------------------------

            if (
                char === '"' ||
                char === "'"
            ) {

                const quote = char;

                i++;

                let value = "";

                while (
                    i < line.length &&
                    line[i] !== quote
                ) {

                    if (
                        line[i] === "\\" &&
                        i + 1 < line.length
                    ) {

                        i++;

                        const escaped =
                            line[i];

                        const escapes = {
                            n: "\n",
                            t: "\t",
                            r: "\r",
                            "\\": "\\",
                            "\"": "\"",
                            "'": "'"
                        };

                        value +=
                            escapes[escaped] ??
                            escaped;

                    } else {

                        value += line[i];

                    }

                    i++;
                }

                if (
                    i >= line.length
                ) {

                    throw new Error(
                        `SyntaxError: unterminated string at line ${lineNumber}`
                    );

                }

                i++;

                this.tokens.push(
                    new Token(
                        "STRING",
                        value,
                        lineNumber
                    )
                );

                continue;
            }


            // ------------------------------------------------
            // IDENTIFICADOR
            // ------------------------------------------------

            if (
                /[a-zA-Z_]/.test(char)
            ) {

                let identifier = "";

                while (
                    i < line.length &&
                    /[a-zA-Z0-9_]/.test(line[i])
                ) {

                    identifier += line[i];

                    i++;
                }

                this.tokens.push(
                    new Token(
                        "IDENTIFIER",
                        identifier,
                        lineNumber
                    )
                );

                continue;
            }


            // ------------------------------------------------
            // OPERADORES DE 2 CARACTERES
            // ------------------------------------------------

            const two =
                line.slice(i, i + 2);

            if (
                [
                    "==",
                    "!=",
                    "<=",
                    ">=",
                    "**",
                    "//"
                ].includes(two)
            ) {

                this.tokens.push(
                    new Token(
                        "OPERATOR",
                        two,
                        lineNumber
                    )
                );

                i += 2;

                continue;
            }


            // ------------------------------------------------
            // OPERADORES
            // ------------------------------------------------

            if (
                [
                    "+",
                    "-",
                    "*",
                    "/",
                    "%",
                    "=",
                    "<",
                    ">"
                ].includes(char)
            ) {

                this.tokens.push(
                    new Token(
                        "OPERATOR",
                        char,
                        lineNumber
                    )
                );

                i++;

                continue;
            }


            // ------------------------------------------------
            // SÍMBOLOS
            // ------------------------------------------------

            if (
                [
                    "(",
                    ")",
                    "[",
                    "]",
                    ":",
                    ","
                ].includes(char)
            ) {

                this.tokens.push(
                    new Token(
                        "SYMBOL",
                        char,
                        lineNumber
                    )
                );

                i++;

                continue;
            }


            throw new Error(
                `SyntaxError: unknown character '${char}' at line ${lineNumber}`
            );
        }
    }
}


// ============================================================
// PARSER
// ============================================================

class Parser {

    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
    }


    current() {
        return this.tokens[this.position];
    }


    peek(offset = 1) {
        return this.tokens[this.position + offset];
    }


    next() {
        this.position++;
    }


    check(type, value = null) {

        const token = this.current();

        if (!token) {
            return false;
        }

        if (token.type !== type) {
            return false;
        }

        if (
            value !== null &&
            token.value !== value
        ) {
            return false;
        }

        return true;
    }


    expect(type, value = null) {

        if (!this.check(type, value)) {

            const token = this.current();

            throw new Error(
                `SyntaxError at line ${token?.line ?? "?"}: ` +
                `expected ${type} ${value ?? ""}, ` +
                `got ${token?.type} ${token?.value ?? ""}`
            );
        }

        const token = this.current();

        this.next();

        return token;
    }


    skipNewlines() {

        while (
            this.check("NEWLINE")
        ) {
            this.next();
        }
    }


    parse() {

        const body = [];

        this.skipNewlines();

        while (
            !this.check("EOF")
        ) {

            body.push(
                this.statement()
            );

            this.skipNewlines();
        }

        return {
            type: "Program",
            body
        };
    }


    // ========================================================
    // BLOCK
    // ========================================================

    parseBlock() {

        this.expect("NEWLINE");

        this.expect("INDENT");

        const body = [];

        this.skipNewlines();

        while (
            !this.check("DEDENT") &&
            !this.check("EOF")
        ) {

            body.push(
                this.statement()
            );

            this.skipNewlines();
        }

        this.expect("DEDENT");

        return body;
    }


    // ========================================================
    // STATEMENT
    // ========================================================

    statement() {

        if (
            this.check(
                "IDENTIFIER",
                "for"
            )
        ) {
            return this.parseFor();
        }


        if (
            this.check(
                "IDENTIFIER",
                "def"
            )
        ) {
            return this.parseFunction();
        }


        if (
            this.check(
                "IDENTIFIER",
                "return"
            )
        ) {
            return this.parseReturn();
        }


        if (
            this.check(
                "IDENTIFIER",
                "if"
            )
        ) {
            return this.parseIf();
        }


        if (
            this.check(
                "IDENTIFIER",
                "else"
            )
        ) {
            return this.parseElse();
        }


        if (
            this.check(
                "IDENTIFIER",
                "while"
            )
        ) {
            return this.parseWhile();
        }


        // Assignment

        if (
            this.check("IDENTIFIER") &&
            this.peek()?.type === "OPERATOR" &&
            this.peek()?.value === "="
        ) {

            return this.parseAssignment();
        }


        // Expression

        return {
            type: "ExpressionStatement",
            expression: this.expression()
        };
    }


    // ========================================================
    // ASSIGNMENT
    // ========================================================

    parseAssignment() {

        const name =
            this.expect(
                "IDENTIFIER"
            ).value;

        this.expect(
            "OPERATOR",
            "="
        );

        const value =
            this.expression();

        return {
            type: "Assignment",
            name,
            value
        };
    }


    // ========================================================
    // FOR
    // ========================================================

    parseFor() {

        this.expect(
            "IDENTIFIER",
            "for"
        );

        const variable =
            this.expect(
                "IDENTIFIER"
            ).value;

        this.expect(
            "IDENTIFIER",
            "in"
        );

        const iterable =
            this.expression();

        this.expect(
            "SYMBOL",
            ":"
        );

        const body =
            this.parseBlock();

        return {
            type: "For",
            variable,
            iterable,
            body
        };
    }


    // ========================================================
    // FUNCTION
    // ========================================================

    parseFunction() {

        this.expect(
            "IDENTIFIER",
            "def"
        );

        const name =
            this.expect(
                "IDENTIFIER"
            ).value;

        this.expect(
            "SYMBOL",
            "("
        );

        const parameters = [];

        if (
            !this.check(
                "SYMBOL",
                ")"
            )
        ) {

            while (true) {

                parameters.push(
                    this.expect(
                        "IDENTIFIER"
                    ).value
                );

                if (
                    this.check(
                        "SYMBOL",
                        ","
                    )
                ) {

                    this.next();

                } else {

                    break;
                }
            }
        }

        this.expect(
            "SYMBOL",
            ")"
        );

        this.expect(
            "SYMBOL",
            ":"
        );

        const body =
            this.parseBlock();

        return {
            type: "FunctionDefinition",
            name,
            parameters,
            body
        };
    }


    // ========================================================
    // RETURN
    // ========================================================

    parseReturn() {

        this.expect(
            "IDENTIFIER",
            "return"
        );

        return {
            type: "Return",
            value: this.expression()
        };
    }


    // ========================================================
    // IF
    // ========================================================

    parseIf() {

        this.expect(
            "IDENTIFIER",
            "if"
        );

        const condition =
            this.expression();

        this.expect(
            "SYMBOL",
            ":"
        );

        const body =
            this.parseBlock();

        return {
            type: "If",
            condition,
            body
        };
    }


    // ========================================================
    // ELSE
    // ========================================================

    parseElse() {

        this.expect(
            "IDENTIFIER",
            "else"
        );

        this.expect(
            "SYMBOL",
            ":"
        );

        const body =
            this.parseBlock();

        return {
            type: "Else",
            body
        };
    }


    // ========================================================
    // WHILE
    // ========================================================

    parseWhile() {

        this.expect(
            "IDENTIFIER",
            "while"
        );

        const condition =
            this.expression();

        this.expect(
            "SYMBOL",
            ":"
        );

        const body =
            this.parseBlock();

        return {
            type: "While",
            condition,
            body
        };
    }


    // ========================================================
    // EXPRESSIONS
    // ========================================================

    expression() {
        return this.comparison();
    }


    comparison() {

        let left =
            this.addition();

        while (
            [
                "==",
                "!=",
                "<",
                ">",
                "<=",
                ">="
            ].includes(
                this.current().value
            )
        ) {

            const operator =
                this.current().value;

            this.next();

            const right =
                this.addition();

            left = {
                type: "BinaryExpression",
                operator,
                left,
                right
            };
        }

        return left;
    }


    addition() {

        let left =
            this.multiplication();

        while (
            this.check(
                "OPERATOR",
                "+"
            ) ||
            this.check(
                "OPERATOR",
                "-"
            )
        ) {

            const operator =
                this.current().value;

            this.next();

            const right =
                this.multiplication();

            left = {
                type: "BinaryExpression",
                operator,
                left,
                right
            };
        }

        return left;
    }


    multiplication() {

        let left =
            this.power();

        while (
            this.check(
                "OPERATOR",
                "*"
            ) ||
            this.check(
                "OPERATOR",
                "/"
            ) ||
            this.check(
                "OPERATOR",
                "//"
            ) ||
            this.check(
                "OPERATOR",
                "%"
            )
        ) {

            const operator =
                this.current().value;

            this.next();

            const right =
                this.power();

            left = {
                type: "BinaryExpression",
                operator,
                left,
                right
            };
        }

        return left;
    }


    power() {

        let left =
            this.unary();

        if (
            this.check(
                "OPERATOR",
                "**"
            )
        ) {

            this.next();

            const right =
                this.power();

            left = {
                type: "BinaryExpression",
                operator: "**",
                left,
                right
            };
        }

        return left;
    }


    unary() {

        if (
            this.check(
                "OPERATOR",
                "-"
            )
        ) {

            this.next();

            return {
                type: "UnaryExpression",
                operator: "-",
                value: this.unary()
            };
        }


        if (
            this.check(
                "OPERATOR",
                "+"
            )
        ) {

            this.next();

            return {
                type: "UnaryExpression",
                operator: "+",
                value: this.unary()
            };
        }


        return this.primary();
    }


    // ========================================================
    // PRIMARY
    // ========================================================

    primary() {

        const token =
            this.current();


        // NUMBER

        if (
            this.check("NUMBER")
        ) {

            this.next();

            return {
                type: "NumberLiteral",
                value: token.value
            };
        }


        // STRING

        if (
            this.check("STRING")
        ) {

            this.next();

            return {
                type: "StringLiteral",
                value: token.value
            };
        }


        // TRUE

        if (
            this.check(
                "IDENTIFIER",
                "True"
            )
        ) {

            this.next();

            return {
                type: "BooleanLiteral",
                value: true
            };
        }


        // FALSE

        if (
            this.check(
                "IDENTIFIER",
                "False"
            )
        ) {

            this.next();

            return {
                type: "BooleanLiteral",
                value: false
            };
        }


        // NONE

        if (
            this.check(
                "IDENTIFIER",
                "None"
            )
        ) {

            this.next();

            return {
                type: "NoneLiteral"
            };
        }


        // IDENTIFIER

        if (
            this.check("IDENTIFIER")
        ) {

            const name =
                token.value;

            this.next();


            // Function call

            if (
                this.check(
                    "SYMBOL",
                    "("
                )
            ) {

                this.next();

                const args = [];

                if (
                    !this.check(
                        "SYMBOL",
                        ")"
                    )
                ) {

                    while (true) {

                        args.push(
                            this.expression()
                        );

                        if (
                            this.check(
                                "SYMBOL",
                                ","
                            )
                        ) {

                            this.next();

                        } else {

                            break;
                        }
                    }
                }

                this.expect(
                    "SYMBOL",
                    ")"
                );

                return {
                    type: "CallExpression",
                    name,
                    arguments: args
                };
            }


            return {
                type: "Identifier",
                name
            };
        }


        // LIST

        if (
            this.check(
                "SYMBOL",
                "["
            )
        ) {

            this.next();

            const elements = [];

            if (
                !this.check(
                    "SYMBOL",
                    "]"
                )
            ) {

                while (true) {

                    elements.push(
                        this.expression()
                    );

                    if (
                        this.check(
                            "SYMBOL",
                            ","
                        )
                    ) {

                        this.next();

                    } else {

                        break;
                    }
                }
            }

            this.expect(
                "SYMBOL",
                "]"
            );

            return {
                type: "ListLiteral",
                elements
            };
        }


        // PARENTHESES

        if (
            this.check(
                "SYMBOL",
                "("
            )
        ) {

            this.next();

            const expression =
                this.expression();

            this.expect(
                "SYMBOL",
                ")"
            );

            return expression;
        }


        throw new Error(
            `SyntaxError at line ${token?.line ?? "?"}`
        );
    }
}


// ============================================================
// RETURN SIGNAL
// ============================================================

class ReturnSignal {

    constructor(value) {
        this.value = value;
    }
}


// ============================================================
// PYTHON FUNCTION
// ============================================================

class PythonFunction {

    constructor(
        parameters,
        body,
        closure
    ) {

        this.parameters = parameters;
        this.body = body;
        this.closure = closure;
    }
}


// ============================================================
// ENVIRONMENT
// ============================================================

class Environment {

    constructor(parent = null) {

        this.values =
            Object.create(null);

        this.parent = parent;
    }


    define(name, value) {

        this.values[name] = value;
    }


    get(name) {

        if (
            Object.prototype.hasOwnProperty.call(
                this.values,
                name
            )
        ) {

            return this.values[name];
        }

        if (this.parent) {
            return this.parent.get(name);
        }

        throw new Error(
            `NameError: name '${name}' is not defined`
        );
    }


    set(name, value) {

        if (
            Object.prototype.hasOwnProperty.call(
                this.values,
                name
            )
        ) {

            this.values[name] = value;
            return;
        }

        if (this.parent) {

            try {

                this.parent.set(
                    name,
                    value
                );

                return;

            } catch {}
        }

        this.values[name] = value;
    }
}


// ============================================================
// INTERPRETER
// ============================================================

class Interpreter {

    constructor() {

        this.output = [];

        this.global =
            new Environment();

        this.environment =
            this.global;

        this.loopCount = 0;

        this.maxLoops = 100000;

        this.installBuiltins();
    }


    // ========================================================
    // BUILTINS
    // ========================================================

    installBuiltins() {

        this.global.define(
            "range",
            {
                builtin: "range"
            }
        );


        this.global.define(
            "len",
            {
                builtin: "len"
            }
        );


        this.global.define(
            "str",
            {
                builtin: "str"
            }
        );


        this.global.define(
            "int",
            {
                builtin: "int"
            }
        );


        this.global.define(
            "float",
            {
                builtin: "float"
            }
        );
    }


    // ========================================================
    // RUN
    // ========================================================

    run(ast) {

        this.executeBlock(
            ast.body
        );

        return this.output;
    }


    // ========================================================
    // EXECUTE BLOCK
    // ========================================================

    executeBlock(body) {

        let result = null;

        for (
            const statement of body
        ) {

            result =
                this.execute(statement);

            if (
                result instanceof ReturnSignal
            ) {

                return result;
            }
        }

        return result;
    }


    // ========================================================
    // EXECUTE
    // ========================================================

    execute(node) {

        switch (node.type) {


            // ----------------------------------------------
            // ASSIGNMENT
            // ----------------------------------------------

            case "Assignment": {

                const value =
                    this.evaluate(
                        node.value
                    );

                this.environment.set(
                    node.name,
                    value
                );

                return null;
            }


            // ----------------------------------------------
            // FUNCTION
            // ----------------------------------------------

            case "FunctionDefinition": {

                const fn =
                    new PythonFunction(
                        node.parameters,
                        node.body,
                        this.environment
                    );

                this.environment.define(
                    node.name,
                    fn
                );

                return null;
            }


            // ----------------------------------------------
            // RETURN
            // ----------------------------------------------

            case "Return": {

                return new ReturnSignal(
                    this.evaluate(
                        node.value
                    )
                );
            }


            // ----------------------------------------------
            // FOR
            // ----------------------------------------------

            case "For": {

                const iterable =
                    this.evaluate(
                        node.iterable
                    );

                if (
                    !Array.isArray(iterable) &&
                    typeof iterable !== "string"
                ) {

                    throw new Error(
                        "TypeError: object is not iterable"
                    );
                }


                for (
                    const value of iterable
                ) {

                    this.loopCount++;

                    this.checkLoopLimit();

                    this.environment.set(
                        node.variable,
                        value
                    );


                    const result =
                        this.executeBlock(
                            node.body
                        );


                    if (
                        result instanceof ReturnSignal
                    ) {

                        return result;
                    }
                }

                return null;
            }


            // ----------------------------------------------
            // IF
            // ----------------------------------------------

            case "If": {

                if (
                    this.isTruthy(
                        this.evaluate(
                            node.condition
                        )
                    )
                ) {

                    return this.executeBlock(
                        node.body
                    );
                }

                return null;
            }


            // ----------------------------------------------
            // ELSE
            // ----------------------------------------------

            case "Else": {

                return this.executeBlock(
                    node.body
                );
            }


            // ----------------------------------------------
            // WHILE
            // ----------------------------------------------

            case "While": {

                while (
                    this.isTruthy(
                        this.evaluate(
                            node.condition
                        )
                    )
                ) {

                    this.loopCount++;

                    this.checkLoopLimit();


                    const result =
                        this.executeBlock(
                            node.body
                        );


                    if (
                        result instanceof ReturnSignal
                    ) {

                        return result;
                    }
                }

                return null;
            }


            // ----------------------------------------------
            // EXPRESSION
            // ----------------------------------------------

            case "ExpressionStatement": {

                this.evaluate(
                    node.expression
                );

                return null;
            }


            default:

                throw new Error(
                    `Unknown statement: ${node.type}`
                );
        }
    }


    // ========================================================
    // EVALUATE
    // ========================================================

    evaluate(node) {

        switch (node.type) {


            // NUMBER

            case "NumberLiteral":
                return node.value;


            // STRING

            case "StringLiteral":
                return node.value;


            // BOOLEAN

            case "BooleanLiteral":
                return node.value;


            // NONE

            case "NoneLiteral":
                return null;


            // IDENTIFIER

            case "Identifier":

                return this.environment.get(
                    node.name
                );


            // LIST

            case "ListLiteral":

                return node.elements.map(
                    element =>
                        this.evaluate(element)
                );


            // UNARY

            case "UnaryExpression": {

                const value =
                    this.evaluate(
                        node.value
                    );

                if (
                    node.operator === "-"
                ) {

                    return -value;
                }

                if (
                    node.operator === "+"
                ) {

                    return +value;
                }

                throw new Error(
                    `Unknown unary operator ${node.operator}`
                );
            }


            // BINARY

            case "BinaryExpression": {

                const left =
                    this.evaluate(
                        node.left
                    );

                const right =
                    this.evaluate(
                        node.right
                    );

                return this.binary(
                    node.operator,
                    left,
                    right
                );
            }


            // CALL

            case "CallExpression":

                return this.call(node);


            default:

                throw new Error(
                    `Unknown expression: ${node.type}`
                );
        }
    }


    // ========================================================
    // BINARY OPERATORS
    // ========================================================

    binary(operator, a, b) {

        switch (operator) {

            case "+":
                return a + b;

            case "-":
                return a - b;

            case "*":
                return a * b;

            case "/":

                if (b === 0) {
                    throw new Error(
                        "ZeroDivisionError: division by zero"
                    );
                }

                return a / b;

            case "//":

                if (b === 0) {
                    throw new Error(
                        "ZeroDivisionError: integer division by zero"
                    );
                }

                return Math.floor(a / b);

            case "%":

                if (b === 0) {
                    throw new Error(
                        "ZeroDivisionError: modulo by zero"
                    );
                }

                return a % b;

            case "**":
                return a ** b;

            case "==":
                return a === b;

            case "!=":
                return a !== b;

            case "<":
                return a < b;

            case ">":
                return a > b;

            case "<=":
                return a <= b;

            case ">=":
                return a >= b;

            default:

                throw new Error(
                    `Unknown operator: ${operator}`
                );
        }
    }


    // ========================================================
    // FUNCTION CALL
    // ========================================================

    call(node) {

        const fn =
            this.environment.get(
                node.name
            );


        const args =
            node.arguments.map(
                argument =>
                    this.evaluate(argument)
            );


        // Builtin

        if (
            fn &&
            fn.builtin
        ) {

            return this.callBuiltin(
                fn.builtin,
                args
            );
        }


        // Python function

        if (
            fn instanceof PythonFunction
        ) {

            if (
                args.length !==
                fn.parameters.length
            ) {

                throw new Error(
                    `TypeError: ${node.name}() ` +
                    `expected ${fn.parameters.length} ` +
                    `arguments, got ${args.length}`
                );
            }


            const local =
                new Environment(
                    fn.closure
                );


            for (
                let i = 0;
                i < fn.parameters.length;
                i++
            ) {

                local.define(
                    fn.parameters[i],
                    args[i]
                );
            }


            const previous =
                this.environment;


            this.environment =
                local;


            try {

                const result =
                    this.executeBlock(
                        fn.body
                    );


                if (
                    result instanceof ReturnSignal
                ) {

                    return result.value;
                }


                return null;

            } finally {

                this.environment =
                    previous;
            }
        }


        throw new Error(
            `TypeError: '${node.name}' object is not callable`
        );
    }


    // ========================================================
    // BUILTIN FUNCTIONS
    // ========================================================

    callBuiltin(name, args) {

        switch (name) {


            case "range": {

                if (
                    args.length < 1 ||
                    args.length > 3
                ) {

                    throw new Error(
                        "TypeError: range expected 1 to 3 arguments"
                    );
                }


                let start;
                let stop;
                let step;


                if (
                    args.length === 1
                ) {

                    start = 0;
                    stop = args[0];
                    step = 1;

                } else if (
                    args.length === 2
                ) {

                    start = args[0];
                    stop = args[1];
                    step = 1;

                } else {

                    start = args[0];
                    stop = args[1];
                    step = args[2];
                }


                if (step === 0) {

                    throw new Error(
                        "ValueError: range() arg 3 must not be zero"
                    );
                }


                const result = [];


                if (step > 0) {

                    for (
                        let i = start;
                        i < stop;
                        i += step
                    ) {

                        result.push(i);
                    }

                } else {

                    for (
                        let i = start;
                        i > stop;
                        i += step
                    ) {

                        result.push(i);
                    }
                }


                return result;
            }


            case "len":

                if (
                    args.length !== 1
                ) {

                    throw new Error(
                        "TypeError: len() expected 1 argument"
                    );
                }

                return args[0].length;


            case "str":

                if (
                    args.length !== 1
                ) {

                    throw new Error(
                        "TypeError: str() expected 1 argument"
                    );
                }

                return this.toPythonString(
                    args[0]
                );


            case "int":

                if (
                    args.length !== 1
                ) {

                    throw new Error(
                        "TypeError: int() expected 1 argument"
                    );
                }

                return Math.trunc(
                    Number(args[0])
                );


            case "float":

                if (
                    args.length !== 1
                ) {

                    throw new Error(
                        "TypeError: float() expected 1 argument"
                    );
                }

                return Number(args[0]);


            default:

                throw new Error(
                    `Unknown builtin: ${name}`
                );
        }
    }


    // ========================================================
    // TRUTHINESS
    // ========================================================

    isTruthy(value) {

        if (
            value === null ||
            value === false ||
            value === 0 ||
            value === ""
        ) {

            return false;
        }

        return true;
    }


    // ========================================================
    // STRING
    // ========================================================

    toPythonString(value) {

        if (
            value === true
        ) {
            return "True";
        }

        if (
            value === false
        ) {
            return "False";
        }

        if (
            value === null
        ) {
            return "None";
        }

        if (
            Array.isArray(value)
        ) {

            return "[" +
                value
                    .map(v =>
                        this.toPythonString(v)
                    )
                    .join(", ") +
                "]";
        }

        return String(value);
    }


    // ========================================================
    // LOOP LIMIT
    // ========================================================

    checkLoopLimit() {

        if (
            this.loopCount >
            this.maxLoops
        ) {

            throw new Error(
                "RuntimeError: maximum loop limit reached"
            );
        }
    }
}


// ============================================================
// MULTIRUNNER
// ============================================================

class MultiRunner {

    runPython(code) {

        const tokenizer =
            new Tokenizer(code);

        const tokens =
            tokenizer.tokenize();


        const parser =
            new Parser(tokens);

        const ast =
            parser.parse();


        const interpreter =
            new Interpreter();

        const output =
            interpreter.run(ast);


        return output.join("\n");
    }
}


// ============================================================
// COMMAND LINE
// ============================================================

function main() {

    const filename =
        process.argv[2];


    if (!filename) {

        console.error(
            "Usage: node python.js <file.py>"
        );

        process.exit(1);
    }


    if (
        !filename.endsWith(".py")
    ) {

        console.error(
            "Error: file must have a .py extension"
        );

        process.exit(1);
    }


    if (
        !fs.existsSync(filename)
    ) {

        console.error(
            `Error: file not found: ${filename}`
        );

        process.exit(1);
    }


    const code =
        fs.readFileSync(
            filename,
            "utf8"
        );


    const runner =
        new MultiRunner();


    try {

        const result =
            runner.runPython(code);


        if (result) {
            console.log(result);
        }

    } catch (error) {

        console.error(
            error.message
        );

        process.exit(1);
    }
}


// ============================================================
// START
// ============================================================

if (
    require.main === module
) {

    main();
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    Token,
    Tokenizer,
    Parser,
    Environment,
    Interpreter,
    MultiRunner
};
