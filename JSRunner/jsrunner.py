import sys
import math


# ============================================================
# TOKEN
# ============================================================

class Token:

    def __init__(self, type_, value=None, line=1):
        self.type = type_
        self.value = value
        self.line = line

    def __repr__(self):
        return f"Token({self.type}, {self.value!r})"


# ============================================================
# TOKENIZER
# ============================================================

class Tokenizer:

    KEYWORDS = {
        "let",
        "const",
        "var",
        "if",
        "else",
        "while",
        "for",
        "function",
        "return",
        "true",
        "false",
        "null",
        "undefined"
    }

    TWO_CHAR_OPERATORS = {
        "==",
        "!=",
        "<=",
        ">=",
        "++",
        "--",
        "&&",
        "||",
        "**",
        "+=",
        "-=",
        "*=",
        "/="
    }

    ONE_CHAR_OPERATORS = {
        "+",
        "-",
        "*",
        "/",
        "%",
        "=",
        "<",
        ">",
        "!",
        "?"
    }

    SYMBOLS = {
        "(",
        ")",
        "{",
        "}",
        "[",
        "]",
        ";",
        ",",
        ".",
        ":"
    }

    def __init__(self, source):
        self.source = source
        self.tokens = []
        self.pos = 0
        self.line = 1

    def tokenize(self):

        while self.pos < len(self.source):

            c = self.source[self.pos]

            # ------------------------------------------------
            # ESPACIOS
            # ------------------------------------------------

            if c in " \t\r":

                self.pos += 1
                continue

            # ------------------------------------------------
            # NUEVA LÍNEA
            # ------------------------------------------------

            if c == "\n":

                self.line += 1
                self.pos += 1
                continue

            # ------------------------------------------------
            # COMENTARIO //
            # ------------------------------------------------

            if (
                c == "/"
                and self.peek() == "/"
            ):

                self.pos += 2

                while (
                    self.pos < len(self.source)
                    and self.source[self.pos] != "\n"
                ):
                    self.pos += 1

                continue

            # ------------------------------------------------
            # COMENTARIO /* */
            # ------------------------------------------------

            if (
                c == "/"
                and self.peek() == "*"
            ):

                self.pos += 2

                while self.pos < len(self.source):

                    if (
                        self.source[self.pos] == "*"
                        and self.peek() == "/"
                    ):

                        self.pos += 2
                        break

                    if self.source[self.pos] == "\n":
                        self.line += 1

                    self.pos += 1

                continue

            # ------------------------------------------------
            # STRING
            # ------------------------------------------------

            if c in ("'", '"', "`"):

                self.read_string(c)
                continue

            # ------------------------------------------------
            # NUMBER
            # ------------------------------------------------

            if c.isdigit() or (
                c == "."
                and self.peek()
                and self.peek().isdigit()
            ):

                self.read_number()
                continue

            # ------------------------------------------------
            # IDENTIFIER
            # ------------------------------------------------

            if (
                c.isalpha()
                or c == "_"
                or c == "$"
            ):

                self.read_identifier()
                continue

            # ------------------------------------------------
            # TWO CHARACTER OPERATOR
            # ------------------------------------------------

            two = c + self.peek()

            if two in self.TWO_CHAR_OPERATORS:

                self.tokens.append(
                    Token(
                        "OPERATOR",
                        two,
                        self.line
                    )
                )

                self.pos += 2
                continue

            # ------------------------------------------------
            # ONE CHARACTER OPERATOR
            # ------------------------------------------------

            if c in self.ONE_CHAR_OPERATORS:

                self.tokens.append(
                    Token(
                        "OPERATOR",
                        c,
                        self.line
                    )
                )

                self.pos += 1
                continue

            # ------------------------------------------------
            # SYMBOL
            # ------------------------------------------------

            if c in self.SYMBOLS:

                self.tokens.append(
                    Token(
                        "SYMBOL",
                        c,
                        self.line
                    )
                )

                self.pos += 1
                continue

            raise Exception(
                f"SyntaxError: unexpected character "
                f"'{c}' at line {self.line}"
            )

        self.tokens.append(
            Token("EOF", None, self.line)
        )

        return self.tokens

    def peek(self):

        if self.pos + 1 >= len(self.source):
            return ""

        return self.source[self.pos + 1]

    def read_string(self, quote):

        self.pos += 1

        result = ""

        while self.pos < len(self.source):

            c = self.source[self.pos]

            if c == quote:

                self.pos += 1

                self.tokens.append(
                    Token(
                        "STRING",
                        result,
                        self.line
                    )
                )

                return

            if c == "\\":

                self.pos += 1

                if self.pos >= len(self.source):
                    break

                escaped = self.source[self.pos]

                escapes = {
                    "n": "\n",
                    "t": "\t",
                    "r": "\r",
                    "\\": "\\",
                    '"': '"',
                    "'": "'",
                    "`": "`"
                }

                result += escapes.get(
                    escaped,
                    escaped
                )

                self.pos += 1
                continue

            if c == "\n":
                self.line += 1

            result += c
            self.pos += 1

        raise Exception(
            f"SyntaxError: unterminated string "
            f"at line {self.line}"
        )

    def read_number(self):

        start = self.pos
        dots = 0

        while self.pos < len(self.source):

            c = self.source[self.pos]

            if c == ".":
                dots += 1

                if dots > 1:
                    break

            elif not c.isdigit():
                break

            self.pos += 1

        text = self.source[start:self.pos]

        if "." in text:
            value = float(text)
        else:
            value = int(text)

        self.tokens.append(
            Token(
                "NUMBER",
                value,
                self.line
            )
        )

    def read_identifier(self):

        start = self.pos

        while self.pos < len(self.source):

            c = self.source[self.pos]

            if (
                c.isalnum()
                or c in "_$"
            ):
                self.pos += 1
            else:
                break

        value = self.source[start:self.pos]

        self.tokens.append(
            Token(
                "IDENTIFIER",
                value,
                self.line
            )
        )


