class Token {
    constructor(type, value = null) {
        this.type = type;
        this.value = value;
    }
}


// ============================================
// TOKENIZER
// ============================================

class Tokenizer {

    constructor(code) {
        this.code = code;
        this.tokens = [];
    }


    tokenize() {

        const lines = this.code.split(/\r?\n/);

        const indents = [0];


        for (let line of lines) {

            // Contar espacios

            let spaces = 0;

            while (
                spaces < line.length &&
                line[spaces] === " "
            ) {
                spaces++;
            }


            const text =
                line.substring(spaces);


            // Línea vacía

            if (
                text.trim() === "" ||
                text.trim().startsWith("#")
            ) {
                continue;
            }


            // INDENT

            if (
                spaces > indents[indents.length - 1]
            ) {

                indents.push(spaces);

                this.tokens.push(
                    new Token("INDENT")
                );

            }


            // DEDENT

            while (
                spaces < indents[indents.length - 1]
            ) {

                indents.pop();

                this.tokens.push(
                    new Token("DEDENT")
                );

            }


            this.tokenizeLine(text);


            this.tokens.push(
                new Token("NEWLINE")
            );

        }


        // DEDENT final

        while (
            indents.length > 1
        ) {

            indents.pop();

            this.tokens.push(
                new Token("DEDENT")
            );

        }


        this.tokens.push(
            new Token("EOF")
        );


        return this.tokens;

    }


    tokenizeLine(line) {

        let position = 0;


        while (
            position < line.length
        ) {

            const char =
                line[position];


            // Espacios

            if (
                char === " " ||
                char === "\t"
            ) {

                position++;
                continue;

            }


            // Comentario

            if (
                char === "#"
            ) {

                break;

            }


            // Número

            if (
                /[0-9]/.test(char)
            ) {

                let number = "";


                while (
                    position < line.length &&
                    /[0-9.]/.test(
                        line[position]
                    )
                ) {

                    number +=
                        line[position];

                    position++;

                }


                this.tokens.push(
                    new Token(
                        "NUMBER",
                        Number(number)
                    )
                );

                continue;

            }


            // String

            if (
                char === '"' ||
                char === "'"
            ) {

                const quote =
                    char;


                position++;


                let string = "";


                while (
                    position < line.length &&
                    line[position] !== quote
                ) {

                    string +=
                        line[position];

                    position++;

                }


                if (
                    line[position] !== quote
                ) {

                    throw new Error(
                        "Unterminated string"
                    );

                }


                position++;


                this.tokens.push(
                    new Token(
                        "STRING",
                        string
                    )
                );

                continue;

            }


            // Identificador

            if (
                /[a-zA-Z_]/.test(char)
            ) {

                let identifier = "";


                while (
                    position < line.length &&
                    /[a-zA-Z0-9_]/.test(
                        line[position]
                    )
                ) {

                    identifier +=
                        line[position];

                    position++;

                }


                this.tokens.push(
                    new Token(
                        "IDENTIFIER",
                        identifier
                    )
                );

                continue;

            }


            // Operadores dobles

            const two =
                line.substring(
                    position,
                    position + 2
                );


            if (
                [
                    "==",
                    "!=",
                    "<=",
                    ">=",
                    "**"
                ].includes(two)
            ) {

                this.tokens.push(
                    new Token(
                        "OPERATOR",
                        two
                    )
                );

                position += 2;

                continue;

            }


            // Operadores

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
                        char
                    )
                );

                position++;

                continue;

            }


            // Símbolos

            if (
                [
                    "(",
                    ")",
                    ":",
                    ","
                ].includes(char)
            ) {

                this.tokens.push(
                    new Token(
                        "SYMBOL",
                        char
                    )
                );

                position++;

                continue;

            }


            throw new Error(
                "Unknown character: " +
                char
            );

        }

    }

}


// ============================================
// PARSER
// ============================================

class Parser {

    constructor(tokens) {

        this.tokens = tokens;
        this.position = 0;

    }


    current() {

        return this.tokens[
            this.position
        ];

    }


    next() {

        this.position++;

    }


    check(type, value = null) {

        const token =
            this.current();


        if (
            token.type !== type
        ) {
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

        if (
            !this.check(type, value)
        ) {

            const token =
                this.current();


            throw new Error(
                "Expected " +
                type +
                " " +
                (value ?? "") +
                " but got " +
                token.type +
                " " +
                token.value
            );

        }


        const token =
            this.current();


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
            body: body
        };

    }