# ============================================================
# AST
# ============================================================

class Node:
    pass


class Program(Node):

    def __init__(self, body):
        self.body = body


class Number(Node):

    def __init__(self, value):
        self.value = value


class String(Node):

    def __init__(self, value):
        self.value = value


class Boolean(Node):

    def __init__(self, value):
        self.value = value


class Null(Node):
    pass


class Identifier(Node):

    def __init__(self, name):
        self.name = name


class Binary(Node):

    def __init__(self, left, operator, right):
        self.left = left
        self.operator = operator
        self.right = right


class Unary(Node):

    def __init__(self, operator, value):
        self.operator = operator
        self.value = value


class Assignment(Node):

    def __init__(self, name, value):
        self.name = name
        self.value = value


class VariableDeclaration(Node):

    def __init__(self, kind, name, value):
        self.kind = kind
        self.name = name
        self.value = value


class ExpressionStatement(Node):

    def __init__(self, expression):
        self.expression = expression


class Call(Node):

    def __init__(self, callee, arguments):
        self.callee = callee
        self.arguments = arguments


class Member(Node):

    def __init__(self, object_, property_):
        self.object = object_
        self.property = property_


class If(Node):

    def __init__(self, condition, body, else_body=None):
        self.condition = condition
        self.body = body
        self.else_body = else_body


class While(Node):

    def __init__(self, condition, body):
        self.condition = condition
        self.body = body


class For(Node):

    def __init__(
        self,
        init,
        condition,
        update,
        body
    ):

        self.init = init
        self.condition = condition
        self.update = update
        self.body = body


class Function(Node):

    def __init__(
        self,
        name,
        parameters,
        body
    ):

        self.name = name
        self.parameters = parameters
        self.body = body


class Return(Node):

    def __init__(self, value):
        self.value = value


class Block(Node):

    def __init__(self, body):
        self.body = body


class Update(Node):

    def __init__(self, target, operator):
        self.target = target
        self.operator = operator


# ============================================================
# PARSER
# ============================================================

class Parser:

    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def current(self):
        return self.tokens[self.pos]

    def peek(self, n=1):

        index = self.pos + n

        if index >= len(self.tokens):
            return self.tokens[-1]

        return self.tokens[index]

    def advance(self):
        token = self.current()
        self.pos += 1
        return token

    def check(self, type_, value=None):

        token = self.current()

        if token.type != type_:
            return False

        if (
            value is not None
            and token.value != value
        ):
            return False

        return True

    def match(self, type_, value=None):

        if self.check(type_, value):

            self.advance()
            return True

        return False

    def expect(self, type_, value=None):

        if not self.check(type_, value):

            token = self.current()

            expected = (
                f"{type_} {value}"
                if value is not None
                else type_
            )

            raise Exception(
                f"SyntaxError at line {token.line}: "
                f"expected {expected}, "
                f"got {token.type} {token.value}"
            )

        return self.advance()

    def parse(self):

        body = []

        while not self.check("EOF"):

            body.append(
                self.statement()
            )

        return Program(body)

    # ========================================================
    # STATEMENTS
    # ========================================================

    def statement(self):

        if self.check(
            "IDENTIFIER",
            "let"
        ):

            return self.variable_declaration()

        if self.check(
            "IDENTIFIER",
            "const"
        ):

            return self.variable_declaration()

        if self.check(
            "IDENTIFIER",
            "var"
        ):

            return self.variable_declaration()

        if self.check(
            "IDENTIFIER",
            "if"
        ):

            return self.parse_if()

        if self.check(
            "IDENTIFIER",
            "while"
        ):

            return self.parse_while()

        if self.check(
            "IDENTIFIER",
            "for"
        ):

            return self.parse_for()

        if self.check(
            "IDENTIFIER",
            "function"
        ):

            return self.parse_function()

        if self.check(
            "IDENTIFIER",
            "return"
        ):

            return self.parse_return()

        if self.check(
            "SYMBOL",
            "{"
        ):

            return self.block()

        expression = self.expression()

        self.match(
            "SYMBOL",
            ";"
        )

        return ExpressionStatement(
            expression
        )

    # ========================================================
    # VARIABLE
    # ========================================================

    def variable_declaration(self):

        kind = self.advance().value

        name = self.expect(
            "IDENTIFIER"
        ).value

        value = None

        if self.match(
            "OPERATOR",
            "="
        ):

            value = self.expression()

        self.match(
            "SYMBOL",
            ";"
        )

        return VariableDeclaration(
            kind,
            name,
            value
        )

    # ========================================================
    # BLOCK
    # ========================================================

    def block(self):

        self.expect(
            "SYMBOL",
            "{"
        )

        body = []

        while not self.check(
            "SYMBOL",
            "}"
        ):

            if self.check("EOF"):

                raise Exception(
                    "SyntaxError: expected '}'"
                )

            body.append(
                self.statement()
            )

        self.expect(
            "SYMBOL",
            "}"
        )

        return Block(body)

    # ========================================================
    # IF
    # ========================================================

    def parse_if(self):

        self.expect(
            "IDENTIFIER",
            "if"
        )

        self.expect(
            "SYMBOL",
            "("
        )

        condition = self.expression()

        self.expect(
            "SYMBOL",
            ")"
        )

        body = self.statement()

        else_body = None

        if self.match(
            "IDENTIFIER",
            "else"
        ):

            else_body = self.statement()

        return If(
            condition,
            body,
            else_body
        )

    # ========================================================
    # WHILE
    # ========================================================

    def parse_while(self):

        self.expect(
            "IDENTIFIER",
            "while"
        )

        self.expect(
            "SYMBOL",
            "("
        )

        condition = self.expression()

        self.expect(
            "SYMBOL",
            ")"
        )

        body = self.statement()

        return While(
            condition,
            body
        )

    # ========================================================
    # FOR
    # ========================================================

    def parse_for(self):

        self.expect(
            "IDENTIFIER",
            "for"
        )

        self.expect(
            "SYMBOL",
            "("
        )

        init = None

        if not self.check(
            "SYMBOL",
            ";"
        ):

            if self.check(
                "IDENTIFIER",
                "let"
            ) or self.check(
                "IDENTIFIER",
                "const"
            ) or self.check(
                "IDENTIFIER",
                "var"
            ):

                init = self.variable_declaration()

            else:

                init = self.expression()

        self.expect(
            "SYMBOL",
            ";"
        )

        condition = None

        if not self.check(
            "SYMBOL",
            ";"
        ):

            condition = self.expression()

        self.expect(
            "SYMBOL",
            ";"
        )

        update = None

        if not self.check(
            "SYMBOL",
            ")"
        ):

            update = self.expression()

        self.expect(
            "SYMBOL",
            ")"
        )

        body = self.statement()

        return For(
            init,
            condition,
            update,
            body
        )

    # ========================================================
    # FUNCTION
    # ========================================================

    def parse_function(self):

        self.expect(
            "IDENTIFIER",
            "function"
        )

        name = self.expect(
            "IDENTIFIER"
        ).value

        self.expect(
            "SYMBOL",
            "("
        )

        parameters = []

        if not self.check(
            "SYMBOL",
            ")"
        ):

            while True:

                parameters.append(
                    self.expect(
                        "IDENTIFIER"
                    ).value
                )

                if not self.match(
                    "SYMBOL",
                    ","
                ):
                    break

        self.expect(
            "SYMBOL",
            ")"
        )

        body = self.block()

        return Function(
            name,
            parameters,
            body
        )

    # ========================================================
    # RETURN
    # ========================================================

    def parse_return(self):

        self.expect(
            "IDENTIFIER",
            "return"
        )

        if self.check(
            "SYMBOL",
            ";"
        ):

            self.advance()

            return Return(None)

        value = self.expression()

        self.match(
            "SYMBOL",
            ";"
        )

        return Return(value)

    # ========================================================
    # EXPRESSION
    # ========================================================

    def expression(self):

        return self.assignment()

    def assignment(self):

        left = self.logical_or()

        if self.match(
            "OPERATOR",
            "="
        ):

            right = self.assignment()

            return Assignment(
                left.name if isinstance(
                    left,
                    Identifier
                ) else left,
                right
            )

        return left

    def logical_or(self):

        left = self.logical_and()

        while self.match(
            "OPERATOR",
            "||"
        ):

            right = self.logical_and()

            left = Binary(
                left,
                "||",
                right
            )

        return left

    def logical_and(self):

        left = self.equality()

        while self.match(
            "OPERATOR",
            "&&"
        ):

            right = self.equality()

            left = Binary(
                left,
                "&&",
                right
            )

        return left

    def equality(self):

        left = self.comparison()

        while (
            self.check(
                "OPERATOR",
                "=="
            )
            or self.check(
                "OPERATOR",
                "!="
            )
        ):

            operator = self.advance().value

            right = self.comparison()

            left = Binary(
                left,
                operator,
                right
            )

        return left

    def comparison(self):

        left = self.term()

        while (
            self.check(
                "OPERATOR",
                "<"
            )
            or self.check(
                "OPERATOR",
                ">"
            )
            or self.check(
                "OPERATOR",
                "<="
            )
            or self.check(
                "OPERATOR",
                ">="
            )
        ):

            operator = self.advance().value

            right = self.term()

            left = Binary(
                left,
                operator,
                right
            )

        return left

    def term(self):

        left = self.factor()

        while (
            self.check(
                "OPERATOR",
                "+"
            )
            or self.check(
                "OPERATOR",
                "-"
            )
        ):

            operator = self.advance().value

            right = self.factor()

            left = Binary(
                left,
                operator,
                right
            )

        return left

    def factor(self):

        left = self.power()

        while (
            self.check(
                "OPERATOR",
                "*"
            )
            or self.check(
                "OPERATOR",
                "/"
            )
            or self.check(
                "OPERATOR",
                "%"
            )
        ):

            operator = self.advance().value

            right = self.power()

            left = Binary(
                left,
                operator,
                right
            )

        return left

    def power(self):

        left = self.unary()

        if self.match(
            "OPERATOR",
            "**"
        ):

            right = self.power()

            return Binary(
                left,
                "**",
                right
            )

        return left

    def unary(self):

        if self.match(
            "OPERATOR",
            "!"
        ):

            return Unary(
                "!",
                self.unary()
            )

        if self.match(
            "OPERATOR",
            "-"
        ):

            return Unary(
                "-",
                self.unary()
            )

        if self.match(
            "OPERATOR",
            "+"
        ):

            return Unary(
                "+",
                self.unary()
            )

        return self.postfix()

    # ========================================================
    # POSTFIX
    # ========================================================

    def postfix(self):

        expression = self.primary()

        while True:

            if self.match(
                "SYMBOL",
                "("
            ):

                arguments = []

                if not self.check(
                    "SYMBOL",
                    ")"
                ):

                    while True:

                        arguments.append(
                            self.expression()
                        )

                        if not self.match(
                            "SYMBOL",
                            ","
                        ):
                            break

                self.expect(
                    "SYMBOL",
                    ")"
                )

                expression = Call(
                    expression,
                    arguments
                )

                continue

            if self.match(
                "SYMBOL",
                "."
            ):

                property_ = self.expect(
                    "IDENTIFIER"
                ).value

                expression = Member(
                    expression,
                    property_
                )

                continue

            if self.match(
                "OPERATOR",
                "++"
            ):

                expression = Update(
                    expression,
                    "++"
                )

                continue

            if self.match(
                "OPERATOR",
                "--"
            ):

                expression = Update(
                    expression,
                    "--"
                )

                continue

            break

        return expression

    # ========================================================
    # PRIMARY
    # ========================================================

    def primary(self):

        token = self.current()

        if token.type == "NUMBER":

            self.advance()

            return Number(token.value)

        if token.type == "STRING":

            self.advance()

            return String(token.value)

        if (
            token.type == "IDENTIFIER"
            and token.value == "true"
        ):

            self.advance()

            return Boolean(True)

        if (
            token.type == "IDENTIFIER"
            and token.value == "false"
        ):

            self.advance()

            return Boolean(False)

        if (
            token.type == "IDENTIFIER"
            and token.value in (
                "null",
                "undefined"
            )
        ):

            self.advance()

            return Null()

        if token.type == "IDENTIFIER":

            self.advance()

            return Identifier(
                token.value
            )

        if self.match(
            "SYMBOL",
            "("
        ):

            expression = self.expression()

            self.expect(
                "SYMBOL",
                ")"
            )

            return expression

        raise Exception(
            f"SyntaxError at line {token.line}: "
            f"unexpected token {token.value!r}"
        )