    // ========================================
    // BLOCK
    // ========================================

    parseBlock() {

        this.expect(
            "NEWLINE"
        );


        this.expect(
            "INDENT"
        );


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


        this.expect(
            "DEDENT"
        );


        return body;

    }


    // ========================================
    // STATEMENT
    // ========================================

    statement() {

        const token =
            this.current();


        // for

        if (
            this.check(
                "IDENTIFIER",
                "for"
            )
        ) {

            return this.parseFor();

        }


        // def

        if (
            this.check(
                "IDENTIFIER",
                "def"
            )
        ) {

            return this.parseFunction();

        }


        // return

        if (
            this.check(
                "IDENTIFIER",
                "return"
            )
        ) {

            return this.parseReturn();

        }


        // if

        if (
            this.check(
                "IDENTIFIER",
                "if"
            )
        ) {

            return this.parseIf();

        }


        // while

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
            this.tokens[
                this.position + 1
            ]?.type === "OPERATOR" &&
            this.tokens[
                this.position + 1
            ]?.value === "="
        ) {

            return this.parseAssignment();

        }


        // Expression

        const expression =
            this.expression();


        return {
            type: "ExpressionStatement",
            expression: expression
        };

    }


    // ========================================
    // FOR
    // ========================================

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

            variable: variable,

            iterable: iterable,

            body: body

        };

    }


    // ========================================
    // FUNCTION
    // ========================================

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

            name: name,

            parameters: parameters,

            body: body

        };

    }


    // ========================================
    // RETURN
    // ========================================

    parseReturn() {

        this.expect(
            "IDENTIFIER",
            "return"
        );


        return {

            type: "Return",

            value:
                this.expression()

        };

    }


    // ========================================
    // ASSIGNMENT
    // ========================================

    parseAssignment() {

        const name =
            this.expect(
                "IDENTIFIER"
            ).value;


        this.expect(
            "OPERATOR",
            "="
        );


        return {

            type: "Assignment",

            name: name,

            value:
                this.expression()

        };

    }


    // ========================================
    // IF
    // ========================================

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

            condition: condition,

            body: body

        };

    }


    // ========================================
    // WHILE
    // ========================================

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

            condition: condition,

            body: body

        };

    }


    // ========================================
    // EXPRESSIONS
    // ========================================

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

                type:
                    "BinaryExpression",

                operator:
                    operator,

                left:
                    left,

                right:
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

                type:
                    "BinaryExpression",

                operator:
                    operator,

                left:
                    left,

                right:
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
                "%"
            )
        ) {

            const operator =
                this.current().value;


            this.next();


            const right =
                this.power();


            left = {

                type:
                    "BinaryExpression",

                operator:
                    operator,

                left:
                    left,

                right:
                    right

            };

        }


        return left;

    }


    power() {

        let left =
            this.primary();


        while (
            this.check(
                "OPERATOR",
                "**"
            )
        ) {

            this.next();


            const right =
                this.primary();


            left = {

                type:
                    "BinaryExpression",

                operator:
                    "**",

                left:
                    left,

                right:
                    right

            };

        }


        return left;

    }


    // ========================================
    // PRIMARY
    // ========================================

    primary() {

        const token =
            this.current();


        // NUMBER

        if (
            this.check("NUMBER")
        ) {

            this.next();


            return {

                type:
                    "NumberLiteral",

                value:
                    token.value

            };

        }


        // STRING

        if (
            this.check("STRING")
        ) {

            this.next();


            return {

                type:
                    "StringLiteral",

                value:
                    token.value

            };

        }


        // True

        if (
            this.check(
                "IDENTIFIER",
                "True"
            )
        ) {

            this.next();


            return {

                type:
                    "BooleanLiteral",

                value: true

            };

        }


        // False

        if (
            this.check(
                "IDENTIFIER",
                "False"
            )
        ) {

            this.next();


            return {

                type:
                    "BooleanLiteral",

                value: false

            };

        }


        // None

        if (
            this.check(
                "IDENTIFIER",
                "None"
            )
        ) {

            this.next();


            return {

                type:
                    "NoneLiteral"

            };

        }


        // IDENTIFIER / FUNCTION CALL

        if (
            this.check(
                "IDENTIFIER"
            )
        ) {

            const name =
                token.value;


            this.next();


            // FUNCTION CALL

            if (
                this.check(
                    "SYMBOL",
                    "("
                )
            ) {

                this.next();


                const arguments_ = [];


                if (
                    !this.check(
                        "SYMBOL",
                        ")"
                    )
                ) {

                    while (true) {

                        arguments_.push(
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

                    type:
                        "CallExpression",

                    name: name,

                    arguments:
                        arguments_

                };

            }


            return {

                type:
                    "Identifier",

                name: name

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
            "Unexpected token: " +
            token.type +
            " " +
            token.value
        );

    }

}


// ============================================
// RETURN SIGNAL
// ============================================

class ReturnSignal {

    constructor(value) {

        this.value = value;

    }

}


// ============================================
// INTERPRETER
// ============================================

class Interpreter {

    constructor() {

        this.global =
            Object.create(null);


        this.environment =
            this.global;


        this.output = [];


        this.maxLoops =
            100000;

    }


    run(ast) {

        for (
            const statement
            of ast.body
        ) {

            this.execute(
                statement
            );

        }


        return this.output;

    }


    executeBlock(body) {

        for (
            const statement
            of body
        ) {

            const result =
                this.execute(
                    statement
                );


            if (
                result instanceof ReturnSignal
            ) {

                return result;

            }

        }


        return null;

    }


    execute(node) {

        switch (
            node.type
        ) {


            // ================================
            // ASSIGNMENT
            // ================================

            case "Assignment":

                this.environment[
                    node.name
                ] =
                    this.evaluate(
                        node.value
                    );


                return null;


            // ================================
            // FUNCTION
            // ================================

            case "FunctionDefinition":

                this.environment[
                    node.name
                ] = {

                    type:
                        "PythonFunction",

                    parameters:
                        node.parameters,

                    body:
                        node.body,

                    closure:
                        this.environment

                };


                return null;


            // ================================
            // RETURN
            // ================================

            case "Return":

                return new ReturnSignal(
                    this.evaluate(
                        node.value
                    )
                );


            // ================================
            // FOR
            // ================================

            case "For":

                const iterable =
                    this.evaluate(
                        node.iterable
                    );


                if (
                    !Array.isArray(iterable)
                ) {

                    throw new Error(
                        "TypeError: object is not iterable"
                    );

                }


                for (
                    const value
                    of iterable
                ) {

                    this.environment[
                        node.variable
                    ] = value;


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


            // ================================
            // IF
            // ================================

            case "If":

                if (
                    this.evaluate(
                        node.condition
                    )
                ) {

                    return this.executeBlock(
                        node.body
                    );

                }


                return null;


            // ================================
            // WHILE
            // ================================

            case "While":

                let count = 0;


                while (
                    this.evaluate(
                        node.condition
                    )
                ) {

                    const result =
                        this.executeBlock(
                            node.body
                        );


                    if (
                        result instanceof ReturnSignal
                    ) {

                        return result;

                    }


                    count++;


                    if (
                        count >
                        this.maxLoops
                    ) {

                        throw new Error(
                            "Maximum loop limit reached"
                        );

                    }

                }


                return null;


            // ================================
            // EXPRESSION
            // ================================

            case "ExpressionStatement":

                this.evaluate(
                    node.expression
                );


                return null;


            default:

                throw new Error(
                    "Unknown statement: " +
                    node.type
                );

        }

    }


    evaluate(node) {

        switch (
            node.type
        ) {


            case "NumberLiteral":

                return node.value;


            case "StringLiteral":

                return node.value;


            case "BooleanLiteral":

                return node.value;


            case "NoneLiteral":

                return null;


            // ================================
            // IDENTIFIER
            // ================================

            case "Identifier":

                if (
                    node.name
                    in this.environment
                ) {

                    return this.environment[
                        node.name
                    ];

                }


                if (
                    node.name
                    in this.global
                ) {

                    return this.global[
                        node.name
                    ];

                }


                throw new Error(
                    "NameError: name '" +
                    node.name +
                    "' is not defined"
                );


            // ================================
            // BINARY
            // ================================

            case "BinaryExpression":

                return this.binary(

                    node.operator,

                    this.evaluate(
                        node.left
                    ),

                    this.evaluate(
                        node.right
                    )

                );


            // ================================
            // FUNCTION CALL
            // ================================

            case "CallExpression":

                return this.call(
                    node
                );


            default:

                throw new Error(
                    "Unknown expression: " +
                    node.type
                );

        }

    }


    // ========================================
    // CALL FUNCTION
    // ========================================

    call(node) {

        // range()

        if (
            node.name === "range"
        ) {

            const args =
                node.arguments.map(
                    argument =>
                        this.evaluate(
                            argument
                        )
                );


            return this.range(
                ...args
            );

        }


        // print()

        if (
            node.name === "print"
        ) {

            const values =
                node.arguments.map(
                    argument =>
                        this.evaluate(
                            argument
                        )
                );


            this.output.push(
                values.map(
                    value =>
                        this.toPythonString(
                            value
                        )
                ).join(" ")
            );


            return null;

        }


        // Buscar función

        let fn;


        if (
            node.name
            in this.environment
        ) {

            fn =
                this.environment[
                    node.name
                ];

        }

        else if (
            node.name
            in this.global
        ) {

            fn =
                this.global[
                    node.name
                ];

        }


        if (
            !fn
        ) {

            throw new Error(
                "NameError: function '" +
                node.name +
                "' is not defined"
            );

        }


        if (
            fn.type !==
            "PythonFunction"
        ) {

            throw new Error(
                "TypeError: '" +
                node.name +
                "' is not callable"
            );

        }


        const args =
            node.arguments.map(
                argument =>
                    this.evaluate(
                        argument
                    )
            );


        if (
            args.length !==
            fn.parameters.length
        ) {

            throw new Error(
                "TypeError: " +
                node.name +
                "() expected " +
                fn.parameters.length +
                " arguments"
            );

        }


        // Crear entorno local

        const previousEnvironment =
            this.environment;


        const local =
            Object.create(
                fn.closure
            );


        // Parámetros

        for (
            let i = 0;

            i < fn.parameters.length;

            i++
        ) {

            local[
                fn.parameters[i]
            ] =
                args[i];

        }


        this.environment =
            local;


        const result =
            this.executeBlock(
                fn.body
            );


        this.environment =
            previousEnvironment;


        if (
            result instanceof ReturnSignal
        ) {

            return result.value;

        }


        return null;

    }


    // ========================================
    // RANGE
    // ========================================

    range(...args) {

        let start;
        let stop;
        let step;


        if (
            args.length === 1
        ) {

            start = 0;
            stop = args[0];
            step = 1;

        }

        else if (
            args.length === 2
        ) {

            start = args[0];
            stop = args[1];
            step = 1;

        }

        else if (
            args.length === 3
        ) {

            start = args[0];
            stop = args[1];
            step = args[2];

        }

        else {

            throw new Error(
                "TypeError: range expected 1 to 3 arguments"
            );

        }


        const result = [];


        if (
            step === 0
        ) {

            throw new Error(
                "ValueError: range() arg 3 must not be zero"
            );

        }


        if (
            step > 0
        ) {

            for (
                let i = start;

                i < stop;

                i += step
            ) {

                result.push(i);

            }

        }

        else {

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


    // ========================================
    // BINARY OPERATORS
    // ========================================

    binary(operator, a, b) {

        switch (
            operator
        ) {

            case "+":
                return a + b;

            case "-":
                return a - b;

            case "*":
                return a * b;

            case "/":
                return a / b;

            case "%":
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
                    "Unknown operator: " +
                    operator
                );

        }

    }


    // ========================================
    // PYTHON STRING
    // ========================================

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


        return String(value);

    }

}


// ============================================
// MULTIRUNNER
// ============================================

class MultiRunner {

    runPython(code) {

        // TOKENIZE

        const tokenizer =
            new Tokenizer(code);


        const tokens =
            tokenizer.tokenize();


        // PARSE

        const parser =
            new Parser(tokens);


        const ast =
            parser.parse();


        // INTERPRET

        const interpreter =
            new Interpreter();


        const output =
            interpreter.run(ast);


        return output.join("\n");

    }

}


// ============================================
// EXPORT
// ============================================

if (
    typeof module !== "undefined"
) {

    module.exports = {

        Token,
        Tokenizer,
        Parser,
        Interpreter,
        MultiRunner

    };

}