# ============================================================
# ENVIRONMENT
# ============================================================

class Environment:

    def __init__(self, parent=None):

        self.values = {}
        self.parent = parent

    def define(self, name, value):

        self.values[name] = value

    def get(self, name):

        if name in self.values:
            return self.values[name]

        if self.parent:
            return self.parent.get(name)

        raise Exception(
            f"ReferenceError: {name} is not defined"
        )

    def set(self, name, value):

        if name in self.values:

            self.values[name] = value
            return value

        if self.parent:

            try:

                return self.parent.set(
                    name,
                    value
                )

            except Exception:
                pass

        self.values[name] = value

        return value


# ============================================================
# JS FUNCTION
# ============================================================

class JSFunction:

    def __init__(
        self,
        parameters,
        body,
        closure
    ):

        self.parameters = parameters
        self.body = body
        self.closure = closure


class ReturnSignal:

    def __init__(self, value):
        self.value = value


# ============================================================
# MATH OBJECT
# ============================================================

class MathObject:

    def __init__(self):

        self.values = {

            "PI": math.pi,

            "E": math.e,

            "LN2": math.log(2),

            "LN10": math.log(10),

            "SQRT2": math.sqrt(2)

        }

        self.functions = {

            "abs": abs,

            "floor": math.floor,

            "ceil": math.ceil,

            "sqrt": math.sqrt,

            "sin": math.sin,

            "cos": math.cos,

            "tan": math.tan,

            "log": math.log,

            "exp": math.exp

        }


# ============================================================
# INTERPRETER
# ============================================================

class Interpreter:

    def __init__(self):

        self.output = []

        self.global_env = Environment()

        self.environment = self.global_env

        self.install_builtins()

    # ========================================================
    # BUILTINS
    # ========================================================

    def install_builtins(self):

        self.global_env.define(
            "console",
            {
                "type": "console"
            }
        )

        self.global_env.define(
            "Math",
            MathObject()
        )

    # ========================================================
    # RUN
    # ========================================================

    def run(self, program):

        self.execute_block(
            program.body
        )

        return "\n".join(
            self.output
        )

    # ========================================================
    # EXECUTE BLOCK
    # ========================================================

    def execute_block(self, body):

        for statement in body:

            result = self.execute(
                statement
            )

            if isinstance(
                result,
                ReturnSignal
            ):

                return result

        return None

    # ========================================================
    # EXECUTE
    # ========================================================

    def execute(self, node):

        # ----------------------------------------------------
        # BLOCK
        # ----------------------------------------------------

        if isinstance(node, Block):

            return self.execute_block(
                node.body
            )

        # ----------------------------------------------------
        # VARIABLE
        # ----------------------------------------------------

        if isinstance(
            node,
            VariableDeclaration
        ):

            value = (
                self.evaluate(node.value)
                if node.value
                else None
            )

            self.environment.define(
                node.name,
                value
            )

            return None

        # ----------------------------------------------------
        # ASSIGNMENT
        # ----------------------------------------------------

        if isinstance(
            node,
            Assignment
        ):

            value = self.evaluate(
                node.value
            )

            self.assign(
                node.name,
                value
            )

            return None

        # ----------------------------------------------------
        # EXPRESSION
        # ----------------------------------------------------

        if isinstance(
            node,
            ExpressionStatement
        ):

            self.evaluate(
                node.expression
            )

            return None

        # ----------------------------------------------------
        # IF
        # ----------------------------------------------------

        if isinstance(
            node,
            If
        ):

            if self.truthy(
                self.evaluate(
                    node.condition
                )
            ):

                return self.execute(
                    node.body
                )

            if node.else_body:

                return self.execute(
                    node.else_body
                )

            return None

        # ----------------------------------------------------
        # WHILE
        # ----------------------------------------------------

        if isinstance(
            node,
            While
        ):

            count = 0

            while self.truthy(
                self.evaluate(
                    node.condition
                )
            ):

                count += 1

                if count > 100000:
                    raise Exception(
                        "RuntimeError: maximum loop limit"
                    )

                result = self.execute(
                    node.body
                )

                if isinstance(
                    result,
                    ReturnSignal
                ):

                    return result

            return None

        # ----------------------------------------------------
        # FOR
        # ----------------------------------------------------

        if isinstance(
            node,
            For
        ):

            if node.init:

                if isinstance(
                    node.init,
                    VariableDeclaration
                ):

                    self.execute(
                        node.init
                    )

                else:

                    self.evaluate(
                        node.init
                    )

            count = 0

            while (
                node.condition is None
                or self.truthy(
                    self.evaluate(
                        node.condition
                    )
                )
            ):

                count += 1

                if count > 100000:
                    raise Exception(
                        "RuntimeError: maximum loop limit"
                    )

                result = self.execute(
                    node.body
                )

                if isinstance(
                    result,
                    ReturnSignal
                ):

                    return result

                if node.update:

                    self.evaluate(
                        node.update
                    )

            return None

        # ----------------------------------------------------
        # FUNCTION
        # ----------------------------------------------------

        if isinstance(
            node,
            Function
        ):

            fn = JSFunction(
                node.parameters,
                node.body,
                self.environment
            )

            self.environment.define(
                node.name,
                fn
            )

            return None

        # ----------------------------------------------------
        # RETURN
        # ----------------------------------------------------

        if isinstance(
            node,
            Return
        ):

            value = (
                self.evaluate(node.value)
                if node.value
                else None
            )

            return ReturnSignal(
                value
            )

        # ----------------------------------------------------
        # UNKNOWN
        # ----------------------------------------------------

        raise Exception(
            f"Unknown AST node: {type(node).__name__}"
        )

    # ========================================================
    # EVALUATE
    # ========================================================

    def evaluate(self, node):

        # ----------------------------------------------------
        # LITERALS
        # ----------------------------------------------------

        if isinstance(
            node,
            Number
        ):

            return node.value

        if isinstance(
            node,
            String
        ):

            return node.value

        if isinstance(
            node,
            Boolean
        ):

            return node.value

        if isinstance(
            node,
            Null
        ):

            return None

        # ----------------------------------------------------
        # IDENTIFIER
        # ----------------------------------------------------

        if isinstance(
            node,
            Identifier
        ):

            return self.environment.get(
                node.name
            )

        # ----------------------------------------------------
        # BINARY
        # ----------------------------------------------------

        if isinstance(
            node,
            Binary
        ):

            if node.operator == "&&":

                left = self.evaluate(
                    node.left
                )

                if not self.truthy(left):
                    return left

                return self.evaluate(
                    node.right
                )

            if node.operator == "||":

                left = self.evaluate(
                    node.left
                )

                if self.truthy(left):
                    return left

                return self.evaluate(
                    node.right
                )

            left = self.evaluate(
                node.left
            )

            right = self.evaluate(
                node.right
            )

            return self.binary(
                node.operator,
                left,
                right
            )

        # ----------------------------------------------------
        # UNARY
        # ----------------------------------------------------

        if isinstance(
            node,
            Unary
        ):

            value = self.evaluate(
                node.value
            )

            if node.operator == "!":
                return not self.truthy(value)

            if node.operator == "-":
                return -value

            if node.operator == "+":
                return +value

        # ----------------------------------------------------
        # ASSIGNMENT
        # ----------------------------------------------------

        if isinstance(
            node,
            Assignment
        ):

            value = self.evaluate(
                node.value
            )

            self.assign(
                node.name,
                value
            )

            return value

        # ----------------------------------------------------
        # MEMBER
        # ----------------------------------------------------

        if isinstance(
            node,
            Member
        ):

            object_ = self.evaluate(
                node.object
            )

            return self.get_member(
                object_,
                node.property
            )

        # ----------------------------------------------------
        # CALL
        # ----------------------------------------------------

        if isinstance(
            node,
            Call
        ):

            return self.call(
                node
            )

        # ----------------------------------------------------
        # UPDATE
        # ----------------------------------------------------

        if isinstance(
            node,
            Update
        ):

            old = self.evaluate(
                node.target
            )

            new = (
                old + 1
                if node.operator == "++"
                else old - 1
            )

            self.assign(
                node.target,
                new
            )

            return old

        raise Exception(
            f"Unknown expression: "
            f"{type(node).__name__}"
        )

    # ========================================================
    # ASSIGN
    # ========================================================

    def assign(self, target, value):

        if isinstance(
            target,
            str
        ):

            self.environment.set(
                target,
                value
            )

            return

        if isinstance(
            target,
            Identifier
        ):

            self.environment.set(
                target.name,
                value
            )

            return

        raise Exception(
            "Invalid assignment target"
        )

    # ========================================================
    # MEMBER
    # ========================================================

    def get_member(self, object_, property_):

        if (
            isinstance(object_, dict)
            and object_.get("type") == "console"
        ):

            if property_ == "log":
                return (
                    "builtin",
                    "console.log"
                )

            if property_ == "error":
                return (
                    "builtin",
                    "console.error"
                )

        if isinstance(
            object_,
            MathObject
        ):

            if property_ in object_.values:
                return object_.values[property_]

            if property_ in object_.functions:
                return (
                    "math",
                    property_
                )

        raise Exception(
            f"TypeError: property "
            f"'{property_}' not found"
        )

    # ========================================================
    # CALL
    # ========================================================

    def call(self, node):

        callee = self.evaluate(
            node.callee
        )

        arguments = [
            self.evaluate(arg)
            for arg in node.arguments
        ]

        # ----------------------------------------------------
        # console.log
        # ----------------------------------------------------

        if (
            isinstance(callee, tuple)
            and callee[0] == "builtin"
        ):

            name = callee[1]

            if name == "console.log":

                text = " ".join(
                    self.to_string(x)
                    for x in arguments
                )

                self.output.append(
                    text
                )

                return None

            if name == "console.error":

                text = " ".join(
                    self.to_string(x)
                    for x in arguments
                )

                self.output.append(
                    text
                )

                return None

        # ----------------------------------------------------
        # Math
        # ----------------------------------------------------

        if (
            isinstance(callee, tuple)
            and callee[0] == "math"
        ):

            name = callee[1]

            fn = self.global_env.get(
                "Math"
            ).functions[name]

            return fn(*arguments)

        # ----------------------------------------------------
        # USER FUNCTION
        # ----------------------------------------------------

        if isinstance(
            callee,
            JSFunction
        ):

            if len(arguments) != len(
                callee.parameters
            ):

                raise Exception(
                    "TypeError: incorrect "
                    "number of arguments"
                )

            local = Environment(
                callee.closure
            )

            for i, parameter in enumerate(
                callee.parameters
            ):

                local.define(
                    parameter,
                    arguments[i]
                )

            previous = self.environment

            self.environment = local

            try:

                result = self.execute(
                    callee.body
                )

                if isinstance(
                    result,
                    ReturnSignal
                ):

                    return result.value

                return None

            finally:

                self.environment = previous

        raise Exception(
            "TypeError: value is not callable"
        )

    # ========================================================
    # OPERATORS
    # ========================================================

    def binary(self, operator, a, b):

        if operator == "+":

            if (
                isinstance(a, str)
                or isinstance(b, str)
            ):

                return (
                    self.to_string(a)
                    + self.to_string(b)
                )

            return a + b

        if operator == "-":
            return a - b

        if operator == "*":
            return a * b

        if operator == "/":

            if b == 0:

                raise Exception(
                    "RangeError: division by zero"
                )

            return a / b

        if operator == "%":

            if b == 0:

                raise Exception(
                    "RangeError: division by zero"
                )

            return a % b

        if operator == "**":
            return a ** b

        if operator == "==":
            return a == b

        if operator == "!=":
            return a != b

        if operator == "<":
            return a < b

        if operator == ">":
            return a > b

        if operator == "<=":
            return a <= b

        if operator == ">=":
            return a >= b

        raise Exception(
            f"Unknown operator: {operator}"
        )

    # ========================================================
    # TRUTHY
    # ========================================================

    def truthy(self, value):

        if value is None:
            return False

        if value is False:
            return False

        if value == 0:
            return False

        if value == "":
            return False

        return True

    # ========================================================
    # STRING
    # ========================================================

    def to_string(self, value):

        if value is None:
            return "null"

        if value is True:
            return "true"

        if value is False:
            return "false"

        if isinstance(
            value,
            float
        ) and value.is_integer():

            return str(int(value))

        return str(value)


# ============================================================
# JS RUNNER
# ============================================================

class JSRunner:

    def run(self, source):

        tokenizer = Tokenizer(
            source
        )

        tokens = tokenizer.tokenize()

        parser = Parser(
            tokens
        )

        program = parser.parse()

        interpreter = Interpreter()

        return interpreter.run(
            program
        )


# ============================================================
# MAIN
# ============================================================

def main():

    if len(sys.argv) < 2:

        print(
            "JS Runner in Python"
        )

        print()

        print(
            "Usage:"
        )

        print(
            "  python jsrunner.py <file.js>"
        )

        return

    filename = sys.argv[1]

    if not filename.endswith(".js"):

        print(
            "Error: expected a .js file"
        )

        sys.exit(1)

    try:

        with open(
            filename,
            "r",
            encoding="utf-8"
        ) as file:

            source = file.read()

    except FileNotFoundError:

        print(
            f"Error: file not found: {filename}"
        )

        sys.exit(1)

    runner = JSRunner()

    try:

        output = runner.run(
            source
        )

        if output:
            print(output)

    except Exception as error:

        print(
            error
        )

        sys.exit(1)


if __name__ == "__main__":
    main()
