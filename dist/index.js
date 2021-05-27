const ANSI_PATTERN = new RegExp([
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", 
].join("|"), "g");
var DiffType;
(function(DiffType1) {
    DiffType1["removed"] = "removed";
    DiffType1["common"] = "common";
    DiffType1["added"] = "added";
})(DiffType || (DiffType = {
}));
class AssertionError extends Error {
    constructor(message8){
        super(message8);
        this.name = "AssertionError";
    }
}
function unreachable() {
    throw new AssertionError("unreachable");
}
class DenoStdInternalError extends Error {
    constructor(message1){
        super(message1);
        this.name = "DenoStdInternalError";
    }
}
function assert(expr, msg = "") {
    if (!expr) {
        throw new DenoStdInternalError(msg);
    }
}
function copy(src, dst, off = 0) {
    off = Math.max(0, Math.min(off, dst.byteLength));
    const dstBytesAvailable = dst.byteLength - off;
    if (src.byteLength > dstBytesAvailable) {
        src = src.subarray(0, dstBytesAvailable);
    }
    dst.set(src, off);
    return src.byteLength;
}
const MIN_READ = 32 * 1024;
const MAX_SIZE = 2 ** 32 - 2;
class Buffer {
    #buf;
    #off = 0;
    constructor(ab){
        this.#buf = ab === undefined ? new Uint8Array(0) : new Uint8Array(ab);
    }
    bytes(options = {
        copy: true
    }) {
        if (options.copy === false) return this.#buf.subarray(this.#off);
        return this.#buf.slice(this.#off);
    }
    empty() {
        return this.#buf.byteLength <= this.#off;
    }
    get length() {
        return this.#buf.byteLength - this.#off;
    }
    get capacity() {
        return this.#buf.buffer.byteLength;
    }
    truncate(n) {
        if (n === 0) {
            this.reset();
            return;
        }
        if (n < 0 || n > this.length) {
            throw Error("bytes.Buffer: truncation out of range");
        }
        this.#reslice(this.#off + n);
    }
    reset() {
        this.#reslice(0);
        this.#off = 0;
    }
    #tryGrowByReslice = (n)=>{
        const l = this.#buf.byteLength;
        if (n <= this.capacity - l) {
            this.#reslice(l + n);
            return l;
        }
        return -1;
    };
    #reslice = (len)=>{
        assert(len <= this.#buf.buffer.byteLength);
        this.#buf = new Uint8Array(this.#buf.buffer, 0, len);
    };
    readSync(p) {
        if (this.empty()) {
            this.reset();
            if (p.byteLength === 0) {
                return 0;
            }
            return null;
        }
        const nread = copy(this.#buf.subarray(this.#off), p);
        this.#off += nread;
        return nread;
    }
    read(p) {
        const rr = this.readSync(p);
        return Promise.resolve(rr);
    }
    writeSync(p) {
        const m = this.#grow(p.byteLength);
        return copy(p, this.#buf, m);
    }
    write(p) {
        const n = this.writeSync(p);
        return Promise.resolve(n);
    }
    #grow = (n)=>{
        const m = this.length;
        if (m === 0 && this.#off !== 0) {
            this.reset();
        }
        const i = this.#tryGrowByReslice(n);
        if (i >= 0) {
            return i;
        }
        const c = this.capacity;
        if (n <= Math.floor(c / 2) - m) {
            copy(this.#buf.subarray(this.#off), this.#buf);
        } else if (c + n > MAX_SIZE) {
            throw new Error("The buffer cannot be grown beyond the maximum size.");
        } else {
            const buf = new Uint8Array(Math.min(2 * c + n, MAX_SIZE));
            copy(this.#buf.subarray(this.#off), buf);
            this.#buf = buf;
        }
        this.#off = 0;
        this.#reslice(Math.min(m + n, MAX_SIZE));
        return m;
    };
    grow(n) {
        if (n < 0) {
            throw Error("Buffer.grow: negative count");
        }
        const m = this.#grow(n);
        this.#reslice(m);
    }
    async readFrom(r) {
        let n = 0;
        const tmp = new Uint8Array(MIN_READ);
        while(true){
            const shouldGrow = this.capacity - this.length < MIN_READ;
            const buf = shouldGrow ? tmp : new Uint8Array(this.#buf.buffer, this.length);
            const nread = await r.read(buf);
            if (nread === null) {
                return n;
            }
            if (shouldGrow) this.writeSync(buf.subarray(0, nread));
            else this.#reslice(this.length + nread);
            n += nread;
        }
    }
    readFromSync(r) {
        let n = 0;
        const tmp = new Uint8Array(MIN_READ);
        while(true){
            const shouldGrow = this.capacity - this.length < MIN_READ;
            const buf = shouldGrow ? tmp : new Uint8Array(this.#buf.buffer, this.length);
            const nread = r.readSync(buf);
            if (nread === null) {
                return n;
            }
            if (shouldGrow) this.writeSync(buf.subarray(0, nread));
            else this.#reslice(this.length + nread);
            n += nread;
        }
    }
}
function notImplemented(msg) {
    const message2 = msg ? `Not implemented: ${msg}` : "Not implemented";
    throw new Error(message2);
}
function normalizeEncoding(enc) {
    if (enc == null || enc === "utf8" || enc === "utf-8") return "utf8";
    return slowCases(enc);
}
function slowCases(enc) {
    switch(enc.length){
        case 4:
            if (enc === "UTF8") return "utf8";
            if (enc === "ucs2" || enc === "UCS2") return "utf16le";
            enc = `${enc}`.toLowerCase();
            if (enc === "utf8") return "utf8";
            if (enc === "ucs2") return "utf16le";
            break;
        case 3:
            if (enc === "hex" || enc === "HEX" || `${enc}`.toLowerCase() === "hex") {
                return "hex";
            }
            break;
        case 5:
            if (enc === "ascii") return "ascii";
            if (enc === "ucs-2") return "utf16le";
            if (enc === "UTF-8") return "utf8";
            if (enc === "ASCII") return "ascii";
            if (enc === "UCS-2") return "utf16le";
            enc = `${enc}`.toLowerCase();
            if (enc === "utf-8") return "utf8";
            if (enc === "ascii") return "ascii";
            if (enc === "ucs-2") return "utf16le";
            break;
        case 6:
            if (enc === "base64") return "base64";
            if (enc === "latin1" || enc === "binary") return "latin1";
            if (enc === "BASE64") return "base64";
            if (enc === "LATIN1" || enc === "BINARY") return "latin1";
            enc = `${enc}`.toLowerCase();
            if (enc === "base64") return "base64";
            if (enc === "latin1" || enc === "binary") return "latin1";
            break;
        case 7:
            if (enc === "utf16le" || enc === "UTF16LE" || `${enc}`.toLowerCase() === "utf16le") {
                return "utf16le";
            }
            break;
        case 8:
            if (enc === "utf-16le" || enc === "UTF-16LE" || `${enc}`.toLowerCase() === "utf-16le") {
                return "utf16le";
            }
            break;
        default:
            if (enc === "") return "utf8";
    }
}
function validateIntegerRange(value, name, min = -2147483648, max = 2147483647) {
    if (!Number.isInteger(value)) {
        throw new Error(`${name} must be 'an integer' but was ${value}`);
    }
    if (value < min || value > max) {
        throw new Error(`${name} must be >= ${min} && <= ${max}. Value was ${value}`);
    }
}
function once(callback) {
    let called = false;
    return function(...args) {
        if (called) return;
        called = true;
        callback.apply(this, args);
    };
}
const kCustomPromisifiedSymbol = Symbol.for("nodejs.util.promisify.custom");
const kCustomPromisifyArgsSymbol = Symbol.for("nodejs.util.promisify.customArgs");
class NodeInvalidArgTypeError extends TypeError {
    code = "ERR_INVALID_ARG_TYPE";
    constructor(argumentName, type, received){
        super(`The "${argumentName}" argument must be of type ${type}. Received ${typeof received}`);
    }
}
function promisify(original) {
    if (typeof original !== "function") {
        throw new NodeInvalidArgTypeError("original", "Function", original);
    }
    if (original[kCustomPromisifiedSymbol]) {
        const fn = original[kCustomPromisifiedSymbol];
        if (typeof fn !== "function") {
            throw new NodeInvalidArgTypeError("util.promisify.custom", "Function", fn);
        }
        return Object.defineProperty(fn, kCustomPromisifiedSymbol, {
            value: fn,
            enumerable: false,
            writable: false,
            configurable: true
        });
    }
    const argumentNames = original[kCustomPromisifyArgsSymbol];
    function fn(...args) {
        return new Promise((resolve, reject)=>{
            original.call(this, ...args, (err, ...values)=>{
                if (err) {
                    return reject(err);
                }
                if (argumentNames !== undefined && values.length > 1) {
                    const obj = {
                    };
                    for(let i = 0; i < argumentNames.length; i++){
                        obj[argumentNames[i]] = values[i];
                    }
                    resolve(obj);
                } else {
                    resolve(values[0]);
                }
            });
        });
    }
    Object.setPrototypeOf(fn, Object.getPrototypeOf(original));
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
        value: fn,
        enumerable: false,
        writable: false,
        configurable: true
    });
    return Object.defineProperties(fn, Object.getOwnPropertyDescriptors(original));
}
promisify.custom = kCustomPromisifiedSymbol;
class NodeFalsyValueRejectionError extends Error {
    reason;
    code = "ERR_FALSY_VALUE_REJECTION";
    constructor(reason2){
        super("Promise was rejected with falsy value");
        this.reason = reason2;
    }
}
class NodeInvalidArgTypeError1 extends TypeError {
    code = "ERR_INVALID_ARG_TYPE";
    constructor(argumentName1){
        super(`The ${argumentName1} argument must be of type function.`);
    }
}
const _toString = Object.prototype.toString;
const _isObjectLike = (value)=>value !== null && typeof value === "object"
;
const _isFunctionLike = (value)=>value !== null && typeof value === "function"
;
function isAnyArrayBuffer(value) {
    return _isObjectLike(value) && (_toString.call(value) === "[object ArrayBuffer]" || _toString.call(value) === "[object SharedArrayBuffer]");
}
function isArrayBufferView(value) {
    return ArrayBuffer.isView(value);
}
function isArgumentsObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Arguments]";
}
function isArrayBuffer(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object ArrayBuffer]";
}
function isAsyncFunction(value) {
    return _isFunctionLike(value) && _toString.call(value) === "[object AsyncFunction]";
}
function isBigInt64Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object BigInt64Array]";
}
function isBigUint64Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object BigUint64Array]";
}
function isBooleanObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Boolean]";
}
function isBoxedPrimitive(value) {
    return isBooleanObject(value) || isStringObject(value) || isNumberObject(value) || isSymbolObject(value) || isBigIntObject(value);
}
function isDataView(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object DataView]";
}
function isDate(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Date]";
}
function isFloat32Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Float32Array]";
}
function isFloat64Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Float64Array]";
}
function isGeneratorFunction(value) {
    return _isFunctionLike(value) && _toString.call(value) === "[object GeneratorFunction]";
}
function isGeneratorObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Generator]";
}
function isInt8Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Int8Array]";
}
function isInt16Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Int16Array]";
}
function isInt32Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Int32Array]";
}
function isMap(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Map]";
}
function isMapIterator(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Map Iterator]";
}
function isModuleNamespaceObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Module]";
}
function isNativeError(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Error]";
}
function isNumberObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Number]";
}
function isBigIntObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object BigInt]";
}
function isPromise(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Promise]";
}
function isRegExp(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object RegExp]";
}
function isSet(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Set]";
}
function isSetIterator(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Set Iterator]";
}
function isSharedArrayBuffer(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object SharedArrayBuffer]";
}
function isStringObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object String]";
}
function isSymbolObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Symbol]";
}
function isTypedArray(value) {
    const reTypedTag = /^\[object (?:Float(?:32|64)|(?:Int|Uint)(?:8|16|32)|Uint8Clamped)Array\]$/;
    return _isObjectLike(value) && reTypedTag.test(_toString.call(value));
}
function isUint8Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Uint8Array]";
}
function isUint8ClampedArray(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Uint8ClampedArray]";
}
function isUint16Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Uint16Array]";
}
function isUint32Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Uint32Array]";
}
function isWeakMap(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object WeakMap]";
}
function isWeakSet(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object WeakSet]";
}
const mod = function() {
    return {
        isAnyArrayBuffer: isAnyArrayBuffer,
        isArrayBufferView: isArrayBufferView,
        isArgumentsObject: isArgumentsObject,
        isArrayBuffer: isArrayBuffer,
        isAsyncFunction: isAsyncFunction,
        isBigInt64Array: isBigInt64Array,
        isBigUint64Array: isBigUint64Array,
        isBooleanObject: isBooleanObject,
        isBoxedPrimitive: isBoxedPrimitive,
        isDataView: isDataView,
        isDate: isDate,
        isFloat32Array: isFloat32Array,
        isFloat64Array: isFloat64Array,
        isGeneratorFunction: isGeneratorFunction,
        isGeneratorObject: isGeneratorObject,
        isInt8Array: isInt8Array,
        isInt16Array: isInt16Array,
        isInt32Array: isInt32Array,
        isMap: isMap,
        isMapIterator: isMapIterator,
        isModuleNamespaceObject: isModuleNamespaceObject,
        isNativeError: isNativeError,
        isNumberObject: isNumberObject,
        isBigIntObject: isBigIntObject,
        isPromise: isPromise,
        isRegExp: isRegExp,
        isSet: isSet,
        isSetIterator: isSetIterator,
        isSharedArrayBuffer: isSharedArrayBuffer,
        isStringObject: isStringObject,
        isSymbolObject: isSymbolObject,
        isTypedArray: isTypedArray,
        isUint8Array: isUint8Array,
        isUint8ClampedArray: isUint8ClampedArray,
        isUint16Array: isUint16Array,
        isUint32Array: isUint32Array,
        isWeakMap: isWeakMap,
        isWeakSet: isWeakSet
    };
}();
const classRegExp = /^([A-Z][a-z0-9]*)+$/;
const kTypes = [
    "string",
    "function",
    "number",
    "object",
    "Function",
    "Object",
    "boolean",
    "bigint",
    "symbol", 
];
class NodeErrorAbstraction extends Error {
    code;
    constructor(name12, code6, message2){
        super(message2);
        this.code = code6;
        this.name = name12;
        this.stack = this.stack && `${name12} [${this.code}]${this.stack.slice(20)}`;
    }
    toString() {
        return `${this.name} [${this.code}]: ${this.message}`;
    }
}
class NodeError extends NodeErrorAbstraction {
    constructor(code1, message3){
        super(Error.prototype.name, code1, message3);
    }
}
class NodeSyntaxError extends NodeErrorAbstraction {
    constructor(code2, message4){
        super(SyntaxError.prototype.name, code2, message4);
        Object.setPrototypeOf(this, SyntaxError.prototype);
    }
}
class NodeRangeError extends NodeErrorAbstraction {
    constructor(code3, message5){
        super(RangeError.prototype.name, code3, message5);
        Object.setPrototypeOf(this, RangeError.prototype);
    }
}
class NodeTypeError extends NodeErrorAbstraction {
    constructor(code4, message6){
        super(TypeError.prototype.name, code4, message6);
        Object.setPrototypeOf(this, TypeError.prototype);
    }
}
class NodeURIError extends NodeErrorAbstraction {
    constructor(code5, message7){
        super(URIError.prototype.name, code5, message7);
        Object.setPrototypeOf(this, URIError.prototype);
    }
}
class ERR_INVALID_ARG_TYPE extends NodeTypeError {
    constructor(name1, expected, actual1){
        expected = Array.isArray(expected) ? expected : [
            expected
        ];
        let msg = "The ";
        if (name1.endsWith(" argument")) {
            msg += `${name1} `;
        } else {
            const type1 = name1.includes(".") ? "property" : "argument";
            msg += `"${name1}" ${type1} `;
        }
        msg += "must be ";
        const types = [];
        const instances = [];
        const other = [];
        for (const value6 of expected){
            if (kTypes.includes(value6)) {
                types.push(value6.toLocaleLowerCase());
            } else if (classRegExp.test(value6)) {
                instances.push(value6);
            } else {
                other.push(value6);
            }
        }
        if (instances.length > 0) {
            const pos = types.indexOf("object");
            if (pos !== -1) {
                types.splice(pos, 1);
                instances.push("Object");
            }
        }
        if (types.length > 0) {
            if (types.length > 2) {
                const last = types.pop();
                msg += `one of type ${types.join(", ")}, or ${last}`;
            } else if (types.length === 2) {
                msg += `one of type ${types[0]} or ${types[1]}`;
            } else {
                msg += `of type ${types[0]}`;
            }
            if (instances.length > 0 || other.length > 0) {
                msg += " or ";
            }
        }
        if (instances.length > 0) {
            if (instances.length > 2) {
                const last = instances.pop();
                msg += `an instance of ${instances.join(", ")}, or ${last}`;
            } else {
                msg += `an instance of ${instances[0]}`;
                if (instances.length === 2) {
                    msg += ` or ${instances[1]}`;
                }
            }
            if (other.length > 0) {
                msg += " or ";
            }
        }
        if (other.length > 0) {
            if (other.length > 2) {
                const last = other.pop();
                msg += `one of ${other.join(", ")}, or ${last}`;
            } else if (other.length === 2) {
                msg += `one of ${other[0]} or ${other[1]}`;
            } else {
                if (other[0].toLowerCase() !== other[0]) {
                    msg += "an ";
                }
                msg += `${other[0]}`;
            }
        }
        super("ERR_INVALID_ARG_TYPE", `${msg}.${invalidArgTypeHelper(actual1)}`);
    }
}
const DEFAULT_INSPECT_OPTIONS = {
    showHidden: false,
    depth: 2,
    colors: false,
    customInspect: true,
    showProxy: false,
    maxArrayLength: 100,
    maxStringLength: Infinity,
    breakLength: 80,
    compact: 3,
    sorted: false,
    getters: false
};
inspect.defaultOptions = DEFAULT_INSPECT_OPTIONS;
inspect.custom = Deno.customInspect;
function inspect(object, ...opts) {
    if (typeof object === "string" && !object.includes("'")) {
        return `'${object}'`;
    }
    opts = {
        ...DEFAULT_INSPECT_OPTIONS,
        ...opts
    };
    return Deno.inspect(object, {
        depth: opts.depth,
        iterableLimit: opts.maxArrayLength,
        compact: !!opts.compact,
        sorted: !!opts.sorted,
        showProxy: !!opts.showProxy
    });
}
class ERR_INVALID_ARG_VALUE extends NodeTypeError {
    constructor(name2, value1, reason1){
        super("ERR_INVALID_ARG_VALUE", `The argument '${name2}' ${reason1}. Received ${inspect(value1)}`);
    }
}
function invalidArgTypeHelper(input) {
    if (input == null) {
        return ` Received ${input}`;
    }
    if (typeof input === "function" && input.name) {
        return ` Received function ${input.name}`;
    }
    if (typeof input === "object") {
        if (input.constructor && input.constructor.name) {
            return ` Received an instance of ${input.constructor.name}`;
        }
        return ` Received ${inspect(input, {
            depth: -1
        })}`;
    }
    let inspected = inspect(input, {
        colors: false
    });
    if (inspected.length > 25) {
        inspected = `${inspected.slice(0, 25)}...`;
    }
    return ` Received type ${typeof input} (${inspected})`;
}
class ERR_OUT_OF_RANGE extends RangeError {
    code = "ERR_OUT_OF_RANGE";
    constructor(str1, range, received1){
        super(`The value of "${str1}" is out of range. It must be ${range}. Received ${received1}`);
        const { name: name3  } = this;
        this.name = `${name3} [${this.code}]`;
        this.stack;
        this.name = name3;
    }
}
class ERR_AMBIGUOUS_ARGUMENT extends NodeTypeError {
    constructor(x87, y19){
        super("ERR_AMBIGUOUS_ARGUMENT", `The "${x87}" argument is ambiguous. ${y19}`);
    }
}
class ERR_ARG_NOT_ITERABLE extends NodeTypeError {
    constructor(x1){
        super("ERR_ARG_NOT_ITERABLE", `${x1} must be iterable`);
    }
}
class ERR_ASSERTION extends NodeError {
    constructor(x2){
        super("ERR_ASSERTION", `${x2}`);
    }
}
class ERR_ASYNC_CALLBACK extends NodeTypeError {
    constructor(x3){
        super("ERR_ASYNC_CALLBACK", `${x3} must be a function`);
    }
}
class ERR_ASYNC_TYPE extends NodeTypeError {
    constructor(x4){
        super("ERR_ASYNC_TYPE", `Invalid name for async "type": ${x4}`);
    }
}
class ERR_BROTLI_INVALID_PARAM extends NodeRangeError {
    constructor(x5){
        super("ERR_BROTLI_INVALID_PARAM", `${x5} is not a valid Brotli parameter`);
    }
}
class ERR_BUFFER_OUT_OF_BOUNDS extends NodeRangeError {
    constructor(name4){
        super("ERR_BUFFER_OUT_OF_BOUNDS", name4 ? `"${name4}" is outside of buffer bounds` : "Attempt to access memory outside buffer bounds");
    }
}
class ERR_BUFFER_TOO_LARGE extends NodeRangeError {
    constructor(x6){
        super("ERR_BUFFER_TOO_LARGE", `Cannot create a Buffer larger than ${x6} bytes`);
    }
}
class ERR_CANNOT_WATCH_SIGINT extends NodeError {
    constructor(){
        super("ERR_CANNOT_WATCH_SIGINT", "Cannot watch for SIGINT signals");
    }
}
class ERR_CHILD_CLOSED_BEFORE_REPLY extends NodeError {
    constructor(){
        super("ERR_CHILD_CLOSED_BEFORE_REPLY", "Child closed before reply received");
    }
}
class ERR_CHILD_PROCESS_IPC_REQUIRED extends NodeError {
    constructor(x7){
        super("ERR_CHILD_PROCESS_IPC_REQUIRED", `Forked processes must have an IPC channel, missing value 'ipc' in ${x7}`);
    }
}
class ERR_CHILD_PROCESS_STDIO_MAXBUFFER extends NodeRangeError {
    constructor(x8){
        super("ERR_CHILD_PROCESS_STDIO_MAXBUFFER", `${x8} maxBuffer length exceeded`);
    }
}
class ERR_CONSOLE_WRITABLE_STREAM extends NodeTypeError {
    constructor(x9){
        super("ERR_CONSOLE_WRITABLE_STREAM", `Console expects a writable stream instance for ${x9}`);
    }
}
class ERR_CONTEXT_NOT_INITIALIZED extends NodeError {
    constructor(){
        super("ERR_CONTEXT_NOT_INITIALIZED", "context used is not initialized");
    }
}
class ERR_CPU_USAGE extends NodeError {
    constructor(x10){
        super("ERR_CPU_USAGE", `Unable to obtain cpu usage ${x10}`);
    }
}
class ERR_CRYPTO_CUSTOM_ENGINE_NOT_SUPPORTED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_CUSTOM_ENGINE_NOT_SUPPORTED", "Custom engines not supported by this OpenSSL");
    }
}
class ERR_CRYPTO_ECDH_INVALID_FORMAT extends NodeTypeError {
    constructor(x11){
        super("ERR_CRYPTO_ECDH_INVALID_FORMAT", `Invalid ECDH format: ${x11}`);
    }
}
class ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY extends NodeError {
    constructor(){
        super("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY", "Public key is not valid for specified curve");
    }
}
class ERR_CRYPTO_ENGINE_UNKNOWN extends NodeError {
    constructor(x12){
        super("ERR_CRYPTO_ENGINE_UNKNOWN", `Engine "${x12}" was not found`);
    }
}
class ERR_CRYPTO_FIPS_FORCED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_FIPS_FORCED", "Cannot set FIPS mode, it was forced with --force-fips at startup.");
    }
}
class ERR_CRYPTO_FIPS_UNAVAILABLE extends NodeError {
    constructor(){
        super("ERR_CRYPTO_FIPS_UNAVAILABLE", "Cannot set FIPS mode in a non-FIPS build.");
    }
}
class ERR_CRYPTO_HASH_FINALIZED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_HASH_FINALIZED", "Digest already called");
    }
}
class ERR_CRYPTO_HASH_UPDATE_FAILED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_HASH_UPDATE_FAILED", "Hash update failed");
    }
}
class ERR_CRYPTO_INCOMPATIBLE_KEY extends NodeError {
    constructor(x13, y1){
        super("ERR_CRYPTO_INCOMPATIBLE_KEY", `Incompatible ${x13}: ${y1}`);
    }
}
class ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS extends NodeError {
    constructor(x14, y2){
        super("ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS", `The selected key encoding ${x14} ${y2}.`);
    }
}
class ERR_CRYPTO_INVALID_DIGEST extends NodeTypeError {
    constructor(x15){
        super("ERR_CRYPTO_INVALID_DIGEST", `Invalid digest: ${x15}`);
    }
}
class ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE extends NodeTypeError {
    constructor(x16, y3){
        super("ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE", `Invalid key object type ${x16}, expected ${y3}.`);
    }
}
class ERR_CRYPTO_INVALID_STATE extends NodeError {
    constructor(x17){
        super("ERR_CRYPTO_INVALID_STATE", `Invalid state for operation ${x17}`);
    }
}
class ERR_CRYPTO_PBKDF2_ERROR extends NodeError {
    constructor(){
        super("ERR_CRYPTO_PBKDF2_ERROR", "PBKDF2 error");
    }
}
class ERR_CRYPTO_SCRYPT_INVALID_PARAMETER extends NodeError {
    constructor(){
        super("ERR_CRYPTO_SCRYPT_INVALID_PARAMETER", "Invalid scrypt parameter");
    }
}
class ERR_CRYPTO_SCRYPT_NOT_SUPPORTED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_SCRYPT_NOT_SUPPORTED", "Scrypt algorithm not supported");
    }
}
class ERR_CRYPTO_SIGN_KEY_REQUIRED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_SIGN_KEY_REQUIRED", "No key provided to sign");
    }
}
class ERR_DIR_CLOSED extends NodeError {
    constructor(){
        super("ERR_DIR_CLOSED", "Directory handle was closed");
    }
}
class ERR_DIR_CONCURRENT_OPERATION extends NodeError {
    constructor(){
        super("ERR_DIR_CONCURRENT_OPERATION", "Cannot do synchronous work on directory handle with concurrent asynchronous operations");
    }
}
class ERR_DNS_SET_SERVERS_FAILED extends NodeError {
    constructor(x18, y4){
        super("ERR_DNS_SET_SERVERS_FAILED", `c-ares failed to set servers: "${x18}" [${y4}]`);
    }
}
class ERR_DOMAIN_CALLBACK_NOT_AVAILABLE extends NodeError {
    constructor(){
        super("ERR_DOMAIN_CALLBACK_NOT_AVAILABLE", "A callback was registered through " + "process.setUncaughtExceptionCaptureCallback(), which is mutually " + "exclusive with using the `domain` module");
    }
}
class ERR_DOMAIN_CANNOT_SET_UNCAUGHT_EXCEPTION_CAPTURE extends NodeError {
    constructor(){
        super("ERR_DOMAIN_CANNOT_SET_UNCAUGHT_EXCEPTION_CAPTURE", "The `domain` module is in use, which is mutually exclusive with calling " + "process.setUncaughtExceptionCaptureCallback()");
    }
}
class ERR_ENCODING_INVALID_ENCODED_DATA extends NodeErrorAbstraction {
    errno;
    constructor(encoding1, ret){
        super(TypeError.prototype.name, "ERR_ENCODING_INVALID_ENCODED_DATA", `The encoded data was not valid for encoding ${encoding1}`);
        Object.setPrototypeOf(this, TypeError.prototype);
        this.errno = ret;
    }
}
const windows = [
    [
        -4093,
        [
            "E2BIG",
            "argument list too long"
        ]
    ],
    [
        -4092,
        [
            "EACCES",
            "permission denied"
        ]
    ],
    [
        -4091,
        [
            "EADDRINUSE",
            "address already in use"
        ]
    ],
    [
        -4090,
        [
            "EADDRNOTAVAIL",
            "address not available"
        ]
    ],
    [
        -4089,
        [
            "EAFNOSUPPORT",
            "address family not supported"
        ]
    ],
    [
        -4088,
        [
            "EAGAIN",
            "resource temporarily unavailable"
        ]
    ],
    [
        -3000,
        [
            "EAI_ADDRFAMILY",
            "address family not supported"
        ]
    ],
    [
        -3001,
        [
            "EAI_AGAIN",
            "temporary failure"
        ]
    ],
    [
        -3002,
        [
            "EAI_BADFLAGS",
            "bad ai_flags value"
        ]
    ],
    [
        -3013,
        [
            "EAI_BADHINTS",
            "invalid value for hints"
        ]
    ],
    [
        -3003,
        [
            "EAI_CANCELED",
            "request canceled"
        ]
    ],
    [
        -3004,
        [
            "EAI_FAIL",
            "permanent failure"
        ]
    ],
    [
        -3005,
        [
            "EAI_FAMILY",
            "ai_family not supported"
        ]
    ],
    [
        -3006,
        [
            "EAI_MEMORY",
            "out of memory"
        ]
    ],
    [
        -3007,
        [
            "EAI_NODATA",
            "no address"
        ]
    ],
    [
        -3008,
        [
            "EAI_NONAME",
            "unknown node or service"
        ]
    ],
    [
        -3009,
        [
            "EAI_OVERFLOW",
            "argument buffer overflow"
        ]
    ],
    [
        -3014,
        [
            "EAI_PROTOCOL",
            "resolved protocol is unknown"
        ]
    ],
    [
        -3010,
        [
            "EAI_SERVICE",
            "service not available for socket type"
        ]
    ],
    [
        -3011,
        [
            "EAI_SOCKTYPE",
            "socket type not supported"
        ]
    ],
    [
        -4084,
        [
            "EALREADY",
            "connection already in progress"
        ]
    ],
    [
        -4083,
        [
            "EBADF",
            "bad file descriptor"
        ]
    ],
    [
        -4082,
        [
            "EBUSY",
            "resource busy or locked"
        ]
    ],
    [
        -4081,
        [
            "ECANCELED",
            "operation canceled"
        ]
    ],
    [
        -4080,
        [
            "ECHARSET",
            "invalid Unicode character"
        ]
    ],
    [
        -4079,
        [
            "ECONNABORTED",
            "software caused connection abort"
        ]
    ],
    [
        -4078,
        [
            "ECONNREFUSED",
            "connection refused"
        ]
    ],
    [
        -4077,
        [
            "ECONNRESET",
            "connection reset by peer"
        ]
    ],
    [
        -4076,
        [
            "EDESTADDRREQ",
            "destination address required"
        ]
    ],
    [
        -4075,
        [
            "EEXIST",
            "file already exists"
        ]
    ],
    [
        -4074,
        [
            "EFAULT",
            "bad address in system call argument"
        ]
    ],
    [
        -4036,
        [
            "EFBIG",
            "file too large"
        ]
    ],
    [
        -4073,
        [
            "EHOSTUNREACH",
            "host is unreachable"
        ]
    ],
    [
        -4072,
        [
            "EINTR",
            "interrupted system call"
        ]
    ],
    [
        -4071,
        [
            "EINVAL",
            "invalid argument"
        ]
    ],
    [
        -4070,
        [
            "EIO",
            "i/o error"
        ]
    ],
    [
        -4069,
        [
            "EISCONN",
            "socket is already connected"
        ]
    ],
    [
        -4068,
        [
            "EISDIR",
            "illegal operation on a directory"
        ]
    ],
    [
        -4067,
        [
            "ELOOP",
            "too many symbolic links encountered"
        ]
    ],
    [
        -4066,
        [
            "EMFILE",
            "too many open files"
        ]
    ],
    [
        -4065,
        [
            "EMSGSIZE",
            "message too long"
        ]
    ],
    [
        -4064,
        [
            "ENAMETOOLONG",
            "name too long"
        ]
    ],
    [
        -4063,
        [
            "ENETDOWN",
            "network is down"
        ]
    ],
    [
        -4062,
        [
            "ENETUNREACH",
            "network is unreachable"
        ]
    ],
    [
        -4061,
        [
            "ENFILE",
            "file table overflow"
        ]
    ],
    [
        -4060,
        [
            "ENOBUFS",
            "no buffer space available"
        ]
    ],
    [
        -4059,
        [
            "ENODEV",
            "no such device"
        ]
    ],
    [
        -4058,
        [
            "ENOENT",
            "no such file or directory"
        ]
    ],
    [
        -4057,
        [
            "ENOMEM",
            "not enough memory"
        ]
    ],
    [
        -4056,
        [
            "ENONET",
            "machine is not on the network"
        ]
    ],
    [
        -4035,
        [
            "ENOPROTOOPT",
            "protocol not available"
        ]
    ],
    [
        -4055,
        [
            "ENOSPC",
            "no space left on device"
        ]
    ],
    [
        -4054,
        [
            "ENOSYS",
            "function not implemented"
        ]
    ],
    [
        -4053,
        [
            "ENOTCONN",
            "socket is not connected"
        ]
    ],
    [
        -4052,
        [
            "ENOTDIR",
            "not a directory"
        ]
    ],
    [
        -4051,
        [
            "ENOTEMPTY",
            "directory not empty"
        ]
    ],
    [
        -4050,
        [
            "ENOTSOCK",
            "socket operation on non-socket"
        ]
    ],
    [
        -4049,
        [
            "ENOTSUP",
            "operation not supported on socket"
        ]
    ],
    [
        -4048,
        [
            "EPERM",
            "operation not permitted"
        ]
    ],
    [
        -4047,
        [
            "EPIPE",
            "broken pipe"
        ]
    ],
    [
        -4046,
        [
            "EPROTO",
            "protocol error"
        ]
    ],
    [
        -4045,
        [
            "EPROTONOSUPPORT",
            "protocol not supported"
        ]
    ],
    [
        -4044,
        [
            "EPROTOTYPE",
            "protocol wrong type for socket"
        ]
    ],
    [
        -4034,
        [
            "ERANGE",
            "result too large"
        ]
    ],
    [
        -4043,
        [
            "EROFS",
            "read-only file system"
        ]
    ],
    [
        -4042,
        [
            "ESHUTDOWN",
            "cannot send after transport endpoint shutdown"
        ]
    ],
    [
        -4041,
        [
            "ESPIPE",
            "invalid seek"
        ]
    ],
    [
        -4040,
        [
            "ESRCH",
            "no such process"
        ]
    ],
    [
        -4039,
        [
            "ETIMEDOUT",
            "connection timed out"
        ]
    ],
    [
        -4038,
        [
            "ETXTBSY",
            "text file is busy"
        ]
    ],
    [
        -4037,
        [
            "EXDEV",
            "cross-device link not permitted"
        ]
    ],
    [
        -4094,
        [
            "UNKNOWN",
            "unknown error"
        ]
    ],
    [
        -4095,
        [
            "EOF",
            "end of file"
        ]
    ],
    [
        -4033,
        [
            "ENXIO",
            "no such device or address"
        ]
    ],
    [
        -4032,
        [
            "EMLINK",
            "too many links"
        ]
    ],
    [
        -4031,
        [
            "EHOSTDOWN",
            "host is down"
        ]
    ],
    [
        -4030,
        [
            "EREMOTEIO",
            "remote I/O error"
        ]
    ],
    [
        -4029,
        [
            "ENOTTY",
            "inappropriate ioctl for device"
        ]
    ],
    [
        -4028,
        [
            "EFTYPE",
            "inappropriate file type or format"
        ]
    ],
    [
        -4027,
        [
            "EILSEQ",
            "illegal byte sequence"
        ]
    ], 
];
const darwin = [
    [
        -7,
        [
            "E2BIG",
            "argument list too long"
        ]
    ],
    [
        -13,
        [
            "EACCES",
            "permission denied"
        ]
    ],
    [
        -48,
        [
            "EADDRINUSE",
            "address already in use"
        ]
    ],
    [
        -49,
        [
            "EADDRNOTAVAIL",
            "address not available"
        ]
    ],
    [
        -47,
        [
            "EAFNOSUPPORT",
            "address family not supported"
        ]
    ],
    [
        -35,
        [
            "EAGAIN",
            "resource temporarily unavailable"
        ]
    ],
    [
        -3000,
        [
            "EAI_ADDRFAMILY",
            "address family not supported"
        ]
    ],
    [
        -3001,
        [
            "EAI_AGAIN",
            "temporary failure"
        ]
    ],
    [
        -3002,
        [
            "EAI_BADFLAGS",
            "bad ai_flags value"
        ]
    ],
    [
        -3013,
        [
            "EAI_BADHINTS",
            "invalid value for hints"
        ]
    ],
    [
        -3003,
        [
            "EAI_CANCELED",
            "request canceled"
        ]
    ],
    [
        -3004,
        [
            "EAI_FAIL",
            "permanent failure"
        ]
    ],
    [
        -3005,
        [
            "EAI_FAMILY",
            "ai_family not supported"
        ]
    ],
    [
        -3006,
        [
            "EAI_MEMORY",
            "out of memory"
        ]
    ],
    [
        -3007,
        [
            "EAI_NODATA",
            "no address"
        ]
    ],
    [
        -3008,
        [
            "EAI_NONAME",
            "unknown node or service"
        ]
    ],
    [
        -3009,
        [
            "EAI_OVERFLOW",
            "argument buffer overflow"
        ]
    ],
    [
        -3014,
        [
            "EAI_PROTOCOL",
            "resolved protocol is unknown"
        ]
    ],
    [
        -3010,
        [
            "EAI_SERVICE",
            "service not available for socket type"
        ]
    ],
    [
        -3011,
        [
            "EAI_SOCKTYPE",
            "socket type not supported"
        ]
    ],
    [
        -37,
        [
            "EALREADY",
            "connection already in progress"
        ]
    ],
    [
        -9,
        [
            "EBADF",
            "bad file descriptor"
        ]
    ],
    [
        -16,
        [
            "EBUSY",
            "resource busy or locked"
        ]
    ],
    [
        -89,
        [
            "ECANCELED",
            "operation canceled"
        ]
    ],
    [
        -4080,
        [
            "ECHARSET",
            "invalid Unicode character"
        ]
    ],
    [
        -53,
        [
            "ECONNABORTED",
            "software caused connection abort"
        ]
    ],
    [
        -61,
        [
            "ECONNREFUSED",
            "connection refused"
        ]
    ],
    [
        -54,
        [
            "ECONNRESET",
            "connection reset by peer"
        ]
    ],
    [
        -39,
        [
            "EDESTADDRREQ",
            "destination address required"
        ]
    ],
    [
        -17,
        [
            "EEXIST",
            "file already exists"
        ]
    ],
    [
        -14,
        [
            "EFAULT",
            "bad address in system call argument"
        ]
    ],
    [
        -27,
        [
            "EFBIG",
            "file too large"
        ]
    ],
    [
        -65,
        [
            "EHOSTUNREACH",
            "host is unreachable"
        ]
    ],
    [
        -4,
        [
            "EINTR",
            "interrupted system call"
        ]
    ],
    [
        -22,
        [
            "EINVAL",
            "invalid argument"
        ]
    ],
    [
        -5,
        [
            "EIO",
            "i/o error"
        ]
    ],
    [
        -56,
        [
            "EISCONN",
            "socket is already connected"
        ]
    ],
    [
        -21,
        [
            "EISDIR",
            "illegal operation on a directory"
        ]
    ],
    [
        -62,
        [
            "ELOOP",
            "too many symbolic links encountered"
        ]
    ],
    [
        -24,
        [
            "EMFILE",
            "too many open files"
        ]
    ],
    [
        -40,
        [
            "EMSGSIZE",
            "message too long"
        ]
    ],
    [
        -63,
        [
            "ENAMETOOLONG",
            "name too long"
        ]
    ],
    [
        -50,
        [
            "ENETDOWN",
            "network is down"
        ]
    ],
    [
        -51,
        [
            "ENETUNREACH",
            "network is unreachable"
        ]
    ],
    [
        -23,
        [
            "ENFILE",
            "file table overflow"
        ]
    ],
    [
        -55,
        [
            "ENOBUFS",
            "no buffer space available"
        ]
    ],
    [
        -19,
        [
            "ENODEV",
            "no such device"
        ]
    ],
    [
        -2,
        [
            "ENOENT",
            "no such file or directory"
        ]
    ],
    [
        -12,
        [
            "ENOMEM",
            "not enough memory"
        ]
    ],
    [
        -4056,
        [
            "ENONET",
            "machine is not on the network"
        ]
    ],
    [
        -42,
        [
            "ENOPROTOOPT",
            "protocol not available"
        ]
    ],
    [
        -28,
        [
            "ENOSPC",
            "no space left on device"
        ]
    ],
    [
        -78,
        [
            "ENOSYS",
            "function not implemented"
        ]
    ],
    [
        -57,
        [
            "ENOTCONN",
            "socket is not connected"
        ]
    ],
    [
        -20,
        [
            "ENOTDIR",
            "not a directory"
        ]
    ],
    [
        -66,
        [
            "ENOTEMPTY",
            "directory not empty"
        ]
    ],
    [
        -38,
        [
            "ENOTSOCK",
            "socket operation on non-socket"
        ]
    ],
    [
        -45,
        [
            "ENOTSUP",
            "operation not supported on socket"
        ]
    ],
    [
        -1,
        [
            "EPERM",
            "operation not permitted"
        ]
    ],
    [
        -32,
        [
            "EPIPE",
            "broken pipe"
        ]
    ],
    [
        -100,
        [
            "EPROTO",
            "protocol error"
        ]
    ],
    [
        -43,
        [
            "EPROTONOSUPPORT",
            "protocol not supported"
        ]
    ],
    [
        -41,
        [
            "EPROTOTYPE",
            "protocol wrong type for socket"
        ]
    ],
    [
        -34,
        [
            "ERANGE",
            "result too large"
        ]
    ],
    [
        -30,
        [
            "EROFS",
            "read-only file system"
        ]
    ],
    [
        -58,
        [
            "ESHUTDOWN",
            "cannot send after transport endpoint shutdown"
        ]
    ],
    [
        -29,
        [
            "ESPIPE",
            "invalid seek"
        ]
    ],
    [
        -3,
        [
            "ESRCH",
            "no such process"
        ]
    ],
    [
        -60,
        [
            "ETIMEDOUT",
            "connection timed out"
        ]
    ],
    [
        -26,
        [
            "ETXTBSY",
            "text file is busy"
        ]
    ],
    [
        -18,
        [
            "EXDEV",
            "cross-device link not permitted"
        ]
    ],
    [
        -4094,
        [
            "UNKNOWN",
            "unknown error"
        ]
    ],
    [
        -4095,
        [
            "EOF",
            "end of file"
        ]
    ],
    [
        -6,
        [
            "ENXIO",
            "no such device or address"
        ]
    ],
    [
        -31,
        [
            "EMLINK",
            "too many links"
        ]
    ],
    [
        -64,
        [
            "EHOSTDOWN",
            "host is down"
        ]
    ],
    [
        -4030,
        [
            "EREMOTEIO",
            "remote I/O error"
        ]
    ],
    [
        -25,
        [
            "ENOTTY",
            "inappropriate ioctl for device"
        ]
    ],
    [
        -79,
        [
            "EFTYPE",
            "inappropriate file type or format"
        ]
    ],
    [
        -92,
        [
            "EILSEQ",
            "illegal byte sequence"
        ]
    ], 
];
const linux = [
    [
        -7,
        [
            "E2BIG",
            "argument list too long"
        ]
    ],
    [
        -13,
        [
            "EACCES",
            "permission denied"
        ]
    ],
    [
        -98,
        [
            "EADDRINUSE",
            "address already in use"
        ]
    ],
    [
        -99,
        [
            "EADDRNOTAVAIL",
            "address not available"
        ]
    ],
    [
        -97,
        [
            "EAFNOSUPPORT",
            "address family not supported"
        ]
    ],
    [
        -11,
        [
            "EAGAIN",
            "resource temporarily unavailable"
        ]
    ],
    [
        -3000,
        [
            "EAI_ADDRFAMILY",
            "address family not supported"
        ]
    ],
    [
        -3001,
        [
            "EAI_AGAIN",
            "temporary failure"
        ]
    ],
    [
        -3002,
        [
            "EAI_BADFLAGS",
            "bad ai_flags value"
        ]
    ],
    [
        -3013,
        [
            "EAI_BADHINTS",
            "invalid value for hints"
        ]
    ],
    [
        -3003,
        [
            "EAI_CANCELED",
            "request canceled"
        ]
    ],
    [
        -3004,
        [
            "EAI_FAIL",
            "permanent failure"
        ]
    ],
    [
        -3005,
        [
            "EAI_FAMILY",
            "ai_family not supported"
        ]
    ],
    [
        -3006,
        [
            "EAI_MEMORY",
            "out of memory"
        ]
    ],
    [
        -3007,
        [
            "EAI_NODATA",
            "no address"
        ]
    ],
    [
        -3008,
        [
            "EAI_NONAME",
            "unknown node or service"
        ]
    ],
    [
        -3009,
        [
            "EAI_OVERFLOW",
            "argument buffer overflow"
        ]
    ],
    [
        -3014,
        [
            "EAI_PROTOCOL",
            "resolved protocol is unknown"
        ]
    ],
    [
        -3010,
        [
            "EAI_SERVICE",
            "service not available for socket type"
        ]
    ],
    [
        -3011,
        [
            "EAI_SOCKTYPE",
            "socket type not supported"
        ]
    ],
    [
        -114,
        [
            "EALREADY",
            "connection already in progress"
        ]
    ],
    [
        -9,
        [
            "EBADF",
            "bad file descriptor"
        ]
    ],
    [
        -16,
        [
            "EBUSY",
            "resource busy or locked"
        ]
    ],
    [
        -125,
        [
            "ECANCELED",
            "operation canceled"
        ]
    ],
    [
        -4080,
        [
            "ECHARSET",
            "invalid Unicode character"
        ]
    ],
    [
        -103,
        [
            "ECONNABORTED",
            "software caused connection abort"
        ]
    ],
    [
        -111,
        [
            "ECONNREFUSED",
            "connection refused"
        ]
    ],
    [
        -104,
        [
            "ECONNRESET",
            "connection reset by peer"
        ]
    ],
    [
        -89,
        [
            "EDESTADDRREQ",
            "destination address required"
        ]
    ],
    [
        -17,
        [
            "EEXIST",
            "file already exists"
        ]
    ],
    [
        -14,
        [
            "EFAULT",
            "bad address in system call argument"
        ]
    ],
    [
        -27,
        [
            "EFBIG",
            "file too large"
        ]
    ],
    [
        -113,
        [
            "EHOSTUNREACH",
            "host is unreachable"
        ]
    ],
    [
        -4,
        [
            "EINTR",
            "interrupted system call"
        ]
    ],
    [
        -22,
        [
            "EINVAL",
            "invalid argument"
        ]
    ],
    [
        -5,
        [
            "EIO",
            "i/o error"
        ]
    ],
    [
        -106,
        [
            "EISCONN",
            "socket is already connected"
        ]
    ],
    [
        -21,
        [
            "EISDIR",
            "illegal operation on a directory"
        ]
    ],
    [
        -40,
        [
            "ELOOP",
            "too many symbolic links encountered"
        ]
    ],
    [
        -24,
        [
            "EMFILE",
            "too many open files"
        ]
    ],
    [
        -90,
        [
            "EMSGSIZE",
            "message too long"
        ]
    ],
    [
        -36,
        [
            "ENAMETOOLONG",
            "name too long"
        ]
    ],
    [
        -100,
        [
            "ENETDOWN",
            "network is down"
        ]
    ],
    [
        -101,
        [
            "ENETUNREACH",
            "network is unreachable"
        ]
    ],
    [
        -23,
        [
            "ENFILE",
            "file table overflow"
        ]
    ],
    [
        -105,
        [
            "ENOBUFS",
            "no buffer space available"
        ]
    ],
    [
        -19,
        [
            "ENODEV",
            "no such device"
        ]
    ],
    [
        -2,
        [
            "ENOENT",
            "no such file or directory"
        ]
    ],
    [
        -12,
        [
            "ENOMEM",
            "not enough memory"
        ]
    ],
    [
        -64,
        [
            "ENONET",
            "machine is not on the network"
        ]
    ],
    [
        -92,
        [
            "ENOPROTOOPT",
            "protocol not available"
        ]
    ],
    [
        -28,
        [
            "ENOSPC",
            "no space left on device"
        ]
    ],
    [
        -38,
        [
            "ENOSYS",
            "function not implemented"
        ]
    ],
    [
        -107,
        [
            "ENOTCONN",
            "socket is not connected"
        ]
    ],
    [
        -20,
        [
            "ENOTDIR",
            "not a directory"
        ]
    ],
    [
        -39,
        [
            "ENOTEMPTY",
            "directory not empty"
        ]
    ],
    [
        -88,
        [
            "ENOTSOCK",
            "socket operation on non-socket"
        ]
    ],
    [
        -95,
        [
            "ENOTSUP",
            "operation not supported on socket"
        ]
    ],
    [
        -1,
        [
            "EPERM",
            "operation not permitted"
        ]
    ],
    [
        -32,
        [
            "EPIPE",
            "broken pipe"
        ]
    ],
    [
        -71,
        [
            "EPROTO",
            "protocol error"
        ]
    ],
    [
        -93,
        [
            "EPROTONOSUPPORT",
            "protocol not supported"
        ]
    ],
    [
        -91,
        [
            "EPROTOTYPE",
            "protocol wrong type for socket"
        ]
    ],
    [
        -34,
        [
            "ERANGE",
            "result too large"
        ]
    ],
    [
        -30,
        [
            "EROFS",
            "read-only file system"
        ]
    ],
    [
        -108,
        [
            "ESHUTDOWN",
            "cannot send after transport endpoint shutdown"
        ]
    ],
    [
        -29,
        [
            "ESPIPE",
            "invalid seek"
        ]
    ],
    [
        -3,
        [
            "ESRCH",
            "no such process"
        ]
    ],
    [
        -110,
        [
            "ETIMEDOUT",
            "connection timed out"
        ]
    ],
    [
        -26,
        [
            "ETXTBSY",
            "text file is busy"
        ]
    ],
    [
        -18,
        [
            "EXDEV",
            "cross-device link not permitted"
        ]
    ],
    [
        -4094,
        [
            "UNKNOWN",
            "unknown error"
        ]
    ],
    [
        -4095,
        [
            "EOF",
            "end of file"
        ]
    ],
    [
        -6,
        [
            "ENXIO",
            "no such device or address"
        ]
    ],
    [
        -31,
        [
            "EMLINK",
            "too many links"
        ]
    ],
    [
        -112,
        [
            "EHOSTDOWN",
            "host is down"
        ]
    ],
    [
        -121,
        [
            "EREMOTEIO",
            "remote I/O error"
        ]
    ],
    [
        -25,
        [
            "ENOTTY",
            "inappropriate ioctl for device"
        ]
    ],
    [
        -4028,
        [
            "EFTYPE",
            "inappropriate file type or format"
        ]
    ],
    [
        -84,
        [
            "EILSEQ",
            "illegal byte sequence"
        ]
    ], 
];
const { os  } = Deno.build;
const errorMap = new Map(os === "windows" ? windows : os === "darwin" ? darwin : os === "linux" ? linux : unreachable());
class ERR_ENCODING_NOT_SUPPORTED extends NodeRangeError {
    constructor(x19){
        super("ERR_ENCODING_NOT_SUPPORTED", `The "${x19}" encoding is not supported`);
    }
}
class ERR_EVAL_ESM_CANNOT_PRINT extends NodeError {
    constructor(){
        super("ERR_EVAL_ESM_CANNOT_PRINT", `--print cannot be used with ESM input`);
    }
}
class ERR_EVENT_RECURSION extends NodeError {
    constructor(x20){
        super("ERR_EVENT_RECURSION", `The event "${x20}" is already being dispatched`);
    }
}
class ERR_FEATURE_UNAVAILABLE_ON_PLATFORM extends NodeTypeError {
    constructor(x21){
        super("ERR_FEATURE_UNAVAILABLE_ON_PLATFORM", `The feature ${x21} is unavailable on the current platform, which is being used to run Node.js`);
    }
}
class ERR_FS_FILE_TOO_LARGE extends NodeRangeError {
    constructor(x22){
        super("ERR_FS_FILE_TOO_LARGE", `File size (${x22}) is greater than 2 GB`);
    }
}
class ERR_FS_INVALID_SYMLINK_TYPE extends NodeError {
    constructor(x23){
        super("ERR_FS_INVALID_SYMLINK_TYPE", `Symlink type must be one of "dir", "file", or "junction". Received "${x23}"`);
    }
}
class ERR_HTTP2_ALTSVC_INVALID_ORIGIN extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_ALTSVC_INVALID_ORIGIN", `HTTP/2 ALTSVC frames require a valid origin`);
    }
}
class ERR_HTTP2_ALTSVC_LENGTH extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_ALTSVC_LENGTH", `HTTP/2 ALTSVC frames are limited to 16382 bytes`);
    }
}
class ERR_HTTP2_CONNECT_AUTHORITY extends NodeError {
    constructor(){
        super("ERR_HTTP2_CONNECT_AUTHORITY", `:authority header is required for CONNECT requests`);
    }
}
class ERR_HTTP2_CONNECT_PATH extends NodeError {
    constructor(){
        super("ERR_HTTP2_CONNECT_PATH", `The :path header is forbidden for CONNECT requests`);
    }
}
class ERR_HTTP2_CONNECT_SCHEME extends NodeError {
    constructor(){
        super("ERR_HTTP2_CONNECT_SCHEME", `The :scheme header is forbidden for CONNECT requests`);
    }
}
class ERR_HTTP2_GOAWAY_SESSION extends NodeError {
    constructor(){
        super("ERR_HTTP2_GOAWAY_SESSION", `New streams cannot be created after receiving a GOAWAY`);
    }
}
class ERR_HTTP2_HEADERS_AFTER_RESPOND extends NodeError {
    constructor(){
        super("ERR_HTTP2_HEADERS_AFTER_RESPOND", `Cannot specify additional headers after response initiated`);
    }
}
class ERR_HTTP2_HEADERS_SENT extends NodeError {
    constructor(){
        super("ERR_HTTP2_HEADERS_SENT", `Response has already been initiated.`);
    }
}
class ERR_HTTP2_HEADER_SINGLE_VALUE extends NodeTypeError {
    constructor(x24){
        super("ERR_HTTP2_HEADER_SINGLE_VALUE", `Header field "${x24}" must only have a single value`);
    }
}
class ERR_HTTP2_INFO_STATUS_NOT_ALLOWED extends NodeRangeError {
    constructor(){
        super("ERR_HTTP2_INFO_STATUS_NOT_ALLOWED", `Informational status codes cannot be used`);
    }
}
class ERR_HTTP2_INVALID_CONNECTION_HEADERS extends NodeTypeError {
    constructor(x25){
        super("ERR_HTTP2_INVALID_CONNECTION_HEADERS", `HTTP/1 Connection specific headers are forbidden: "${x25}"`);
    }
}
class ERR_HTTP2_INVALID_HEADER_VALUE extends NodeTypeError {
    constructor(x26, y5){
        super("ERR_HTTP2_INVALID_HEADER_VALUE", `Invalid value "${x26}" for header "${y5}"`);
    }
}
class ERR_HTTP2_INVALID_INFO_STATUS extends NodeRangeError {
    constructor(x27){
        super("ERR_HTTP2_INVALID_INFO_STATUS", `Invalid informational status code: ${x27}`);
    }
}
class ERR_HTTP2_INVALID_ORIGIN extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_INVALID_ORIGIN", `HTTP/2 ORIGIN frames require a valid origin`);
    }
}
class ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH extends NodeRangeError {
    constructor(){
        super("ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH", `Packed settings length must be a multiple of six`);
    }
}
class ERR_HTTP2_INVALID_PSEUDOHEADER extends NodeTypeError {
    constructor(x28){
        super("ERR_HTTP2_INVALID_PSEUDOHEADER", `"${x28}" is an invalid pseudoheader or is used incorrectly`);
    }
}
class ERR_HTTP2_INVALID_SESSION extends NodeError {
    constructor(){
        super("ERR_HTTP2_INVALID_SESSION", `The session has been destroyed`);
    }
}
class ERR_HTTP2_INVALID_STREAM extends NodeError {
    constructor(){
        super("ERR_HTTP2_INVALID_STREAM", `The stream has been destroyed`);
    }
}
class ERR_HTTP2_MAX_PENDING_SETTINGS_ACK extends NodeError {
    constructor(){
        super("ERR_HTTP2_MAX_PENDING_SETTINGS_ACK", `Maximum number of pending settings acknowledgements`);
    }
}
class ERR_HTTP2_NESTED_PUSH extends NodeError {
    constructor(){
        super("ERR_HTTP2_NESTED_PUSH", `A push stream cannot initiate another push stream.`);
    }
}
class ERR_HTTP2_NO_SOCKET_MANIPULATION extends NodeError {
    constructor(){
        super("ERR_HTTP2_NO_SOCKET_MANIPULATION", `HTTP/2 sockets should not be directly manipulated (e.g. read and written)`);
    }
}
class ERR_HTTP2_ORIGIN_LENGTH extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_ORIGIN_LENGTH", `HTTP/2 ORIGIN frames are limited to 16382 bytes`);
    }
}
class ERR_HTTP2_OUT_OF_STREAMS extends NodeError {
    constructor(){
        super("ERR_HTTP2_OUT_OF_STREAMS", `No stream ID is available because maximum stream ID has been reached`);
    }
}
class ERR_HTTP2_PAYLOAD_FORBIDDEN extends NodeError {
    constructor(x29){
        super("ERR_HTTP2_PAYLOAD_FORBIDDEN", `Responses with ${x29} status must not have a payload`);
    }
}
class ERR_HTTP2_PING_CANCEL extends NodeError {
    constructor(){
        super("ERR_HTTP2_PING_CANCEL", `HTTP2 ping cancelled`);
    }
}
class ERR_HTTP2_PING_LENGTH extends NodeRangeError {
    constructor(){
        super("ERR_HTTP2_PING_LENGTH", `HTTP2 ping payload must be 8 bytes`);
    }
}
class ERR_HTTP2_PSEUDOHEADER_NOT_ALLOWED extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_PSEUDOHEADER_NOT_ALLOWED", `Cannot set HTTP/2 pseudo-headers`);
    }
}
class ERR_HTTP2_PUSH_DISABLED extends NodeError {
    constructor(){
        super("ERR_HTTP2_PUSH_DISABLED", `HTTP/2 client has disabled push streams`);
    }
}
class ERR_HTTP2_SEND_FILE extends NodeError {
    constructor(){
        super("ERR_HTTP2_SEND_FILE", `Directories cannot be sent`);
    }
}
class ERR_HTTP2_SEND_FILE_NOSEEK extends NodeError {
    constructor(){
        super("ERR_HTTP2_SEND_FILE_NOSEEK", `Offset or length can only be specified for regular files`);
    }
}
class ERR_HTTP2_SESSION_ERROR extends NodeError {
    constructor(x30){
        super("ERR_HTTP2_SESSION_ERROR", `Session closed with error code ${x30}`);
    }
}
class ERR_HTTP2_SETTINGS_CANCEL extends NodeError {
    constructor(){
        super("ERR_HTTP2_SETTINGS_CANCEL", `HTTP2 session settings canceled`);
    }
}
class ERR_HTTP2_SOCKET_BOUND extends NodeError {
    constructor(){
        super("ERR_HTTP2_SOCKET_BOUND", `The socket is already bound to an Http2Session`);
    }
}
class ERR_HTTP2_SOCKET_UNBOUND extends NodeError {
    constructor(){
        super("ERR_HTTP2_SOCKET_UNBOUND", `The socket has been disconnected from the Http2Session`);
    }
}
class ERR_HTTP2_STATUS_101 extends NodeError {
    constructor(){
        super("ERR_HTTP2_STATUS_101", `HTTP status code 101 (Switching Protocols) is forbidden in HTTP/2`);
    }
}
class ERR_HTTP2_STATUS_INVALID extends NodeRangeError {
    constructor(x31){
        super("ERR_HTTP2_STATUS_INVALID", `Invalid status code: ${x31}`);
    }
}
class ERR_HTTP2_STREAM_ERROR extends NodeError {
    constructor(x32){
        super("ERR_HTTP2_STREAM_ERROR", `Stream closed with error code ${x32}`);
    }
}
class ERR_HTTP2_STREAM_SELF_DEPENDENCY extends NodeError {
    constructor(){
        super("ERR_HTTP2_STREAM_SELF_DEPENDENCY", `A stream cannot depend on itself`);
    }
}
class ERR_HTTP2_TRAILERS_ALREADY_SENT extends NodeError {
    constructor(){
        super("ERR_HTTP2_TRAILERS_ALREADY_SENT", `Trailing headers have already been sent`);
    }
}
class ERR_HTTP2_TRAILERS_NOT_READY extends NodeError {
    constructor(){
        super("ERR_HTTP2_TRAILERS_NOT_READY", `Trailing headers cannot be sent until after the wantTrailers event is emitted`);
    }
}
class ERR_HTTP2_UNSUPPORTED_PROTOCOL extends NodeError {
    constructor(x33){
        super("ERR_HTTP2_UNSUPPORTED_PROTOCOL", `protocol "${x33}" is unsupported.`);
    }
}
class ERR_HTTP_HEADERS_SENT extends NodeError {
    constructor(x34){
        super("ERR_HTTP_HEADERS_SENT", `Cannot ${x34} headers after they are sent to the client`);
    }
}
class ERR_HTTP_INVALID_HEADER_VALUE extends NodeTypeError {
    constructor(x35, y6){
        super("ERR_HTTP_INVALID_HEADER_VALUE", `Invalid value "${x35}" for header "${y6}"`);
    }
}
class ERR_HTTP_INVALID_STATUS_CODE extends NodeRangeError {
    constructor(x36){
        super("ERR_HTTP_INVALID_STATUS_CODE", `Invalid status code: ${x36}`);
    }
}
class ERR_HTTP_SOCKET_ENCODING extends NodeError {
    constructor(){
        super("ERR_HTTP_SOCKET_ENCODING", `Changing the socket encoding is not allowed per RFC7230 Section 3.`);
    }
}
class ERR_HTTP_TRAILER_INVALID extends NodeError {
    constructor(){
        super("ERR_HTTP_TRAILER_INVALID", `Trailers are invalid with this transfer encoding`);
    }
}
class ERR_INCOMPATIBLE_OPTION_PAIR extends NodeTypeError {
    constructor(x37, y7){
        super("ERR_INCOMPATIBLE_OPTION_PAIR", `Option "${x37}" cannot be used in combination with option "${y7}"`);
    }
}
class ERR_INPUT_TYPE_NOT_ALLOWED extends NodeError {
    constructor(){
        super("ERR_INPUT_TYPE_NOT_ALLOWED", `--input-type can only be used with string input via --eval, --print, or STDIN`);
    }
}
class ERR_INSPECTOR_ALREADY_ACTIVATED extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_ALREADY_ACTIVATED", `Inspector is already activated. Close it with inspector.close() before activating it again.`);
    }
}
class ERR_INSPECTOR_ALREADY_CONNECTED extends NodeError {
    constructor(x38){
        super("ERR_INSPECTOR_ALREADY_CONNECTED", `${x38} is already connected`);
    }
}
class ERR_INSPECTOR_CLOSED extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_CLOSED", `Session was closed`);
    }
}
class ERR_INSPECTOR_COMMAND extends NodeError {
    constructor(x39, y8){
        super("ERR_INSPECTOR_COMMAND", `Inspector error ${x39}: ${y8}`);
    }
}
class ERR_INSPECTOR_NOT_ACTIVE extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_NOT_ACTIVE", `Inspector is not active`);
    }
}
class ERR_INSPECTOR_NOT_AVAILABLE extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_NOT_AVAILABLE", `Inspector is not available`);
    }
}
class ERR_INSPECTOR_NOT_CONNECTED extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_NOT_CONNECTED", `Session is not connected`);
    }
}
class ERR_INSPECTOR_NOT_WORKER extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_NOT_WORKER", `Current thread is not a worker`);
    }
}
class ERR_INVALID_ASYNC_ID extends NodeRangeError {
    constructor(x40, y9){
        super("ERR_INVALID_ASYNC_ID", `Invalid ${x40} value: ${y9}`);
    }
}
class ERR_INVALID_BUFFER_SIZE extends NodeRangeError {
    constructor(x41){
        super("ERR_INVALID_BUFFER_SIZE", `Buffer size must be a multiple of ${x41}`);
    }
}
class ERR_INVALID_CALLBACK extends NodeTypeError {
    constructor(object){
        super("ERR_INVALID_CALLBACK", `Callback must be a function. Received ${JSON.stringify(object)}`);
    }
}
class ERR_INVALID_CURSOR_POS extends NodeTypeError {
    constructor(){
        super("ERR_INVALID_CURSOR_POS", `Cannot set cursor row without setting its column`);
    }
}
class ERR_INVALID_FD extends NodeRangeError {
    constructor(x42){
        super("ERR_INVALID_FD", `"fd" must be a positive integer: ${x42}`);
    }
}
class ERR_INVALID_FD_TYPE extends NodeTypeError {
    constructor(x43){
        super("ERR_INVALID_FD_TYPE", `Unsupported fd type: ${x43}`);
    }
}
class ERR_INVALID_FILE_URL_HOST extends NodeTypeError {
    constructor(x44){
        super("ERR_INVALID_FILE_URL_HOST", `File URL host must be "localhost" or empty on ${x44}`);
    }
}
class ERR_INVALID_FILE_URL_PATH extends NodeTypeError {
    constructor(x45){
        super("ERR_INVALID_FILE_URL_PATH", `File URL path ${x45}`);
    }
}
class ERR_INVALID_HANDLE_TYPE extends NodeTypeError {
    constructor(){
        super("ERR_INVALID_HANDLE_TYPE", `This handle type cannot be sent`);
    }
}
class ERR_INVALID_HTTP_TOKEN extends NodeTypeError {
    constructor(x46, y10){
        super("ERR_INVALID_HTTP_TOKEN", `${x46} must be a valid HTTP token ["${y10}"]`);
    }
}
class ERR_INVALID_IP_ADDRESS extends NodeTypeError {
    constructor(x47){
        super("ERR_INVALID_IP_ADDRESS", `Invalid IP address: ${x47}`);
    }
}
class ERR_INVALID_OPT_VALUE_ENCODING extends NodeTypeError {
    constructor(x48){
        super("ERR_INVALID_OPT_VALUE_ENCODING", `The value "${x48}" is invalid for option "encoding"`);
    }
}
class ERR_INVALID_PERFORMANCE_MARK extends NodeError {
    constructor(x49){
        super("ERR_INVALID_PERFORMANCE_MARK", `The "${x49}" performance mark has not been set`);
    }
}
class ERR_INVALID_PROTOCOL extends NodeTypeError {
    constructor(x50, y11){
        super("ERR_INVALID_PROTOCOL", `Protocol "${x50}" not supported. Expected "${y11}"`);
    }
}
class ERR_INVALID_REPL_EVAL_CONFIG extends NodeTypeError {
    constructor(){
        super("ERR_INVALID_REPL_EVAL_CONFIG", `Cannot specify both "breakEvalOnSigint" and "eval" for REPL`);
    }
}
class ERR_INVALID_REPL_INPUT extends NodeTypeError {
    constructor(x51){
        super("ERR_INVALID_REPL_INPUT", `${x51}`);
    }
}
class ERR_INVALID_SYNC_FORK_INPUT extends NodeTypeError {
    constructor(x52){
        super("ERR_INVALID_SYNC_FORK_INPUT", `Asynchronous forks do not support Buffer, TypedArray, DataView or string input: ${x52}`);
    }
}
class ERR_INVALID_THIS extends NodeTypeError {
    constructor(x53){
        super("ERR_INVALID_THIS", `Value of "this" must be of type ${x53}`);
    }
}
class ERR_INVALID_TUPLE extends NodeTypeError {
    constructor(x54, y12){
        super("ERR_INVALID_TUPLE", `${x54} must be an iterable ${y12} tuple`);
    }
}
class ERR_INVALID_URI extends NodeURIError {
    constructor(){
        super("ERR_INVALID_URI", `URI malformed`);
    }
}
class ERR_IPC_CHANNEL_CLOSED extends NodeError {
    constructor(){
        super("ERR_IPC_CHANNEL_CLOSED", `Channel closed`);
    }
}
class ERR_IPC_DISCONNECTED extends NodeError {
    constructor(){
        super("ERR_IPC_DISCONNECTED", `IPC channel is already disconnected`);
    }
}
class ERR_IPC_ONE_PIPE extends NodeError {
    constructor(){
        super("ERR_IPC_ONE_PIPE", `Child process can have only one IPC pipe`);
    }
}
class ERR_IPC_SYNC_FORK extends NodeError {
    constructor(){
        super("ERR_IPC_SYNC_FORK", `IPC cannot be used with synchronous forks`);
    }
}
class ERR_MANIFEST_DEPENDENCY_MISSING extends NodeError {
    constructor(x55, y13){
        super("ERR_MANIFEST_DEPENDENCY_MISSING", `Manifest resource ${x55} does not list ${y13} as a dependency specifier`);
    }
}
class ERR_MANIFEST_INTEGRITY_MISMATCH extends NodeSyntaxError {
    constructor(x56){
        super("ERR_MANIFEST_INTEGRITY_MISMATCH", `Manifest resource ${x56} has multiple entries but integrity lists do not match`);
    }
}
class ERR_MANIFEST_INVALID_RESOURCE_FIELD extends NodeTypeError {
    constructor(x57, y14){
        super("ERR_MANIFEST_INVALID_RESOURCE_FIELD", `Manifest resource ${x57} has invalid property value for ${y14}`);
    }
}
class ERR_MANIFEST_TDZ extends NodeError {
    constructor(){
        super("ERR_MANIFEST_TDZ", `Manifest initialization has not yet run`);
    }
}
class ERR_MANIFEST_UNKNOWN_ONERROR extends NodeSyntaxError {
    constructor(x58){
        super("ERR_MANIFEST_UNKNOWN_ONERROR", `Manifest specified unknown error behavior "${x58}".`);
    }
}
class ERR_METHOD_NOT_IMPLEMENTED extends NodeError {
    constructor(x59){
        super("ERR_METHOD_NOT_IMPLEMENTED", `The ${x59} method is not implemented`);
    }
}
class ERR_MISSING_ARGS extends NodeTypeError {
    constructor(...args1){
        args1 = args1.map((a)=>`"${a}"`
        );
        let msg1 = "The ";
        switch(args1.length){
            case 1:
                msg1 += `${args1[0]} argument`;
                break;
            case 2:
                msg1 += `${args1[0]} and ${args1[1]} arguments`;
                break;
            default:
                msg1 += args1.slice(0, args1.length - 1).join(", ");
                msg1 += `, and ${args1[args1.length - 1]} arguments`;
                break;
        }
        super("ERR_MISSING_ARGS", `${msg1} must be specified`);
    }
}
class ERR_MISSING_OPTION extends NodeTypeError {
    constructor(x60){
        super("ERR_MISSING_OPTION", `${x60} is required`);
    }
}
class ERR_MULTIPLE_CALLBACK extends NodeError {
    constructor(){
        super("ERR_MULTIPLE_CALLBACK", `Callback called multiple times`);
    }
}
class ERR_NAPI_CONS_FUNCTION extends NodeTypeError {
    constructor(){
        super("ERR_NAPI_CONS_FUNCTION", `Constructor must be a function`);
    }
}
class ERR_NAPI_INVALID_DATAVIEW_ARGS extends NodeRangeError {
    constructor(){
        super("ERR_NAPI_INVALID_DATAVIEW_ARGS", `byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in`);
    }
}
class ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT extends NodeRangeError {
    constructor(x61, y15){
        super("ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT", `start offset of ${x61} should be a multiple of ${y15}`);
    }
}
class ERR_NAPI_INVALID_TYPEDARRAY_LENGTH extends NodeRangeError {
    constructor(){
        super("ERR_NAPI_INVALID_TYPEDARRAY_LENGTH", `Invalid typed array length`);
    }
}
class ERR_NO_CRYPTO extends NodeError {
    constructor(){
        super("ERR_NO_CRYPTO", `Node.js is not compiled with OpenSSL crypto support`);
    }
}
class ERR_NO_ICU extends NodeTypeError {
    constructor(x62){
        super("ERR_NO_ICU", `${x62} is not supported on Node.js compiled without ICU`);
    }
}
class ERR_QUICCLIENTSESSION_FAILED extends NodeError {
    constructor(x63){
        super("ERR_QUICCLIENTSESSION_FAILED", `Failed to create a new QuicClientSession: ${x63}`);
    }
}
class ERR_QUICCLIENTSESSION_FAILED_SETSOCKET extends NodeError {
    constructor(){
        super("ERR_QUICCLIENTSESSION_FAILED_SETSOCKET", `Failed to set the QuicSocket`);
    }
}
class ERR_QUICSESSION_DESTROYED extends NodeError {
    constructor(x64){
        super("ERR_QUICSESSION_DESTROYED", `Cannot call ${x64} after a QuicSession has been destroyed`);
    }
}
class ERR_QUICSESSION_INVALID_DCID extends NodeError {
    constructor(x65){
        super("ERR_QUICSESSION_INVALID_DCID", `Invalid DCID value: ${x65}`);
    }
}
class ERR_QUICSESSION_UPDATEKEY extends NodeError {
    constructor(){
        super("ERR_QUICSESSION_UPDATEKEY", `Unable to update QuicSession keys`);
    }
}
class ERR_QUICSOCKET_DESTROYED extends NodeError {
    constructor(x66){
        super("ERR_QUICSOCKET_DESTROYED", `Cannot call ${x66} after a QuicSocket has been destroyed`);
    }
}
class ERR_QUICSOCKET_INVALID_STATELESS_RESET_SECRET_LENGTH extends NodeError {
    constructor(){
        super("ERR_QUICSOCKET_INVALID_STATELESS_RESET_SECRET_LENGTH", `The stateResetToken must be exactly 16-bytes in length`);
    }
}
class ERR_QUICSOCKET_LISTENING extends NodeError {
    constructor(){
        super("ERR_QUICSOCKET_LISTENING", `This QuicSocket is already listening`);
    }
}
class ERR_QUICSOCKET_UNBOUND extends NodeError {
    constructor(x67){
        super("ERR_QUICSOCKET_UNBOUND", `Cannot call ${x67} before a QuicSocket has been bound`);
    }
}
class ERR_QUICSTREAM_DESTROYED extends NodeError {
    constructor(x68){
        super("ERR_QUICSTREAM_DESTROYED", `Cannot call ${x68} after a QuicStream has been destroyed`);
    }
}
class ERR_QUICSTREAM_INVALID_PUSH extends NodeError {
    constructor(){
        super("ERR_QUICSTREAM_INVALID_PUSH", `Push streams are only supported on client-initiated, bidirectional streams`);
    }
}
class ERR_QUICSTREAM_OPEN_FAILED extends NodeError {
    constructor(){
        super("ERR_QUICSTREAM_OPEN_FAILED", `Opening a new QuicStream failed`);
    }
}
class ERR_QUICSTREAM_UNSUPPORTED_PUSH extends NodeError {
    constructor(){
        super("ERR_QUICSTREAM_UNSUPPORTED_PUSH", `Push streams are not supported on this QuicSession`);
    }
}
class ERR_QUIC_TLS13_REQUIRED extends NodeError {
    constructor(){
        super("ERR_QUIC_TLS13_REQUIRED", `QUIC requires TLS version 1.3`);
    }
}
class ERR_SCRIPT_EXECUTION_INTERRUPTED extends NodeError {
    constructor(){
        super("ERR_SCRIPT_EXECUTION_INTERRUPTED", "Script execution was interrupted by `SIGINT`");
    }
}
class ERR_SERVER_ALREADY_LISTEN extends NodeError {
    constructor(){
        super("ERR_SERVER_ALREADY_LISTEN", `Listen method has been called more than once without closing.`);
    }
}
class ERR_SERVER_NOT_RUNNING extends NodeError {
    constructor(){
        super("ERR_SERVER_NOT_RUNNING", `Server is not running.`);
    }
}
class ERR_SOCKET_ALREADY_BOUND extends NodeError {
    constructor(){
        super("ERR_SOCKET_ALREADY_BOUND", `Socket is already bound`);
    }
}
class ERR_SOCKET_BAD_BUFFER_SIZE extends NodeTypeError {
    constructor(){
        super("ERR_SOCKET_BAD_BUFFER_SIZE", `Buffer size must be a positive integer`);
    }
}
class ERR_SOCKET_BAD_TYPE extends NodeTypeError {
    constructor(){
        super("ERR_SOCKET_BAD_TYPE", `Bad socket type specified. Valid types are: udp4, udp6`);
    }
}
class ERR_SOCKET_CLOSED extends NodeError {
    constructor(){
        super("ERR_SOCKET_CLOSED", `Socket is closed`);
    }
}
class ERR_SOCKET_DGRAM_IS_CONNECTED extends NodeError {
    constructor(){
        super("ERR_SOCKET_DGRAM_IS_CONNECTED", `Already connected`);
    }
}
class ERR_SOCKET_DGRAM_NOT_CONNECTED extends NodeError {
    constructor(){
        super("ERR_SOCKET_DGRAM_NOT_CONNECTED", `Not connected`);
    }
}
class ERR_SOCKET_DGRAM_NOT_RUNNING extends NodeError {
    constructor(){
        super("ERR_SOCKET_DGRAM_NOT_RUNNING", `Not running`);
    }
}
class ERR_SRI_PARSE extends NodeSyntaxError {
    constructor(name5, __char, position){
        super("ERR_SRI_PARSE", `Subresource Integrity string ${name5} had an unexpected ${__char} at position ${position}`);
    }
}
class ERR_STREAM_ALREADY_FINISHED extends NodeError {
    constructor(x69){
        super("ERR_STREAM_ALREADY_FINISHED", `Cannot call ${x69} after a stream was finished`);
    }
}
class ERR_STREAM_CANNOT_PIPE extends NodeError {
    constructor(){
        super("ERR_STREAM_CANNOT_PIPE", `Cannot pipe, not readable`);
    }
}
class ERR_STREAM_DESTROYED extends NodeError {
    constructor(x70){
        super("ERR_STREAM_DESTROYED", `Cannot call ${x70} after a stream was destroyed`);
    }
}
class ERR_STREAM_NULL_VALUES extends NodeTypeError {
    constructor(){
        super("ERR_STREAM_NULL_VALUES", `May not write null values to stream`);
    }
}
class ERR_STREAM_PREMATURE_CLOSE extends NodeError {
    constructor(){
        super("ERR_STREAM_PREMATURE_CLOSE", `Premature close`);
    }
}
class ERR_STREAM_PUSH_AFTER_EOF extends NodeError {
    constructor(){
        super("ERR_STREAM_PUSH_AFTER_EOF", `stream.push() after EOF`);
    }
}
class ERR_STREAM_UNSHIFT_AFTER_END_EVENT extends NodeError {
    constructor(){
        super("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", `stream.unshift() after end event`);
    }
}
class ERR_STREAM_WRAP extends NodeError {
    constructor(){
        super("ERR_STREAM_WRAP", `Stream has StringDecoder set or is in objectMode`);
    }
}
class ERR_STREAM_WRITE_AFTER_END extends NodeError {
    constructor(){
        super("ERR_STREAM_WRITE_AFTER_END", `write after end`);
    }
}
class ERR_SYNTHETIC extends NodeError {
    constructor(){
        super("ERR_SYNTHETIC", `JavaScript Callstack`);
    }
}
class ERR_TLS_DH_PARAM_SIZE extends NodeError {
    constructor(x71){
        super("ERR_TLS_DH_PARAM_SIZE", `DH parameter size ${x71} is less than 2048`);
    }
}
class ERR_TLS_HANDSHAKE_TIMEOUT extends NodeError {
    constructor(){
        super("ERR_TLS_HANDSHAKE_TIMEOUT", `TLS handshake timeout`);
    }
}
class ERR_TLS_INVALID_CONTEXT extends NodeTypeError {
    constructor(x72){
        super("ERR_TLS_INVALID_CONTEXT", `${x72} must be a SecureContext`);
    }
}
class ERR_TLS_INVALID_STATE extends NodeError {
    constructor(){
        super("ERR_TLS_INVALID_STATE", `TLS socket connection must be securely established`);
    }
}
class ERR_TLS_INVALID_PROTOCOL_VERSION extends NodeTypeError {
    constructor(protocol, x73){
        super("ERR_TLS_INVALID_PROTOCOL_VERSION", `${protocol} is not a valid ${x73} TLS protocol version`);
    }
}
class ERR_TLS_PROTOCOL_VERSION_CONFLICT extends NodeTypeError {
    constructor(prevProtocol, protocol1){
        super("ERR_TLS_PROTOCOL_VERSION_CONFLICT", `TLS protocol version ${prevProtocol} conflicts with secureProtocol ${protocol1}`);
    }
}
class ERR_TLS_RENEGOTIATION_DISABLED extends NodeError {
    constructor(){
        super("ERR_TLS_RENEGOTIATION_DISABLED", `TLS session renegotiation disabled for this socket`);
    }
}
class ERR_TLS_REQUIRED_SERVER_NAME extends NodeError {
    constructor(){
        super("ERR_TLS_REQUIRED_SERVER_NAME", `"servername" is required parameter for Server.addContext`);
    }
}
class ERR_TLS_SESSION_ATTACK extends NodeError {
    constructor(){
        super("ERR_TLS_SESSION_ATTACK", `TLS session renegotiation attack detected`);
    }
}
class ERR_TLS_SNI_FROM_SERVER extends NodeError {
    constructor(){
        super("ERR_TLS_SNI_FROM_SERVER", `Cannot issue SNI from a TLS server-side socket`);
    }
}
class ERR_TRACE_EVENTS_CATEGORY_REQUIRED extends NodeTypeError {
    constructor(){
        super("ERR_TRACE_EVENTS_CATEGORY_REQUIRED", `At least one category is required`);
    }
}
class ERR_TRACE_EVENTS_UNAVAILABLE extends NodeError {
    constructor(){
        super("ERR_TRACE_EVENTS_UNAVAILABLE", `Trace events are unavailable`);
    }
}
class ERR_UNAVAILABLE_DURING_EXIT extends NodeError {
    constructor(){
        super("ERR_UNAVAILABLE_DURING_EXIT", `Cannot call function in process exit handler`);
    }
}
class ERR_UNCAUGHT_EXCEPTION_CAPTURE_ALREADY_SET extends NodeError {
    constructor(){
        super("ERR_UNCAUGHT_EXCEPTION_CAPTURE_ALREADY_SET", "`process.setupUncaughtExceptionCapture()` was called while a capture callback was already active");
    }
}
class ERR_UNESCAPED_CHARACTERS extends NodeTypeError {
    constructor(x74){
        super("ERR_UNESCAPED_CHARACTERS", `${x74} contains unescaped characters`);
    }
}
class ERR_UNKNOWN_BUILTIN_MODULE extends NodeError {
    constructor(x75){
        super("ERR_UNKNOWN_BUILTIN_MODULE", `No such built-in module: ${x75}`);
    }
}
class ERR_UNKNOWN_CREDENTIAL extends NodeError {
    constructor(x76, y16){
        super("ERR_UNKNOWN_CREDENTIAL", `${x76} identifier does not exist: ${y16}`);
    }
}
class ERR_UNKNOWN_ENCODING extends NodeTypeError {
    constructor(x77){
        super("ERR_UNKNOWN_ENCODING", `Unknown encoding: ${x77}`);
    }
}
class ERR_UNKNOWN_FILE_EXTENSION extends NodeTypeError {
    constructor(x78, y17){
        super("ERR_UNKNOWN_FILE_EXTENSION", `Unknown file extension "${x78}" for ${y17}`);
    }
}
class ERR_UNKNOWN_MODULE_FORMAT extends NodeRangeError {
    constructor(x79){
        super("ERR_UNKNOWN_MODULE_FORMAT", `Unknown module format: ${x79}`);
    }
}
class ERR_UNKNOWN_SIGNAL extends NodeTypeError {
    constructor(x80){
        super("ERR_UNKNOWN_SIGNAL", `Unknown signal: ${x80}`);
    }
}
class ERR_UNSUPPORTED_DIR_IMPORT extends NodeError {
    constructor(x81, y18){
        super("ERR_UNSUPPORTED_DIR_IMPORT", `Directory import '${x81}' is not supported resolving ES modules, imported from ${y18}`);
    }
}
class ERR_UNSUPPORTED_ESM_URL_SCHEME extends NodeError {
    constructor(){
        super("ERR_UNSUPPORTED_ESM_URL_SCHEME", `Only file and data URLs are supported by the default ESM loader`);
    }
}
class ERR_V8BREAKITERATOR extends NodeError {
    constructor(){
        super("ERR_V8BREAKITERATOR", `Full ICU data not installed. See https://github.com/nodejs/node/wiki/Intl`);
    }
}
class ERR_VALID_PERFORMANCE_ENTRY_TYPE extends NodeError {
    constructor(){
        super("ERR_VALID_PERFORMANCE_ENTRY_TYPE", `At least one valid performance entry type is required`);
    }
}
class ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING extends NodeTypeError {
    constructor(){
        super("ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING", `A dynamic import callback was not specified.`);
    }
}
class ERR_VM_MODULE_ALREADY_LINKED extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_ALREADY_LINKED", `Module has already been linked`);
    }
}
class ERR_VM_MODULE_CANNOT_CREATE_CACHED_DATA extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_CANNOT_CREATE_CACHED_DATA", `Cached data cannot be created for a module which has been evaluated`);
    }
}
class ERR_VM_MODULE_DIFFERENT_CONTEXT extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_DIFFERENT_CONTEXT", `Linked modules must use the same context`);
    }
}
class ERR_VM_MODULE_LINKING_ERRORED extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_LINKING_ERRORED", `Linking has already failed for the provided module`);
    }
}
class ERR_VM_MODULE_NOT_MODULE extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_NOT_MODULE", `Provided module is not an instance of Module`);
    }
}
class ERR_VM_MODULE_STATUS extends NodeError {
    constructor(x82){
        super("ERR_VM_MODULE_STATUS", `Module status ${x82}`);
    }
}
class ERR_WASI_ALREADY_STARTED extends NodeError {
    constructor(){
        super("ERR_WASI_ALREADY_STARTED", `WASI instance has already started`);
    }
}
class ERR_WORKER_INIT_FAILED extends NodeError {
    constructor(x83){
        super("ERR_WORKER_INIT_FAILED", `Worker initialization failure: ${x83}`);
    }
}
class ERR_WORKER_NOT_RUNNING extends NodeError {
    constructor(){
        super("ERR_WORKER_NOT_RUNNING", `Worker instance not running`);
    }
}
class ERR_WORKER_OUT_OF_MEMORY extends NodeError {
    constructor(x84){
        super("ERR_WORKER_OUT_OF_MEMORY", `Worker terminated due to reaching memory limit: ${x84}`);
    }
}
class ERR_WORKER_UNSERIALIZABLE_ERROR extends NodeError {
    constructor(){
        super("ERR_WORKER_UNSERIALIZABLE_ERROR", `Serializing an uncaught exception failed`);
    }
}
class ERR_WORKER_UNSUPPORTED_EXTENSION extends NodeTypeError {
    constructor(x85){
        super("ERR_WORKER_UNSUPPORTED_EXTENSION", `The worker script extension must be ".js", ".mjs", or ".cjs". Received "${x85}"`);
    }
}
class ERR_WORKER_UNSUPPORTED_OPERATION extends NodeTypeError {
    constructor(x86){
        super("ERR_WORKER_UNSUPPORTED_OPERATION", `${x86} is not supported in workers`);
    }
}
class ERR_ZLIB_INITIALIZATION_FAILED extends NodeError {
    constructor(){
        super("ERR_ZLIB_INITIALIZATION_FAILED", `Initialization failed`);
    }
}
class ERR_FALSY_VALUE_REJECTION extends NodeError {
    reason;
    constructor(reason3){
        super("ERR_FALSY_VALUE_REJECTION", "Promise was rejected with falsy value");
        this.reason = reason3;
    }
}
class ERR_HTTP2_INVALID_SETTING_VALUE extends NodeRangeError {
    actual;
    min;
    max;
    constructor(name6, actual2, min, max){
        super("ERR_HTTP2_INVALID_SETTING_VALUE", `Invalid value for setting "${name6}": ${actual2}`);
        this.actual = actual2;
        if (min !== undefined) {
            this.min = min;
            this.max = max;
        }
    }
}
class ERR_HTTP2_STREAM_CANCEL extends NodeError {
    cause;
    constructor(error1){
        super("ERR_HTTP2_STREAM_CANCEL", typeof error1.message === "string" ? `The pending stream has been canceled (caused by: ${error1.message})` : "The pending stream has been canceled");
        if (error1) {
            this.cause = error1;
        }
    }
}
class ERR_INVALID_ADDRESS_FAMILY extends NodeRangeError {
    host;
    port;
    constructor(addressType, host1, port){
        super("ERR_INVALID_ADDRESS_FAMILY", `Invalid address family: ${addressType} ${host1}:${port}`);
        this.host = host1;
        this.port = port;
    }
}
class ERR_INVALID_CHAR extends NodeTypeError {
    constructor(name7, field){
        super("ERR_INVALID_CHAR", field ? `Invalid character in ${name7}` : `Invalid character in ${name7} ["${field}"]`);
    }
}
class ERR_INVALID_OPT_VALUE extends NodeTypeError {
    constructor(name8, value2){
        super("ERR_INVALID_OPT_VALUE", `The value "${value2}" is invalid for option "${name8}"`);
    }
}
class ERR_INVALID_RETURN_PROPERTY extends NodeTypeError {
    constructor(input3, name9, prop2, value3){
        super("ERR_INVALID_RETURN_PROPERTY", `Expected a valid ${input3} to be returned for the "${prop2}" from the "${name9}" function but got ${value3}.`);
    }
}
function buildReturnPropertyType(value4) {
    if (value4 && value4.constructor && value4.constructor.name) {
        return `instance of ${value4.constructor.name}`;
    } else {
        return `type ${typeof value4}`;
    }
}
class ERR_INVALID_RETURN_PROPERTY_VALUE extends NodeTypeError {
    constructor(input1, name10, prop1, value4){
        super("ERR_INVALID_RETURN_PROPERTY_VALUE", `Expected ${input1} to be returned for the "${prop1}" from the "${name10}" function but got ${buildReturnPropertyType(value4)}.`);
    }
}
class ERR_INVALID_RETURN_VALUE extends NodeTypeError {
    constructor(input2, name11, value5){
        super("ERR_INVALID_RETURN_VALUE", `Expected ${input2} to be returned from the "${name11}" function but got ${buildReturnPropertyType(value5)}.`);
    }
}
class ERR_INVALID_URL extends NodeTypeError {
    input;
    constructor(input4){
        super("ERR_INVALID_URL", `Invalid URL: ${input4}`);
        this.input = input4;
    }
}
function createIterResult(value6, done) {
    return {
        value: value6,
        done
    };
}
let defaultMaxListeners = 10;
class EventEmitter {
    static captureRejectionSymbol = Symbol.for("nodejs.rejection");
    static errorMonitor = Symbol("events.errorMonitor");
    static get defaultMaxListeners() {
        return defaultMaxListeners;
    }
    static set defaultMaxListeners(value) {
        defaultMaxListeners = value;
    }
    maxListeners;
    _events;
    constructor(){
        this._events = new Map();
    }
    _addListener(eventName, listener, prepend) {
        this.checkListenerArgument(listener);
        this.emit("newListener", eventName, listener);
        if (this._events.has(eventName)) {
            const listeners = this._events.get(eventName);
            if (prepend) {
                listeners.unshift(listener);
            } else {
                listeners.push(listener);
            }
        } else {
            this._events.set(eventName, [
                listener
            ]);
        }
        const max1 = this.getMaxListeners();
        if (max1 > 0 && this.listenerCount(eventName) > max1) {
            const warning = new Error(`Possible EventEmitter memory leak detected.\n         ${this.listenerCount(eventName)} ${eventName.toString()} listeners.\n         Use emitter.setMaxListeners() to increase limit`);
            warning.name = "MaxListenersExceededWarning";
            console.warn(warning);
        }
        return this;
    }
    addListener(eventName, listener) {
        return this._addListener(eventName, listener, false);
    }
    emit(eventName, ...args) {
        if (this._events.has(eventName)) {
            if (eventName === "error" && this._events.get(EventEmitter.errorMonitor)) {
                this.emit(EventEmitter.errorMonitor, ...args);
            }
            const listeners = this._events.get(eventName).slice();
            for (const listener of listeners){
                try {
                    listener.apply(this, args);
                } catch (err) {
                    this.emit("error", err);
                }
            }
            return true;
        } else if (eventName === "error") {
            if (this._events.get(EventEmitter.errorMonitor)) {
                this.emit(EventEmitter.errorMonitor, ...args);
            }
            const errMsg = args.length > 0 ? args[0] : Error("Unhandled error.");
            throw errMsg;
        }
        return false;
    }
    eventNames() {
        return Array.from(this._events.keys());
    }
    getMaxListeners() {
        return this.maxListeners || EventEmitter.defaultMaxListeners;
    }
    listenerCount(eventName) {
        if (this._events.has(eventName)) {
            return this._events.get(eventName).length;
        } else {
            return 0;
        }
    }
    static listenerCount(emitter, eventName) {
        return emitter.listenerCount(eventName);
    }
    _listeners(target, eventName, unwrap) {
        if (!target._events.has(eventName)) {
            return [];
        }
        const eventListeners = target._events.get(eventName);
        return unwrap ? this.unwrapListeners(eventListeners) : eventListeners.slice(0);
    }
    unwrapListeners(arr) {
        const unwrappedListeners = new Array(arr.length);
        for(let i = 0; i < arr.length; i++){
            unwrappedListeners[i] = arr[i]["listener"] || arr[i];
        }
        return unwrappedListeners;
    }
    listeners(eventName) {
        return this._listeners(this, eventName, true);
    }
    rawListeners(eventName) {
        return this._listeners(this, eventName, false);
    }
    off(eventName, listener) {
        return this.removeListener(eventName, listener);
    }
    on(eventName, listener) {
        return this._addListener(eventName, listener, false);
    }
    once(eventName, listener) {
        const wrapped = this.onceWrap(eventName, listener);
        this.on(eventName, wrapped);
        return this;
    }
    onceWrap(eventName, listener) {
        this.checkListenerArgument(listener);
        const wrapper = function(...args2) {
            this.context.removeListener(this.eventName, this.rawListener);
            this.listener.apply(this.context, args2);
        };
        const wrapperContext = {
            eventName: eventName,
            listener: listener,
            rawListener: wrapper,
            context: this
        };
        const wrapped = wrapper.bind(wrapperContext);
        wrapperContext.rawListener = wrapped;
        wrapped.listener = listener;
        return wrapped;
    }
    prependListener(eventName, listener) {
        return this._addListener(eventName, listener, true);
    }
    prependOnceListener(eventName, listener) {
        const wrapped = this.onceWrap(eventName, listener);
        this.prependListener(eventName, wrapped);
        return this;
    }
    removeAllListeners(eventName) {
        if (this._events === undefined) {
            return this;
        }
        if (eventName) {
            if (this._events.has(eventName)) {
                const listeners = this._events.get(eventName).slice();
                this._events.delete(eventName);
                for (const listener of listeners){
                    this.emit("removeListener", eventName, listener);
                }
            }
        } else {
            const eventList = this.eventNames();
            eventList.map((value7)=>{
                this.removeAllListeners(value7);
            });
        }
        return this;
    }
    removeListener(eventName, listener) {
        this.checkListenerArgument(listener);
        if (this._events.has(eventName)) {
            const arr = this._events.get(eventName);
            assert(arr);
            let listenerIndex = -1;
            for(let i = arr.length - 1; i >= 0; i--){
                if (arr[i] == listener || arr[i] && arr[i]["listener"] == listener) {
                    listenerIndex = i;
                    break;
                }
            }
            if (listenerIndex >= 0) {
                arr.splice(listenerIndex, 1);
                this.emit("removeListener", eventName, listener);
                if (arr.length === 0) {
                    this._events.delete(eventName);
                }
            }
        }
        return this;
    }
    setMaxListeners(n) {
        if (n !== Infinity) {
            if (n === 0) {
                n = Infinity;
            } else {
                validateIntegerRange(n, "maxListeners", 0);
            }
        }
        this.maxListeners = n;
        return this;
    }
    static once(emitter, name) {
        return new Promise((resolve, reject)=>{
            if (emitter instanceof EventTarget) {
                emitter.addEventListener(name, (...args2)=>{
                    resolve(args2);
                }, {
                    once: true,
                    passive: false,
                    capture: false
                });
                return;
            } else if (emitter instanceof EventEmitter) {
                const eventListener = (...args2)=>{
                    if (errorListener !== undefined) {
                        emitter.removeListener("error", errorListener);
                    }
                    resolve(args2);
                };
                let errorListener;
                if (name !== "error") {
                    errorListener = (err)=>{
                        emitter.removeListener(name, eventListener);
                        reject(err);
                    };
                    emitter.once("error", errorListener);
                }
                emitter.once(name, eventListener);
                return;
            }
        });
    }
    static on(emitter, event) {
        const unconsumedEventValues = [];
        const unconsumedPromises = [];
        let error1 = null;
        let finished = false;
        const iterator = {
            next () {
                const value7 = unconsumedEventValues.shift();
                if (value7) {
                    return Promise.resolve(createIterResult(value7, false));
                }
                if (error1) {
                    const p = Promise.reject(error1);
                    error1 = null;
                    return p;
                }
                if (finished) {
                    return Promise.resolve(createIterResult(undefined, true));
                }
                return new Promise(function(resolve, reject) {
                    unconsumedPromises.push({
                        resolve,
                        reject
                    });
                });
            },
            return () {
                emitter.removeListener(event, eventHandler);
                emitter.removeListener("error", errorHandler);
                finished = true;
                for (const promise of unconsumedPromises){
                    promise.resolve(createIterResult(undefined, true));
                }
                return Promise.resolve(createIterResult(undefined, true));
            },
            throw (err) {
                error1 = err;
                emitter.removeListener(event, eventHandler);
                emitter.removeListener("error", errorHandler);
            },
            [Symbol.asyncIterator] () {
                return this;
            }
        };
        emitter.on(event, eventHandler);
        emitter.on("error", errorHandler);
        return iterator;
        function eventHandler(...args2) {
            const promise = unconsumedPromises.shift();
            if (promise) {
                promise.resolve(createIterResult(args2, false));
            } else {
                unconsumedEventValues.push(args2);
            }
        }
        function errorHandler(err) {
            finished = true;
            const toError = unconsumedPromises.shift();
            if (toError) {
                toError.reject(err);
            } else {
                error1 = err;
            }
            iterator.return();
        }
    }
    checkListenerArgument(listener) {
        if (typeof listener !== "function") {
            throw new ERR_INVALID_ARG_TYPE("listener", "function", listener);
        }
    }
}
const captureRejectionSymbol = EventEmitter.captureRejectionSymbol;
const once1 = EventEmitter.once;
const __default = Object.assign(EventEmitter, {
    EventEmitter
});
const osType = (()=>{
    if (globalThis.Deno != null) {
        return Deno.build.os;
    }
    const navigator = globalThis.navigator;
    if (navigator?.appVersion?.includes?.("Win") ?? false) {
        return "windows";
    }
    return "linux";
})();
const isWindows = osType === "windows";
const CHAR_FORWARD_SLASH = 47;
function assertPath(path) {
    if (typeof path !== "string") {
        throw new TypeError(`Path must be a string. Received ${JSON.stringify(path)}`);
    }
}
function isPosixPathSeparator(code7) {
    return code7 === 47;
}
function isPathSeparator(code7) {
    return isPosixPathSeparator(code7) || code7 === 92;
}
function isWindowsDeviceRoot(code7) {
    return code7 >= 97 && code7 <= 122 || code7 >= 65 && code7 <= 90;
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator1) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code7;
    for(let i = 0, len = path.length; i <= len; ++i){
        if (i < len) code7 = path.charCodeAt(i);
        else if (isPathSeparator1(code7)) break;
        else code7 = CHAR_FORWARD_SLASH;
        if (isPathSeparator1(code7)) {
            if (lastSlash === i - 1 || dots === 1) {
            } else if (lastSlash !== i - 1 && dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = "";
                            lastSegmentLength = 0;
                        } else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    } else if (res.length === 2 || res.length === 1) {
                        res = "";
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    if (res.length > 0) res += `${separator}..`;
                    else res = "..";
                    lastSegmentLength = 2;
                }
            } else {
                if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
                else res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        } else if (code7 === 46 && dots !== -1) {
            ++dots;
        } else {
            dots = -1;
        }
    }
    return res;
}
function _format(sep, pathObject) {
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
    if (!dir) return base;
    if (dir === pathObject.root) return dir + base;
    return dir + sep + base;
}
const WHITESPACE_ENCODINGS = {
    "\u0009": "%09",
    "\u000A": "%0A",
    "\u000B": "%0B",
    "\u000C": "%0C",
    "\u000D": "%0D",
    "\u0020": "%20"
};
function encodeWhitespace(string) {
    return string.replaceAll(/[\s]/g, (c)=>{
        return WHITESPACE_ENCODINGS[c] ?? c;
    });
}
const sep = "\\";
const delimiter = ";";
function resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1; i--){
        let path;
        if (i >= 0) {
            path = pathSegments[i];
        } else if (!resolvedDevice) {
            if (globalThis.Deno == null) {
                throw new TypeError("Resolved a drive-letter-less path without a CWD.");
            }
            path = Deno.cwd();
        } else {
            if (globalThis.Deno == null) {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno.env.get(`=${resolvedDevice}`) || Deno.cwd();
            if (path === undefined || path.slice(0, 3).toLowerCase() !== `${resolvedDevice.toLowerCase()}\\`) {
                path = `${resolvedDevice}\\`;
            }
        }
        assertPath(path);
        const len = path.length;
        if (len === 0) continue;
        let rootEnd = 0;
        let device = "";
        let isAbsolute = false;
        const code7 = path.charCodeAt(0);
        if (len > 1) {
            if (isPathSeparator(code7)) {
                isAbsolute = true;
                if (isPathSeparator(path.charCodeAt(1))) {
                    let j = 2;
                    let last = j;
                    for(; j < len; ++j){
                        if (isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        const firstPart = path.slice(last, j);
                        last = j;
                        for(; j < len; ++j){
                            if (!isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j < len && j !== last) {
                            last = j;
                            for(; j < len; ++j){
                                if (isPathSeparator(path.charCodeAt(j))) break;
                            }
                            if (j === len) {
                                device = `\\\\${firstPart}\\${path.slice(last)}`;
                                rootEnd = j;
                            } else if (j !== last) {
                                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                                rootEnd = j;
                            }
                        }
                    }
                } else {
                    rootEnd = 1;
                }
            } else if (isWindowsDeviceRoot(code7)) {
                if (path.charCodeAt(1) === 58) {
                    device = path.slice(0, 2);
                    rootEnd = 2;
                    if (len > 2) {
                        if (isPathSeparator(path.charCodeAt(2))) {
                            isAbsolute = true;
                            rootEnd = 3;
                        }
                    }
                }
            }
        } else if (isPathSeparator(code7)) {
            rootEnd = 1;
            isAbsolute = true;
        }
        if (device.length > 0 && resolvedDevice.length > 0 && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
        }
        if (resolvedDevice.length === 0 && device.length > 0) {
            resolvedDevice = device;
        }
        if (!resolvedAbsolute) {
            resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
            resolvedAbsolute = isAbsolute;
        }
        if (resolvedAbsolute && resolvedDevice.length > 0) break;
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
}
function normalize3(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code7 = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code7)) {
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        } else if (j !== last) {
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            } else {
                rootEnd = 1;
            }
        } else if (isWindowsDeviceRoot(code7)) {
            if (path.charCodeAt(1) === 58) {
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        isAbsolute = true;
                        rootEnd = 3;
                    }
                }
            }
        }
    } else if (isPathSeparator(code7)) {
        return "\\";
    }
    let tail;
    if (rootEnd < len) {
        tail = normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator);
    } else {
        tail = "";
    }
    if (tail.length === 0 && !isAbsolute) tail = ".";
    if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
        tail += "\\";
    }
    if (device === undefined) {
        if (isAbsolute) {
            if (tail.length > 0) return `\\${tail}`;
            else return "\\";
        } else if (tail.length > 0) {
            return tail;
        } else {
            return "";
        }
    } else if (isAbsolute) {
        if (tail.length > 0) return `${device}\\${tail}`;
        else return `${device}\\`;
    } else if (tail.length > 0) {
        return device + tail;
    } else {
        return device;
    }
}
function isAbsolute(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return false;
    const code7 = path.charCodeAt(0);
    if (isPathSeparator(code7)) {
        return true;
    } else if (isWindowsDeviceRoot(code7)) {
        if (len > 2 && path.charCodeAt(1) === 58) {
            if (isPathSeparator(path.charCodeAt(2))) return true;
        }
    }
    return false;
}
function join(...paths) {
    const pathsCount = paths.length;
    if (pathsCount === 0) return ".";
    let joined;
    let firstPart = null;
    for(let i = 0; i < pathsCount; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (joined === undefined) joined = firstPart = path;
            else joined += `\\${path}`;
        }
    }
    if (joined === undefined) return ".";
    let needsReplace = true;
    let slashCount = 0;
    assert(firstPart != null);
    if (isPathSeparator(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
            if (isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
                    else {
                        needsReplace = false;
                    }
                }
            }
        }
    }
    if (needsReplace) {
        for(; slashCount < joined.length; ++slashCount){
            if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
        }
        if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
    }
    return normalize3(joined);
}
function relative(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    const fromOrig = resolve(from);
    const toOrig = resolve(to);
    if (fromOrig === toOrig) return "";
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) return "";
    let fromStart = 0;
    let fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 92) break;
    }
    for(; fromEnd - 1 > fromStart; --fromEnd){
        if (from.charCodeAt(fromEnd - 1) !== 92) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    let toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 92) break;
    }
    for(; toEnd - 1 > toStart; --toEnd){
        if (to.charCodeAt(toEnd - 1) !== 92) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 92) {
                    return toOrig.slice(toStart + i + 1);
                } else if (i === 2) {
                    return toOrig.slice(toStart + i);
                }
            }
            if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 92) {
                    lastCommonSep = i;
                } else if (i === 2) {
                    lastCommonSep = 3;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 92) lastCommonSep = i;
    }
    if (i !== length && lastCommonSep === -1) {
        return toOrig;
    }
    let out = "";
    if (lastCommonSep === -1) lastCommonSep = 0;
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 92) {
            if (out.length === 0) out += "..";
            else out += "\\..";
        }
    }
    if (out.length > 0) {
        return out + toOrig.slice(toStart + lastCommonSep, toEnd);
    } else {
        toStart += lastCommonSep;
        if (toOrig.charCodeAt(toStart) === 92) ++toStart;
        return toOrig.slice(toStart, toEnd);
    }
}
function toNamespacedPath(path) {
    if (typeof path !== "string") return path;
    if (path.length === 0) return "";
    const resolvedPath = resolve(path);
    if (resolvedPath.length >= 3) {
        if (resolvedPath.charCodeAt(0) === 92) {
            if (resolvedPath.charCodeAt(1) === 92) {
                const code7 = resolvedPath.charCodeAt(2);
                if (code7 !== 63 && code7 !== 46) {
                    return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
                }
            }
        } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0))) {
            if (resolvedPath.charCodeAt(1) === 58 && resolvedPath.charCodeAt(2) === 92) {
                return `\\\\?\\${resolvedPath}`;
            }
        }
    }
    return path;
}
function dirname(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = -1;
    let end = -1;
    let matchedSlash = true;
    let offset = 0;
    const code7 = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code7)) {
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return path;
                        }
                        if (j !== last) {
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code7)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = offset = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
                }
            }
        }
    } else if (isPathSeparator(code7)) {
        return path;
    }
    for(let i = len - 1; i >= offset; --i){
        if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) {
        if (rootEnd === -1) return ".";
        else end = rootEnd;
    }
    return path.slice(0, end);
}
function basename(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path.length >= 2) {
        const drive = path.charCodeAt(0);
        if (isWindowsDeviceRoot(drive)) {
            if (path.charCodeAt(1) === 58) start = 2;
        }
    }
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= start; --i){
            const code7 = path.charCodeAt(i);
            if (isPathSeparator(code7)) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    if (code7 === ext.charCodeAt(extIdx)) {
                        if ((--extIdx) === -1) {
                            end = i;
                        }
                    } else {
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= start; --i){
            if (isPathSeparator(path.charCodeAt(i))) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
function extname(path) {
    assertPath(path);
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === 58 && isWindowsDeviceRoot(path.charCodeAt(0))) {
        start = startPart = 2;
    }
    for(let i = path.length - 1; i >= start; --i){
        const code7 = path.charCodeAt(i);
        if (isPathSeparator(code7)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code7 === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format3(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("\\", pathObject);
}
function parse(path) {
    assertPath(path);
    const ret1 = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    const len = path.length;
    if (len === 0) return ret1;
    let rootEnd = 0;
    let code7 = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code7)) {
            rootEnd = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            rootEnd = j;
                        } else if (j !== last) {
                            rootEnd = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code7)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        if (len === 3) {
                            ret1.root = ret1.dir = path;
                            return ret1;
                        }
                        rootEnd = 3;
                    }
                } else {
                    ret1.root = ret1.dir = path;
                    return ret1;
                }
            }
        }
    } else if (isPathSeparator(code7)) {
        ret1.root = ret1.dir = path;
        return ret1;
    }
    if (rootEnd > 0) ret1.root = path.slice(0, rootEnd);
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= rootEnd; --i){
        code7 = path.charCodeAt(i);
        if (isPathSeparator(code7)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code7 === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            ret1.base = ret1.name = path.slice(startPart, end);
        }
    } else {
        ret1.name = path.slice(startPart, startDot);
        ret1.base = path.slice(startPart, end);
        ret1.ext = path.slice(startDot, end);
    }
    if (startPart > 0 && startPart !== rootEnd) {
        ret1.dir = path.slice(0, startPart - 1);
    } else ret1.dir = ret1.root;
    return ret1;
}
function fromFileUrl(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    let path = decodeURIComponent(url.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
    if (url.hostname != "") {
        path = `\\\\${url.hostname}${path}`;
    }
    return path;
}
function toFileUrl(path) {
    if (!isAbsolute(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const [, hostname, pathname] = path.match(/^(?:[/\\]{2}([^/\\]+)(?=[/\\](?:[^/\\]|$)))?(.*)/);
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(pathname.replace(/%/g, "%25"));
    if (hostname != null && hostname != "localhost") {
        url.hostname = hostname;
        if (!url.hostname) {
            throw new TypeError("Invalid hostname.");
        }
    }
    return url;
}
const mod1 = function() {
    return {
        sep: sep,
        delimiter: delimiter,
        resolve: resolve,
        normalize: normalize3,
        isAbsolute: isAbsolute,
        join: join,
        relative: relative,
        toNamespacedPath: toNamespacedPath,
        dirname: dirname,
        basename: basename,
        extname: extname,
        format: format3,
        parse: parse,
        fromFileUrl: fromFileUrl,
        toFileUrl: toFileUrl
    };
}();
const sep1 = "/";
const delimiter1 = ":";
function resolve1(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--){
        let path;
        if (i >= 0) path = pathSegments[i];
        else {
            if (globalThis.Deno == null) {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno.cwd();
        }
        assertPath(path);
        if (path.length === 0) {
            continue;
        }
        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
        if (resolvedPath.length > 0) return `/${resolvedPath}`;
        else return "/";
    } else if (resolvedPath.length > 0) return resolvedPath;
    else return ".";
}
function normalize1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const isAbsolute1 = path.charCodeAt(0) === 47;
    const trailingSeparator = path.charCodeAt(path.length - 1) === 47;
    path = normalizeString(path, !isAbsolute1, "/", isPosixPathSeparator);
    if (path.length === 0 && !isAbsolute1) path = ".";
    if (path.length > 0 && trailingSeparator) path += "/";
    if (isAbsolute1) return `/${path}`;
    return path;
}
function isAbsolute1(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47;
}
function join1(...paths) {
    if (paths.length === 0) return ".";
    let joined;
    for(let i = 0, len = paths.length; i < len; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (!joined) joined = path;
            else joined += `/${path}`;
        }
    }
    if (!joined) return ".";
    return normalize1(joined);
}
function relative1(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    from = resolve1(from);
    to = resolve1(to);
    if (from === to) return "";
    let fromStart = 1;
    const fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 47) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 1;
    const toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 47) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 47) {
                    return to.slice(toStart + i + 1);
                } else if (i === 0) {
                    return to.slice(toStart + i);
                }
            } else if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 47) {
                    lastCommonSep = i;
                } else if (i === 0) {
                    lastCommonSep = 0;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 47) lastCommonSep = i;
    }
    let out = "";
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 47) {
            if (out.length === 0) out += "..";
            else out += "/..";
        }
    }
    if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
    else {
        toStart += lastCommonSep;
        if (to.charCodeAt(toStart) === 47) ++toStart;
        return to.slice(toStart);
    }
}
function toNamespacedPath1(path) {
    return path;
}
function dirname1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const hasRoot = path.charCodeAt(0) === 47;
    let end = -1;
    let matchedSlash = true;
    for(let i = path.length - 1; i >= 1; --i){
        if (path.charCodeAt(i) === 47) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) return hasRoot ? "/" : ".";
    if (hasRoot && end === 1) return "//";
    return path.slice(0, end);
}
function basename1(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= 0; --i){
            const code7 = path.charCodeAt(i);
            if (code7 === 47) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    if (code7 === ext.charCodeAt(extIdx)) {
                        if ((--extIdx) === -1) {
                            end = i;
                        }
                    } else {
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= 0; --i){
            if (path.charCodeAt(i) === 47) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
function extname1(path) {
    assertPath(path);
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for(let i = path.length - 1; i >= 0; --i){
        const code7 = path.charCodeAt(i);
        if (code7 === 47) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code7 === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format1(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("/", pathObject);
}
function parse1(path) {
    assertPath(path);
    const ret1 = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    if (path.length === 0) return ret1;
    const isAbsolute2 = path.charCodeAt(0) === 47;
    let start;
    if (isAbsolute2) {
        ret1.root = "/";
        start = 1;
    } else {
        start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= start; --i){
        const code7 = path.charCodeAt(i);
        if (code7 === 47) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code7 === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            if (startPart === 0 && isAbsolute2) {
                ret1.base = ret1.name = path.slice(1, end);
            } else {
                ret1.base = ret1.name = path.slice(startPart, end);
            }
        }
    } else {
        if (startPart === 0 && isAbsolute2) {
            ret1.name = path.slice(1, startDot);
            ret1.base = path.slice(1, end);
        } else {
            ret1.name = path.slice(startPart, startDot);
            ret1.base = path.slice(startPart, end);
        }
        ret1.ext = path.slice(startDot, end);
    }
    if (startPart > 0) ret1.dir = path.slice(0, startPart - 1);
    else if (isAbsolute2) ret1.dir = "/";
    return ret1;
}
function fromFileUrl1(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
function toFileUrl1(path) {
    if (!isAbsolute1(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(path.replace(/%/g, "%25").replace(/\\/g, "%5C"));
    return url;
}
const mod2 = function() {
    return {
        sep: sep1,
        delimiter: delimiter1,
        resolve: resolve1,
        normalize: normalize1,
        isAbsolute: isAbsolute1,
        join: join1,
        relative: relative1,
        toNamespacedPath: toNamespacedPath1,
        dirname: dirname1,
        basename: basename1,
        extname: extname1,
        format: format1,
        parse: parse1,
        fromFileUrl: fromFileUrl1,
        toFileUrl: toFileUrl1
    };
}();
const path = isWindows ? mod1 : mod2;
const { basename: basename2 , delimiter: delimiter2 , dirname: dirname2 , extname: extname2 , format: format2 , fromFileUrl: fromFileUrl2 , isAbsolute: isAbsolute2 , join: join2 , normalize: normalize2 , parse: parse2 , relative: relative2 , resolve: resolve2 , sep: sep2 , toFileUrl: toFileUrl2 , toNamespacedPath: toNamespacedPath2 ,  } = path;
const notImplementedEvents = [
    "beforeExit",
    "disconnect",
    "message",
    "multipleResolves",
    "rejectionHandled",
    "SIGBREAK",
    "SIGBUS",
    "SIGFPE",
    "SIGHUP",
    "SIGILL",
    "SIGINT",
    "SIGSEGV",
    "SIGTERM",
    "SIGWINCH",
    "uncaughtException",
    "uncaughtExceptionMonitor",
    "unhandledRejection",
    "warning", 
];
const arch1 = Deno.build.arch;
const argv1 = [
    "",
    "",
    ...Deno.args
];
Object.defineProperty(argv1, "0", {
    get () {
        return Deno.execPath();
    }
});
Object.defineProperty(argv1, "1", {
    get () {
        return fromFileUrl2(Deno.mainModule);
    }
});
const chdir1 = Deno.chdir;
const cwd1 = Deno.cwd;
const _env = {
};
Object.defineProperty(_env, Deno.customInspect, {
    enumerable: false,
    configurable: false,
    get: function() {
        return Deno.env.toObject();
    }
});
const env1 = new Proxy(_env, {
    get (target, prop) {
        if (prop === Deno.customInspect) {
            return target[Deno.customInspect];
        }
        return Deno.env.get(String(prop));
    },
    ownKeys () {
        return Reflect.ownKeys(Deno.env.toObject());
    },
    set (_target, prop, value) {
        Deno.env.set(String(prop), String(value));
        return value;
    }
});
const exit1 = Deno.exit;
function nextTick1(cb, ...args2) {
    if (args2) {
        queueMicrotask(()=>cb.call(this, ...args2)
        );
    } else {
        queueMicrotask(cb);
    }
}
const pid1 = Deno.pid;
const platform1 = Deno.build.os === "windows" ? "win32" : Deno.build.os;
const version1 = `v${Deno.version.deno}`;
const versions1 = {
    node: Deno.version.deno,
    ...Deno.version
};
class Process extends __default {
    constructor(){
        super();
        window.addEventListener("unload", ()=>{
            super.emit("exit", 0);
        });
    }
    arch = arch1;
    argv = argv1;
    chdir = chdir1;
    cwd = cwd1;
    exit = exit1;
    env = env1;
    nextTick = nextTick1;
    on(event, listener) {
        if (notImplementedEvents.includes(event)) {
            notImplemented();
        }
        super.on(event, listener);
        return this;
    }
    pid = pid1;
    platform = platform1;
    removeAllListeners(_event) {
        notImplemented();
    }
    removeListener(event, listener) {
        if (notImplementedEvents.includes(event)) {
            notImplemented();
        }
        super.removeListener("exit", listener);
        return this;
    }
    hrtime(time) {
        const milli = performance.now();
        const sec = Math.floor(milli / 1000);
        const nano = Math.floor(milli * 1000000 - sec * 1000000000);
        if (!time) {
            return [
                sec,
                nano
            ];
        }
        const [prevSec, prevNano] = time;
        return [
            sec - prevSec,
            nano - prevNano
        ];
    }
    get stderr() {
        return {
            fd: Deno.stderr.rid,
            get isTTY () {
                return Deno.isatty(this.fd);
            },
            pipe (_destination, _options) {
                notImplemented();
            },
            write (_chunk, _callback) {
                notImplemented();
            },
            on (_event, _callback) {
                notImplemented();
            }
        };
    }
    get stdin() {
        return {
            fd: Deno.stdin.rid,
            get isTTY () {
                return Deno.isatty(this.fd);
            },
            read (_size) {
                notImplemented();
            },
            on (_event, _callback) {
                notImplemented();
            }
        };
    }
    get stdout() {
        return {
            fd: Deno.stdout.rid,
            get isTTY () {
                return Deno.isatty(this.fd);
            },
            pipe (_destination, _options) {
                notImplemented();
            },
            write (_chunk, _callback) {
                notImplemented();
            },
            on (_event, _callback) {
                notImplemented();
            }
        };
    }
    version = version1;
    versions = versions1;
}
const process = new Process();
Object.defineProperty(process, Symbol.toStringTag, {
    enumerable: false,
    writable: true,
    configurable: false,
    value: "process"
});
const urlJoin = function(...args2) {
    let input5;
    if (typeof args2[0] === 'object') {
        input5 = args2[0];
    } else {
        input5 = [].slice.call(args2);
    }
    return normalize4(input5);
};
const normalize4 = (strArray)=>{
    const resultArray = [];
    if (strArray.length === 0) {
        return '';
    }
    if (typeof strArray[0] !== 'string') {
        throw new TypeError('Url must be a string. Received ' + strArray[0]);
    }
    if (strArray[0].match(/^[^/:]+:\/*$/) && strArray.length > 1) {
        const first = strArray.shift();
        strArray[0] = first + strArray[0];
    }
    if (strArray[0].match(/^file:\/\/\//)) {
        strArray[0] = strArray[0].replace(/^([^/:]+):\/*/, '$1:///');
    } else {
        strArray[0] = strArray[0].replace(/^([^/:]+):\/*/, '$1://');
    }
    for(let i = 0; i < strArray.length; i++){
        let component = strArray[i];
        if (typeof component !== 'string') {
            throw new TypeError('Url must be a string. Received ' + component);
        }
        if (component === '') {
            continue;
        }
        if (i > 0) {
            component = component.replace(/^[\/]+/, '');
        }
        if (i < strArray.length - 1) {
            component = component.replace(/[\/]+$/, '');
        } else {
            component = component.replace(/[\/]+$/, '/');
        }
        resultArray.push(component);
    }
    let str1 = resultArray.join('/');
    str1 = str1.replace(/\/(\?|&|#[^!])/g, '$1');
    let parts = str1.split('?');
    str1 = parts.shift() + (parts.length > 0 ? '?' : '') + parts.join('&');
    return str1;
};
const methods = [
    "get",
    "post",
    "put",
    "delete",
    "options",
    "head",
    "connect",
    "trace",
    "patch", 
];
function axiod(url, config) {
    if (typeof url === "string") {
        return axiod.request(Object.assign({
        }, axiod.defaults, {
            url
        }, config));
    }
    return axiod.request(Object.assign({
    }, axiod.defaults, url));
}
axiod.defaults = {
    url: "/",
    method: "get",
    timeout: 0,
    withCredentials: false,
    validateStatus: (status)=>{
        return status >= 200 && status < 300;
    }
};
axiod.create = (config)=>{
    const instance = Object.assign({
    }, axiod);
    instance.defaults = Object.assign({
    }, axiod.defaults, config);
    instance.defaults.timeout = 1000;
    return instance;
};
axiod.request = ({ url ="/" , baseURL , method , headers , params , data , timeout , withCredentials , auth , validateStatus , paramsSerializer , transformRequest , transformResponse  })=>{
    if (baseURL) {
        url = urlJoin(baseURL, url);
    }
    if (method) {
        if (methods.indexOf(method.toLowerCase().trim()) === -1) {
            throw new Error(`Method ${method} is not supported`);
        } else {
            method = method.toLowerCase().trim();
        }
    } else {
        method = "get";
    }
    let _params = "";
    if (params) {
        if (paramsSerializer) {
            _params = paramsSerializer(params);
        } else {
            _params = Object.keys(params).map((key)=>{
                return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
            }).join("&");
        }
    }
    if (withCredentials) {
        if (auth?.username && auth?.password) {
            if (!headers) {
                headers = {
                };
            }
            headers["Authorization"] = "Basic " + btoa(unescape(encodeURIComponent(`${auth.username}:${auth.password}`)));
        }
    }
    const fetchRequestObject = {
    };
    if (method !== "get") {
        fetchRequestObject.method = method.toUpperCase();
    }
    if (_params) {
        url = urlJoin(url, `?${params}`);
    }
    if (data && method !== "get") {
        if (transformRequest && Array.isArray(transformRequest) && transformRequest.length > 0) {
            for(var i = 0; i < (transformRequest || []).length; i++){
                if (transformRequest && transformRequest[i]) {
                    data = transformRequest[i](data, headers);
                }
            }
        }
        if (typeof data === "string" || data instanceof FormData) {
            fetchRequestObject.body = data;
        } else {
            try {
                fetchRequestObject.body = JSON.stringify(data);
                if (!headers) {
                    headers = {
                    };
                }
                headers["Accept"] = "application/json";
                headers["Content-Type"] = "application/json";
            } catch (ex) {
            }
        }
    }
    if (headers) {
        const _headers = new Headers();
        Object.keys(headers).forEach((header)=>{
            if (headers && headers[header]) {
                _headers.set(header, headers[header]);
            }
        });
        fetchRequestObject.headers = _headers;
    }
    return fetch(url, fetchRequestObject).then(async (x87)=>{
        const _status = x87.status;
        const _statusText = x87.statusText;
        let _data = null;
        const contentType = x87.headers.get("content-type") || "";
        if (contentType.toLowerCase().indexOf("json") === -1) {
            try {
                _data = await x87.json();
            } catch (ex) {
                _data = await x87.text();
            }
        } else {
            _data = await x87.json();
        }
        if (transformResponse) {
            if (transformResponse && Array.isArray(transformResponse) && transformResponse.length > 0) {
                for(var i = 0; i < (transformResponse || []).length; i++){
                    if (transformResponse && transformResponse[i]) {
                        _data = transformResponse[i](_data);
                    }
                }
            }
        }
        const _headers = x87.headers;
        const _config = {
            url,
            baseURL,
            method,
            headers,
            params,
            data,
            timeout,
            withCredentials,
            auth,
            paramsSerializer
        };
        let isValidStatus = true;
        if (validateStatus) {
            isValidStatus = validateStatus(_status);
        } else {
            isValidStatus = _status >= 200 && _status < 300;
        }
        if (isValidStatus) {
            return Promise.resolve({
                status: _status,
                statusText: _statusText,
                data: _data,
                headers: _headers,
                config: _config
            });
        } else {
            const error1 = {
                response: {
                    status: _status,
                    statusText: _statusText,
                    data: _data,
                    headers: _headers
                },
                config: _config
            };
            return Promise.reject(error1);
        }
    });
};
axiod.get = (url, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "get"
    }));
};
axiod.post = (url, data, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "post",
        data
    }));
};
axiod.put = (url, data, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "put",
        data
    }));
};
axiod.delete = (url, data, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "delete",
        data
    }));
};
axiod.options = (url, data, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "options",
        data
    }));
};
axiod.head = (url, data, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "head",
        data
    }));
};
axiod.connect = (url, data, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "connect",
        data
    }));
};
axiod.trace = (url, data, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "trace",
        data
    }));
};
axiod.patch = (url, data, config)=>{
    return axiod.request(Object.assign({
    }, {
        url
    }, config, {
        method: "patch",
        data
    }));
};
function bytesToUuid(bytes) {
    const bits = [
        ...bytes
    ].map((bit)=>{
        const s = bit.toString(16);
        return bit < 16 ? "0" + s : s;
    });
    return [
        ...bits.slice(0, 4),
        "-",
        ...bits.slice(4, 6),
        "-",
        ...bits.slice(6, 8),
        "-",
        ...bits.slice(8, 10),
        "-",
        ...bits.slice(10, 16), 
    ].join("");
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validate(id) {
    return UUID_RE.test(id);
}
function generate() {
    const rnds = crypto.getRandomValues(new Uint8Array(16));
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    return bytesToUuid(rnds);
}
const mod3 = function() {
    return {
        validate: validate,
        generate: generate
    };
}();
const HEX_CHARS = "0123456789abcdef".split("");
const EXTRA = [
    -2147483648,
    8388608,
    32768,
    128
];
const SHIFT = [
    24,
    16,
    8,
    0
];
const blocks = [];
class Sha1 {
    #blocks;
    #block;
    #start;
    #bytes;
    #hBytes;
    #finalized;
    #hashed;
    #h0 = 1732584193;
    #h1 = 4023233417;
    #h2 = 2562383102;
    #h3 = 271733878;
    #h4 = 3285377520;
    #lastByteIndex = 0;
    constructor(sharedMemory1 = false){
        this.init(sharedMemory1);
    }
    init(sharedMemory) {
        if (sharedMemory) {
            blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            this.#blocks = blocks;
        } else {
            this.#blocks = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ];
        }
        this.#h0 = 1732584193;
        this.#h1 = 4023233417;
        this.#h2 = 2562383102;
        this.#h3 = 271733878;
        this.#h4 = 3285377520;
        this.#block = this.#start = this.#bytes = this.#hBytes = 0;
        this.#finalized = this.#hashed = false;
    }
    update(message) {
        if (this.#finalized) {
            return this;
        }
        let msg2;
        if (message instanceof ArrayBuffer) {
            msg2 = new Uint8Array(message);
        } else {
            msg2 = message;
        }
        let index = 0;
        const length = msg2.length;
        const blocks1 = this.#blocks;
        while(index < length){
            let i;
            if (this.#hashed) {
                this.#hashed = false;
                blocks1[0] = this.#block;
                blocks1[16] = blocks1[1] = blocks1[2] = blocks1[3] = blocks1[4] = blocks1[5] = blocks1[6] = blocks1[7] = blocks1[8] = blocks1[9] = blocks1[10] = blocks1[11] = blocks1[12] = blocks1[13] = blocks1[14] = blocks1[15] = 0;
            }
            if (typeof msg2 !== "string") {
                for(i = this.#start; index < length && i < 64; ++index){
                    blocks1[i >> 2] |= msg2[index] << SHIFT[(i++) & 3];
                }
            } else {
                for(i = this.#start; index < length && i < 64; ++index){
                    let code7 = msg2.charCodeAt(index);
                    if (code7 < 128) {
                        blocks1[i >> 2] |= code7 << SHIFT[(i++) & 3];
                    } else if (code7 < 2048) {
                        blocks1[i >> 2] |= (192 | code7 >> 6) << SHIFT[(i++) & 3];
                        blocks1[i >> 2] |= (128 | code7 & 63) << SHIFT[(i++) & 3];
                    } else if (code7 < 55296 || code7 >= 57344) {
                        blocks1[i >> 2] |= (224 | code7 >> 12) << SHIFT[(i++) & 3];
                        blocks1[i >> 2] |= (128 | code7 >> 6 & 63) << SHIFT[(i++) & 3];
                        blocks1[i >> 2] |= (128 | code7 & 63) << SHIFT[(i++) & 3];
                    } else {
                        code7 = 65536 + ((code7 & 1023) << 10 | msg2.charCodeAt(++index) & 1023);
                        blocks1[i >> 2] |= (240 | code7 >> 18) << SHIFT[(i++) & 3];
                        blocks1[i >> 2] |= (128 | code7 >> 12 & 63) << SHIFT[(i++) & 3];
                        blocks1[i >> 2] |= (128 | code7 >> 6 & 63) << SHIFT[(i++) & 3];
                        blocks1[i >> 2] |= (128 | code7 & 63) << SHIFT[(i++) & 3];
                    }
                }
            }
            this.#lastByteIndex = i;
            this.#bytes += i - this.#start;
            if (i >= 64) {
                this.#block = blocks1[16];
                this.#start = i - 64;
                this.hash();
                this.#hashed = true;
            } else {
                this.#start = i;
            }
        }
        if (this.#bytes > 4294967295) {
            this.#hBytes += this.#bytes / 4294967296 >>> 0;
            this.#bytes = this.#bytes >>> 0;
        }
        return this;
    }
    finalize() {
        if (this.#finalized) {
            return;
        }
        this.#finalized = true;
        const blocks1 = this.#blocks;
        const i = this.#lastByteIndex;
        blocks1[16] = this.#block;
        blocks1[i >> 2] |= EXTRA[i & 3];
        this.#block = blocks1[16];
        if (i >= 56) {
            if (!this.#hashed) {
                this.hash();
            }
            blocks1[0] = this.#block;
            blocks1[16] = blocks1[1] = blocks1[2] = blocks1[3] = blocks1[4] = blocks1[5] = blocks1[6] = blocks1[7] = blocks1[8] = blocks1[9] = blocks1[10] = blocks1[11] = blocks1[12] = blocks1[13] = blocks1[14] = blocks1[15] = 0;
        }
        blocks1[14] = this.#hBytes << 3 | this.#bytes >>> 29;
        blocks1[15] = this.#bytes << 3;
        this.hash();
    }
    hash() {
        let a = this.#h0;
        let b = this.#h1;
        let c = this.#h2;
        let d = this.#h3;
        let e = this.#h4;
        let f;
        let j;
        let t;
        const blocks1 = this.#blocks;
        for(j = 16; j < 80; ++j){
            t = blocks1[j - 3] ^ blocks1[j - 8] ^ blocks1[j - 14] ^ blocks1[j - 16];
            blocks1[j] = t << 1 | t >>> 31;
        }
        for(j = 0; j < 20; j += 5){
            f = b & c | ~b & d;
            t = a << 5 | a >>> 27;
            e = t + f + e + 1518500249 + blocks1[j] >>> 0;
            b = b << 30 | b >>> 2;
            f = a & b | ~a & c;
            t = e << 5 | e >>> 27;
            d = t + f + d + 1518500249 + blocks1[j + 1] >>> 0;
            a = a << 30 | a >>> 2;
            f = e & a | ~e & b;
            t = d << 5 | d >>> 27;
            c = t + f + c + 1518500249 + blocks1[j + 2] >>> 0;
            e = e << 30 | e >>> 2;
            f = d & e | ~d & a;
            t = c << 5 | c >>> 27;
            b = t + f + b + 1518500249 + blocks1[j + 3] >>> 0;
            d = d << 30 | d >>> 2;
            f = c & d | ~c & e;
            t = b << 5 | b >>> 27;
            a = t + f + a + 1518500249 + blocks1[j + 4] >>> 0;
            c = c << 30 | c >>> 2;
        }
        for(; j < 40; j += 5){
            f = b ^ c ^ d;
            t = a << 5 | a >>> 27;
            e = t + f + e + 1859775393 + blocks1[j] >>> 0;
            b = b << 30 | b >>> 2;
            f = a ^ b ^ c;
            t = e << 5 | e >>> 27;
            d = t + f + d + 1859775393 + blocks1[j + 1] >>> 0;
            a = a << 30 | a >>> 2;
            f = e ^ a ^ b;
            t = d << 5 | d >>> 27;
            c = t + f + c + 1859775393 + blocks1[j + 2] >>> 0;
            e = e << 30 | e >>> 2;
            f = d ^ e ^ a;
            t = c << 5 | c >>> 27;
            b = t + f + b + 1859775393 + blocks1[j + 3] >>> 0;
            d = d << 30 | d >>> 2;
            f = c ^ d ^ e;
            t = b << 5 | b >>> 27;
            a = t + f + a + 1859775393 + blocks1[j + 4] >>> 0;
            c = c << 30 | c >>> 2;
        }
        for(; j < 60; j += 5){
            f = b & c | b & d | c & d;
            t = a << 5 | a >>> 27;
            e = t + f + e - 1894007588 + blocks1[j] >>> 0;
            b = b << 30 | b >>> 2;
            f = a & b | a & c | b & c;
            t = e << 5 | e >>> 27;
            d = t + f + d - 1894007588 + blocks1[j + 1] >>> 0;
            a = a << 30 | a >>> 2;
            f = e & a | e & b | a & b;
            t = d << 5 | d >>> 27;
            c = t + f + c - 1894007588 + blocks1[j + 2] >>> 0;
            e = e << 30 | e >>> 2;
            f = d & e | d & a | e & a;
            t = c << 5 | c >>> 27;
            b = t + f + b - 1894007588 + blocks1[j + 3] >>> 0;
            d = d << 30 | d >>> 2;
            f = c & d | c & e | d & e;
            t = b << 5 | b >>> 27;
            a = t + f + a - 1894007588 + blocks1[j + 4] >>> 0;
            c = c << 30 | c >>> 2;
        }
        for(; j < 80; j += 5){
            f = b ^ c ^ d;
            t = a << 5 | a >>> 27;
            e = t + f + e - 899497514 + blocks1[j] >>> 0;
            b = b << 30 | b >>> 2;
            f = a ^ b ^ c;
            t = e << 5 | e >>> 27;
            d = t + f + d - 899497514 + blocks1[j + 1] >>> 0;
            a = a << 30 | a >>> 2;
            f = e ^ a ^ b;
            t = d << 5 | d >>> 27;
            c = t + f + c - 899497514 + blocks1[j + 2] >>> 0;
            e = e << 30 | e >>> 2;
            f = d ^ e ^ a;
            t = c << 5 | c >>> 27;
            b = t + f + b - 899497514 + blocks1[j + 3] >>> 0;
            d = d << 30 | d >>> 2;
            f = c ^ d ^ e;
            t = b << 5 | b >>> 27;
            a = t + f + a - 899497514 + blocks1[j + 4] >>> 0;
            c = c << 30 | c >>> 2;
        }
        this.#h0 = this.#h0 + a >>> 0;
        this.#h1 = this.#h1 + b >>> 0;
        this.#h2 = this.#h2 + c >>> 0;
        this.#h3 = this.#h3 + d >>> 0;
        this.#h4 = this.#h4 + e >>> 0;
    }
    hex() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        return HEX_CHARS[h0 >> 28 & 15] + HEX_CHARS[h0 >> 24 & 15] + HEX_CHARS[h0 >> 20 & 15] + HEX_CHARS[h0 >> 16 & 15] + HEX_CHARS[h0 >> 12 & 15] + HEX_CHARS[h0 >> 8 & 15] + HEX_CHARS[h0 >> 4 & 15] + HEX_CHARS[h0 & 15] + HEX_CHARS[h1 >> 28 & 15] + HEX_CHARS[h1 >> 24 & 15] + HEX_CHARS[h1 >> 20 & 15] + HEX_CHARS[h1 >> 16 & 15] + HEX_CHARS[h1 >> 12 & 15] + HEX_CHARS[h1 >> 8 & 15] + HEX_CHARS[h1 >> 4 & 15] + HEX_CHARS[h1 & 15] + HEX_CHARS[h2 >> 28 & 15] + HEX_CHARS[h2 >> 24 & 15] + HEX_CHARS[h2 >> 20 & 15] + HEX_CHARS[h2 >> 16 & 15] + HEX_CHARS[h2 >> 12 & 15] + HEX_CHARS[h2 >> 8 & 15] + HEX_CHARS[h2 >> 4 & 15] + HEX_CHARS[h2 & 15] + HEX_CHARS[h3 >> 28 & 15] + HEX_CHARS[h3 >> 24 & 15] + HEX_CHARS[h3 >> 20 & 15] + HEX_CHARS[h3 >> 16 & 15] + HEX_CHARS[h3 >> 12 & 15] + HEX_CHARS[h3 >> 8 & 15] + HEX_CHARS[h3 >> 4 & 15] + HEX_CHARS[h3 & 15] + HEX_CHARS[h4 >> 28 & 15] + HEX_CHARS[h4 >> 24 & 15] + HEX_CHARS[h4 >> 20 & 15] + HEX_CHARS[h4 >> 16 & 15] + HEX_CHARS[h4 >> 12 & 15] + HEX_CHARS[h4 >> 8 & 15] + HEX_CHARS[h4 >> 4 & 15] + HEX_CHARS[h4 & 15];
    }
    toString() {
        return this.hex();
    }
    digest() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        return [
            h0 >> 24 & 255,
            h0 >> 16 & 255,
            h0 >> 8 & 255,
            h0 & 255,
            h1 >> 24 & 255,
            h1 >> 16 & 255,
            h1 >> 8 & 255,
            h1 & 255,
            h2 >> 24 & 255,
            h2 >> 16 & 255,
            h2 >> 8 & 255,
            h2 & 255,
            h3 >> 24 & 255,
            h3 >> 16 & 255,
            h3 >> 8 & 255,
            h3 & 255,
            h4 >> 24 & 255,
            h4 >> 16 & 255,
            h4 >> 8 & 255,
            h4 & 255, 
        ];
    }
    array() {
        return this.digest();
    }
    arrayBuffer() {
        this.finalize();
        const buffer = new ArrayBuffer(20);
        const dataView = new DataView(buffer);
        dataView.setUint32(0, this.#h0);
        dataView.setUint32(4, this.#h1);
        dataView.setUint32(8, this.#h2);
        dataView.setUint32(12, this.#h3);
        dataView.setUint32(16, this.#h4);
        return buffer;
    }
}
class HmacSha1 extends Sha1 {
    #sharedMemory;
    #inner;
    #oKeyPad;
    constructor(secretKey, sharedMemory2 = false){
        super(sharedMemory2);
        let key4;
        if (typeof secretKey === "string") {
            const bytes = [];
            const length = secretKey.length;
            let index = 0;
            for(let i = 0; i < length; i++){
                let code7 = secretKey.charCodeAt(i);
                if (code7 < 128) {
                    bytes[index++] = code7;
                } else if (code7 < 2048) {
                    bytes[index++] = 192 | code7 >> 6;
                    bytes[index++] = 128 | code7 & 63;
                } else if (code7 < 55296 || code7 >= 57344) {
                    bytes[index++] = 224 | code7 >> 12;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                } else {
                    code7 = 65536 + ((code7 & 1023) << 10 | secretKey.charCodeAt(++i) & 1023);
                    bytes[index++] = 240 | code7 >> 18;
                    bytes[index++] = 128 | code7 >> 12 & 63;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                }
            }
            key4 = bytes;
        } else {
            if (secretKey instanceof ArrayBuffer) {
                key4 = new Uint8Array(secretKey);
            } else {
                key4 = secretKey;
            }
        }
        if (key4.length > 64) {
            key4 = new Sha1(true).update(key4).array();
        }
        const oKeyPad = [];
        const iKeyPad = [];
        for(let i = 0; i < 64; i++){
            const b = key4[i] || 0;
            oKeyPad[i] = 92 ^ b;
            iKeyPad[i] = 54 ^ b;
        }
        this.update(iKeyPad);
        this.#oKeyPad = oKeyPad;
        this.#inner = true;
        this.#sharedMemory = sharedMemory2;
    }
    finalize() {
        super.finalize();
        if (this.#inner) {
            this.#inner = false;
            const innerHash = this.array();
            super.init(this.#sharedMemory);
            this.update(this.#oKeyPad);
            this.update(innerHash);
            super.finalize();
        }
    }
}
const _uuid4 = mod3.generate;
_uuid4.generate = mod3.generate;
_uuid4.validate = mod3.validate;
const v4 = _uuid4;
const hexTable = new TextEncoder().encode("0123456789abcdef");
function errInvalidByte(__byte) {
    return new Error("encoding/hex: invalid byte: " + new TextDecoder().decode(new Uint8Array([
        __byte
    ])));
}
function errLength() {
    return new Error("encoding/hex: odd length hex string");
}
function fromHexChar(__byte) {
    if (48 <= __byte && __byte <= 57) return __byte - 48;
    if (97 <= __byte && __byte <= 102) return __byte - 97 + 10;
    if (65 <= __byte && __byte <= 70) return __byte - 65 + 10;
    throw errInvalidByte(__byte);
}
function encodedLen(n) {
    return n * 2;
}
function encode(src) {
    const dst = new Uint8Array(encodedLen(src.length));
    for(let i1 = 0; i1 < dst.length; i1++){
        const v = src[i1];
        dst[i1 * 2] = hexTable[v >> 4];
        dst[i1 * 2 + 1] = hexTable[v & 15];
    }
    return dst;
}
function encodeToString(src) {
    return new TextDecoder().decode(encode(src));
}
function decode(src) {
    const dst = new Uint8Array(decodedLen1(src.length));
    for(let i1 = 0; i1 < dst.length; i1++){
        const a = fromHexChar(src[i1 * 2]);
        const b = fromHexChar(src[i1 * 2 + 1]);
        dst[i1] = a << 4 | b;
    }
    if (src.length % 2 == 1) {
        fromHexChar(src[dst.length * 2]);
        throw errLength();
    }
    return dst;
}
function decodedLen1(x87) {
    return x87 >>> 1;
}
function decodeString(s) {
    return decode(new TextEncoder().encode(s));
}
const base64abc = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "/"
];
function encode1(data) {
    const uint8 = typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    let result = "", i1;
    const l = uint8.length;
    for(i1 = 2; i1 < l; i1 += 3){
        result += base64abc[uint8[i1 - 2] >> 2];
        result += base64abc[(uint8[i1 - 2] & 3) << 4 | uint8[i1 - 1] >> 4];
        result += base64abc[(uint8[i1 - 1] & 15) << 2 | uint8[i1] >> 6];
        result += base64abc[uint8[i1] & 63];
    }
    if (i1 === l + 1) {
        result += base64abc[uint8[i1 - 2] >> 2];
        result += base64abc[(uint8[i1 - 2] & 3) << 4];
        result += "==";
    }
    if (i1 === l) {
        result += base64abc[uint8[i1 - 2] >> 2];
        result += base64abc[(uint8[i1 - 2] & 3) << 4 | uint8[i1 - 1] >> 4];
        result += base64abc[(uint8[i1 - 1] & 15) << 2];
        result += "=";
    }
    return result;
}
function decode1(b64) {
    const binString = atob(b64);
    const size = binString.length;
    const bytes = new Uint8Array(size);
    for(let i1 = 0; i1 < size; i1++){
        bytes[i1] = binString.charCodeAt(i1);
    }
    return bytes;
}
const notImplementedEncodings = [
    "ascii",
    "binary",
    "latin1",
    "ucs2",
    "utf16le", 
];
function checkEncoding(encoding1 = "utf8", strict = true) {
    if (typeof encoding1 !== "string" || strict && encoding1 === "") {
        if (!strict) return "utf8";
        throw new TypeError(`Unkown encoding: ${encoding1}`);
    }
    const normalized = normalizeEncoding(encoding1);
    if (normalized === undefined) {
        throw new TypeError(`Unkown encoding: ${encoding1}`);
    }
    if (notImplementedEncodings.includes(encoding1)) {
        notImplemented(`"${encoding1}" encoding`);
    }
    return normalized;
}
const encodingOps = {
    utf8: {
        byteLength: (string)=>new TextEncoder().encode(string).byteLength
    },
    ucs2: {
        byteLength: (string)=>string.length * 2
    },
    utf16le: {
        byteLength: (string)=>string.length * 2
    },
    latin1: {
        byteLength: (string)=>string.length
    },
    ascii: {
        byteLength: (string)=>string.length
    },
    base64: {
        byteLength: (string)=>base64ByteLength(string, string.length)
    },
    hex: {
        byteLength: (string)=>string.length >>> 1
    }
};
function base64ByteLength(str1, bytes) {
    if (str1.charCodeAt(bytes - 1) === 61) bytes--;
    if (bytes > 1 && str1.charCodeAt(bytes - 1) === 61) bytes--;
    return bytes * 3 >>> 2;
}
class Buffer1 extends Uint8Array {
    static alloc(size, fill, encoding = "utf8") {
        if (typeof size !== "number") {
            throw new TypeError(`The "size" argument must be of type number. Received type ${typeof size}`);
        }
        const buf = new Buffer1(size);
        if (size === 0) return buf;
        let bufFill;
        if (typeof fill === "string") {
            const clearEncoding = checkEncoding(encoding);
            if (typeof fill === "string" && fill.length === 1 && clearEncoding === "utf8") {
                buf.fill(fill.charCodeAt(0));
            } else bufFill = Buffer1.from(fill, clearEncoding);
        } else if (typeof fill === "number") {
            buf.fill(fill);
        } else if (fill instanceof Uint8Array) {
            if (fill.length === 0) {
                throw new TypeError(`The argument "value" is invalid. Received ${fill.constructor.name} []`);
            }
            bufFill = fill;
        }
        if (bufFill) {
            if (bufFill.length > buf.length) {
                bufFill = bufFill.subarray(0, buf.length);
            }
            let offset = 0;
            while(offset < size){
                buf.set(bufFill, offset);
                offset += bufFill.length;
                if (offset + bufFill.length >= size) break;
            }
            if (offset !== size) {
                buf.set(bufFill.subarray(0, size - offset), offset);
            }
        }
        return buf;
    }
    static allocUnsafe(size) {
        return new Buffer1(size);
    }
    static byteLength(string, encoding = "utf8") {
        if (typeof string != "string") return string.byteLength;
        encoding = normalizeEncoding(encoding) || "utf8";
        return encodingOps[encoding].byteLength(string);
    }
    static concat(list, totalLength) {
        if (totalLength == undefined) {
            totalLength = 0;
            for (const buf of list){
                totalLength += buf.length;
            }
        }
        const buffer = Buffer1.allocUnsafe(totalLength);
        let pos = 0;
        for (const item of list){
            let buf;
            if (!(item instanceof Buffer1)) {
                buf = Buffer1.from(item);
            } else {
                buf = item;
            }
            buf.copy(buffer, pos);
            pos += buf.length;
        }
        return buffer;
    }
    static from(value, offsetOrEncoding, length) {
        const offset = typeof offsetOrEncoding === "string" ? undefined : offsetOrEncoding;
        let encoding2 = typeof offsetOrEncoding === "string" ? offsetOrEncoding : undefined;
        if (typeof value == "string") {
            encoding2 = checkEncoding(encoding2, false);
            if (encoding2 === "hex") return new Buffer1(decodeString(value).buffer);
            if (encoding2 === "base64") return new Buffer1(decode1(value).buffer);
            return new Buffer1(new TextEncoder().encode(value).buffer);
        }
        return new Buffer1(value, offset, length);
    }
    static isBuffer(obj) {
        return obj instanceof Buffer1;
    }
    static isEncoding(encoding) {
        return typeof encoding === "string" && encoding.length !== 0 && normalizeEncoding(encoding) !== undefined;
    }
    copy(targetBuffer, targetStart = 0, sourceStart = 0, sourceEnd = this.length) {
        const sourceBuffer = this.subarray(sourceStart, sourceEnd).subarray(0, Math.max(0, targetBuffer.length - targetStart));
        if (sourceBuffer.length === 0) return 0;
        targetBuffer.set(sourceBuffer, targetStart);
        return sourceBuffer.length;
    }
    equals(otherBuffer) {
        if (!(otherBuffer instanceof Uint8Array)) {
            throw new TypeError(`The "otherBuffer" argument must be an instance of Buffer or Uint8Array. Received type ${typeof otherBuffer}`);
        }
        if (this === otherBuffer) return true;
        if (this.byteLength !== otherBuffer.byteLength) return false;
        for(let i1 = 0; i1 < this.length; i1++){
            if (this[i1] !== otherBuffer[i1]) return false;
        }
        return true;
    }
    readBigInt64BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getBigInt64(offset);
    }
    readBigInt64LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getBigInt64(offset, true);
    }
    readBigUInt64BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getBigUint64(offset);
    }
    readBigUInt64LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getBigUint64(offset, true);
    }
    readDoubleBE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getFloat64(offset);
    }
    readDoubleLE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getFloat64(offset, true);
    }
    readFloatBE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getFloat32(offset);
    }
    readFloatLE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getFloat32(offset, true);
    }
    readInt8(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt8(offset);
    }
    readInt16BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt16(offset);
    }
    readInt16LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt16(offset, true);
    }
    readInt32BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt32(offset);
    }
    readInt32LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt32(offset, true);
    }
    readUInt8(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint8(offset);
    }
    readUInt16BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint16(offset);
    }
    readUInt16LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint16(offset, true);
    }
    readUInt32BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint32(offset);
    }
    readUInt32LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint32(offset, true);
    }
    slice(begin = 0, end = this.length) {
        return this.subarray(begin, end);
    }
    toJSON() {
        return {
            type: "Buffer",
            data: Array.from(this)
        };
    }
    toString(encoding = "utf8", start = 0, end = this.length) {
        encoding = checkEncoding(encoding);
        const b = this.subarray(start, end);
        if (encoding === "hex") return encodeToString(b);
        if (encoding === "base64") return encode1(b.buffer);
        return new TextDecoder(encoding).decode(b);
    }
    write(string, offset = 0, length = this.length) {
        return new TextEncoder().encodeInto(string, this.subarray(offset, offset + length)).written;
    }
    writeBigInt64BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setBigInt64(offset, value);
        return offset + 4;
    }
    writeBigInt64LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setBigInt64(offset, value, true);
        return offset + 4;
    }
    writeBigUInt64BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setBigUint64(offset, value);
        return offset + 4;
    }
    writeBigUInt64LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setBigUint64(offset, value, true);
        return offset + 4;
    }
    writeDoubleBE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setFloat64(offset, value);
        return offset + 8;
    }
    writeDoubleLE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setFloat64(offset, value, true);
        return offset + 8;
    }
    writeFloatBE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setFloat32(offset, value);
        return offset + 4;
    }
    writeFloatLE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setFloat32(offset, value, true);
        return offset + 4;
    }
    writeInt8(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setInt8(offset, value);
        return offset + 1;
    }
    writeInt16BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setInt16(offset, value);
        return offset + 2;
    }
    writeInt16LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setInt16(offset, value, true);
        return offset + 2;
    }
    writeInt32BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint32(offset, value);
        return offset + 4;
    }
    writeInt32LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setInt32(offset, value, true);
        return offset + 4;
    }
    writeUInt8(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint8(offset, value);
        return offset + 1;
    }
    writeUInt16BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint16(offset, value);
        return offset + 2;
    }
    writeUInt16LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint16(offset, value, true);
        return offset + 2;
    }
    writeUInt32BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint32(offset, value);
        return offset + 4;
    }
    writeUInt32LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint32(offset, value, true);
        return offset + 4;
    }
}
const MAX_RANDOM_VALUES = 65536;
function generateRandomBytes(size) {
    if (size > 4294967295) {
        throw new RangeError(`The value of "size" is out of range. It must be >= 0 && <= ${4294967295}. Received ${size}`);
    }
    const bytes = Buffer1.allocUnsafe(size);
    if (size > 65536) {
        for(let generated = 0; generated < size; generated += MAX_RANDOM_VALUES){
            crypto.getRandomValues(bytes.slice(generated, generated + 65536));
        }
    } else {
        crypto.getRandomValues(bytes);
    }
    return bytes;
}
function randomBytes(size, cb) {
    if (typeof cb === "function") {
        let err = null, bytes;
        try {
            bytes = generateRandomBytes(size);
        } catch (e) {
            if (e instanceof RangeError && e.message.includes('The value of "size" is out of range')) {
                throw e;
            } else {
                err = e;
            }
        }
        setTimeout(()=>{
            if (err) {
                cb(err);
            } else {
                cb(null, bytes);
            }
        }, 0);
    } else {
        return generateRandomBytes(size);
    }
}
const importMeta = {
    url: "https://deno.land/std@0.97.0/hash/_wasm/wasm.js",
    main: false
};
const source = decode1("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HiADIAJBmAFqQcgBEIsBIgRBADYCyAEgBEHMAWogAkEIakHIABCLARpB/IXAACEEQQAMEQsgAEHYgcAARwRAIAAoAABB89CFiwNHDRALIAJBkgRqQgA3AQAgAkGaBGpBADsBACACQZwEakIANwIAIAJBpARqQgA3AgAgAkGsBGpCADcCACACQbQEakIANwIAIAJBvARqQgA3AgAgAkHEBGpBADoAACACQcUEakEANgAAIAJByQRqQQA7AAAgAkHLBGpBADoAACACQcAANgKIBCACQQA7AYwEIAJBADYBjgQgAkGYAWogAkGIBGpBxAAQiwEaIAJBqANqIgQgAkHUAWopAgA3AwAgAkGgA2oiBSACQcwBaikCADcDACACQZgDaiIJIAJBxAFqKQIANwMAIAJBkANqIgogAkG8AWopAgA3AwAgAkGIA2oiBiACQbQBaikCADcDACACQYADaiIHIAJBrAFqKQIANwMAIAJB+AJqIgggAkGkAWopAgA3AwAgAiACKQKcATcD8AJB4ABBCBChASIDRQ0XIANCADcDACADQQA2AhwgAyACKQPwAjcDICADQfiXwAApAwA3AwggA0EQakGAmMAAKQMANwMAIANBGGpBiJjAACgCADYCACADQShqIAgpAwA3AwAgA0EwaiAHKQMANwMAIANBOGogBikDADcDACADQUBrIAopAwA3AwAgA0HIAGogCSkDADcDACADQdAAaiAFKQMANwMAIANB2ABqIAQpAwA3AwBB3IHAACEEQQAMEAsgAEGAgsAARg0FIABBgILAAEEGEIMBRQ0FIABBrILAAEYNBiAAQayCwABBBhCDAUUNBiAAQdiCwABGDQcgAEHYgsAAQQYQgwFFDQcgAEGEg8AARwRAIABBhIPAAEEGEIMBDQ8LIAJBADYCiAQgAkGIBGpBBHIhBEEAIQMDQCADIARqQQA6AAAgAiACKAKIBEEBajYCiAQgA0EBaiIDQYABRw0ACyACQZgBaiACQYgEakGEARCLARogAkHwAmogAkGYAWpBBHJBgAEQiwEaQdgBQQgQoQEiA0UNGCADQgA3AwggA0IANwMAIANBADYCUCADQZCZwAApAwA3AxAgA0EYakGYmcAAKQMANwMAIANBIGpBoJnAACkDADcDACADQShqQaiZwAApAwA3AwAgA0EwakGwmcAAKQMANwMAIANBOGpBuJnAACkDADcDACADQUBrQcCZwAApAwA3AwAgA0HIAGpByJnAACkDADcDACADQdQAaiACQfACakGAARCLARpBjIPAACEEQQAMDwsgAEGwg8AARg0HIAApAABC89CFm9PFjJk0UQ0HIABB3IPAAEYNCCAAKQAAQvPQhZvTxcyaNlENCCAAQYiEwABGDQkgACkAAELz0IWb0+WMnDRRDQkgAEG0hMAARwRAIAApAABC89CFm9OlzZgyUg0OCyACQZgBakEAQcgBEJEBGiACQf4CakIANwEAIAJBhgNqQgA3AQAgAkGOA2pCADcBACACQZYDakIANwEAIAJBngNqQgA3AQAgAkGmA2pCADcBACACQa4DakIANwEAIAJBtgNqQQA2AQAgAkG6A2pBADsBACACQQA7AfQCIAJCADcB9gIgAkHIADYC8AIgAkGIBGogAkHwAmpBzAAQiwEaIAJBCGogAkGIBGpBBHJByAAQiwEaQZgCQQgQoQEiA0UNGyADIAJBmAFqQcgBEIsBIgRBADYCyAEgBEHMAWogAkEIakHIABCLARpBvITAACEEQQAMDgsgAkGSBGpCADcBACACQZoEakEAOwEAIAJBEDYCiAQgAkEAOwGMBCACQQA2AY4EIAJBqAFqIgMgAkGYBGoiBCgCADYCACACQaABaiIJIAJBkARqIgUpAwA3AwAgAkHoAmoiBiACQaQBaikCADcDACACIAIpA4gENwOYASACIAIpApwBNwPgAiACQcABaiIHQgA3AwAgAkG4AWoiCEIANwMAIAJBsAFqIg1CADcDACADQgA3AwAgCUIANwMAIAJCADcDmAEgAkH6AmpCADcBACACQYIDakEAOwEAIAJBEDYC8AIgAkEAOwH0AiACQQA2AfYCIAQgAkGAA2ooAgA2AgAgBSACQfgCaiIKKQMANwMAIAJBEGoiCyACQZQEaikCADcDACACIAIpA/ACNwOIBCACIAIpAowENwMIIAJB0AFqIgwgCykDADcDACACIAIpAwg3A8gBIAogBikDADcDACACIAIpA+ACNwPwAiACQcAEaiIGIAwpAwA3AwAgAkG4BGoiCyACKQPIATcDACACQbAEaiIMIAcpAwA3AwAgAkGoBGoiByAIKQMANwMAIAJBoARqIgggDSkDADcDACAEIAMpAwA3AwAgBSAJKQMANwMAIAIgAikDmAE3A4gEQdQAQQQQoQEiA0UNDiADQQA2AgAgAyACKQPwAjcCBCADIAIpA4gENwIUIANBDGogCikDADcCACADQRxqIAUpAwA3AgAgA0EkaiAEKQMANwIAIANBLGogCCkDADcCACADQTRqIAcpAwA3AgAgA0E8aiAMKQMANwIAIANBxABqIAspAwA3AgAgA0HMAGogBikDADcCAEGEgMAAIQRBAAwNCyACQZIEakIANwEAIAJBmgRqQQA7AQAgAkGcBGpCADcCACACQaQEakIANwIAIAJBrARqQgA3AgAgAkG0BGpCADcCACACQbwEakIANwIAIAJBxARqQQA6AAAgAkHFBGpBADYAACACQckEakEAOwAAIAJBywRqQQA6AAAgAkHAADYCiAQgAkEAOwGMBCACQQA2AY4EIAJBmAFqIAJBiARqQcQAEIsBGiACQagDaiIEIAJB1AFqKQIANwMAIAJBoANqIgUgAkHMAWopAgA3AwAgAkGYA2oiCSACQcQBaikCADcDACACQZADaiIKIAJBvAFqKQIANwMAIAJBiANqIgYgAkG0AWopAgA3AwAgAkGAA2oiByACQawBaikCADcDACACQfgCaiIIIAJBpAFqKQIANwMAIAIgAikCnAE3A/ACQeAAQQgQoQEiA0UNEyADQQA2AgggA0IANwMAIAMgAikD8AI3AgwgA0EUaiAIKQMANwIAIANBHGogBykDADcCACADQSRqIAYpAwA3AgAgA0EsaiAKKQMANwIAIANBNGogCSkDADcCACADQTxqIAUpAwA3AgAgA0HEAGogBCkDADcCACADQdQAakHIl8AAKQIANwIAIANBwJfAACkCADcCTEGsgMAAIQRBAAwMCyACQZIEakIANwEAIAJBmgRqQQA7AQAgAkGcBGpCADcCACACQaQEakIANwIAIAJBrARqQgA3AgAgAkG0BGpCADcCACACQbwEakIANwIAIAJBxARqQQA6AAAgAkHFBGpBADYAACACQckEakEAOwAAIAJBywRqQQA6AAAgAkHAADYCiAQgAkEAOwGMBCACQQA2AY4EIAJBmAFqIAJBiARqQcQAEIsBGiACQagDaiIEIAJB1AFqKQIANwMAIAJBoANqIgUgAkHMAWopAgA3AwAgAkGYA2oiCSACQcQBaikCADcDACACQZADaiIKIAJBvAFqKQIANwMAIAJBiANqIgYgAkG0AWopAgA3AwAgAkGAA2oiByACQawBaikCADcDACACQfgCaiIIIAJBpAFqKQIANwMAIAIgAikCnAE3A/ACQeAAQQgQoQEiA0UNEiADQgA3AwAgA0EANgIcIAMgAikD8AI3AyAgA0H4l8AAKQMANwMIIANBEGpBgJjAACkDADcDACADQRhqQYiYwAAoAgA2AgAgA0EoaiAIKQMANwMAIANBMGogBykDADcDACADQThqIAYpAwA3AwAgA0FAayAKKQMANwMAIANByABqIAkpAwA3AwAgA0HQAGogBSkDADcDACADQdgAaiAEKQMANwMAQYSBwAAhBEEADAsLIAJBkgRqQgA3AQAgAkGaBGpBADsBACACQZwEakIANwIAIAJBpARqQgA3AgAgAkGsBGpCADcCACACQbQEakIANwIAIAJBvARqQgA3AgAgAkHEBGpBADoAACACQcUEakEANgAAIAJByQRqQQA7AAAgAkHLBGpBADoAACACQcAANgKIBCACQQA7AYwEIAJBADYBjgQgAkGYAWogAkGIBGpBxAAQiwEaIAJBqANqIgQgAkHUAWopAgA3AwAgAkGgA2oiBSACQcwBaikCADcDACACQZgDaiIJIAJBxAFqKQIANwMAIAJBkANqIgogAkG8AWopAgA3AwAgAkGIA2oiBiACQbQBaikCADcDACACQYADaiIHIAJBrAFqKQIANwMAIAJB+AJqIgggAkGkAWopAgA3AwAgAiACKQKcATcD8AJB+ABBCBChASIDRQ0MIANCADcDACADQQA2AjAgAyACKQPwAjcCNCADQdCXwAApAwA3AwggA0EQakHYl8AAKQMANwMAIANBGGpB4JfAACkDADcDACADQSBqQeiXwAApAwA3AwAgA0EoakHwl8AAKQMANwMAIANBPGogCCkDADcCACADQcQAaiAHKQMANwIAIANBzABqIAYpAwA3AgAgA0HUAGogCikDADcCACADQdwAaiAJKQMANwIAIANB5ABqIAUpAwA3AgAgA0HsAGogBCkDADcCAEG0gcAAIQRBAAwKCyACQZIEakIANwEAIAJBmgRqQQA7AQAgAkGcBGpCADcCACACQaQEakIANwIAIAJBrARqQgA3AgAgAkG0BGpCADcCACACQbwEakIANwIAIAJBxARqQQA6AAAgAkHFBGpBADYAACACQckEakEAOwAAIAJBywRqQQA6AAAgAkHAADYCiAQgAkEAOwGMBCACQQA2AY4EIAJBmAFqIAJBiARqQcQAEIsBGiACQagDaiIEIAJB1AFqKQIANwMAIAJBoANqIgUgAkHMAWopAgA3AwAgAkGYA2oiCSACQcQBaikCADcDACACQZADaiIKIAJBvAFqKQIANwMAIAJBiANqIgYgAkG0AWopAgA3AwAgAkGAA2oiByACQawBaikCADcDACACQfgCaiIIIAJBpAFqKQIANwMAIAIgAikCnAE3A/ACQfAAQQgQoQEiA0UNESADQQA2AgggA0IANwMAIAMgAikD8AI3AgwgA0EUaiAIKQMANwIAIANBHGogBykDADcCACADQSRqIAYpAwA3AgAgA0EsaiAKKQMANwIAIANBNGogCSkDADcCACADQTxqIAUpAwA3AgAgA0HEAGogBCkDADcCACADQeQAakGkmMAAKQIANwIAIANB3ABqQZyYwAApAgA3AgAgA0HUAGpBlJjAACkCADcCACADQYyYwAApAgA3AkxBiILAACEEQQAMCQsgAkGSBGpCADcBACACQZoEakEAOwEAIAJBnARqQgA3AgAgAkGkBGpCADcCACACQawEakIANwIAIAJBtARqQgA3AgAgAkG8BGpCADcCACACQcQEakEAOgAAIAJBxQRqQQA2AAAgAkHJBGpBADsAACACQcsEakEAOgAAIAJBwAA2AogEIAJBADsBjAQgAkEANgGOBCACQZgBaiACQYgEakHEABCLARogAkGoA2oiBCACQdQBaikCADcDACACQaADaiIFIAJBzAFqKQIANwMAIAJBmANqIgkgAkHEAWopAgA3AwAgAkGQA2oiCiACQbwBaikCADcDACACQYgDaiIGIAJBtAFqKQIANwMAIAJBgANqIgcgAkGsAWopAgA3AwAgAkH4AmoiCCACQaQBaikCADcDACACIAIpApwBNwPwAkHwAEEIEKEBIgNFDRAgA0EANgIIIANCADcDACADIAIpA/ACNwIMIANBFGogCCkDADcCACADQRxqIAcpAwA3AgAgA0EkaiAGKQMANwIAIANBLGogCikDADcCACADQTRqIAkpAwA3AgAgA0E8aiAFKQMANwIAIANBxABqIAQpAwA3AgAgA0HkAGpBxJjAACkCADcCACADQdwAakG8mMAAKQIANwIAIANB1ABqQbSYwAApAgA3AgAgA0GsmMAAKQIANwJMQbSCwAAhBEEADAgLIAJBADYCiAQgAkGIBGpBBHIhBEEAIQMDQCADIARqQQA6AAAgAiACKAKIBEEBajYCiAQgA0EBaiIDQYABRw0ACyACQZgBaiACQYgEakGEARCLARogAkHwAmogAkGYAWpBBHJBgAEQiwEaQdgBQQgQoQEiA0UNECADQgA3AwggA0IANwMAIANBADYCUCADQdCYwAApAwA3AxAgA0EYakHYmMAAKQMANwMAIANBIGpB4JjAACkDADcDACADQShqQeiYwAApAwA3AwAgA0EwakHwmMAAKQMANwMAIANBOGpB+JjAACkDADcDACADQUBrQYCZwAApAwA3AwAgA0HIAGpBiJnAACkDADcDACADQdQAaiACQfACakGAARCLARpB4ILAACEEQQAMBwsgAkGYAWpBAEHIARCRARogAkEANgLwAkEEIQMDQCACQfACaiADakEAOgAAIAIgAigC8AJBAWo2AvACIANBAWoiA0GUAUcNAAsgAkGIBGogAkHwAmpBlAEQiwEaIAJBCGogAkGIBGpBBHJBkAEQiwEaQeACQQgQoQEiA0UNECADIAJBmAFqQcgBEIsBIgRBADYCyAEgBEHMAWogAkEIakGQARCLARpBuIPAACEEQQAMBgsgAkGYAWpBAEHIARCRARogAkEANgLwAkEEIQMDQCACQfACaiADakEAOgAAIAIgAigC8AJBAWo2AvACIANBAWoiA0GMAUcNAAsgAkGIBGogAkHwAmpBjAEQiwEaIAJBCGogAkGIBGpBBHJBiAEQiwEaQdgCQQgQoQEiA0UNECADIAJBmAFqQcgBEIsBIgRBADYCyAEgBEHMAWogAkEIakGIARCLARpB5IPAACEEQQAMBQsgAkGYAWpBAEHIARCRARogAkEANgLwAkEEIQMDQCACQfACaiADakEAOgAAIAIgAigC8AJBAWo2AvACIANBAWoiA0HsAEcNAAsgAkGIBGogAkHwAmpB7AAQiwEaIAJBCGogAkGIBGpBBHJB6AAQiwEaQbgCQQgQoQEiA0UNECADIAJBmAFqQcgBEIsBIgRBADYCyAEgBEHMAWogAkEIakHoABCLARpBkITAACEEQQAMBAsgAkGYAWpBAEHIARCRARogAkEA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aiIBIAIgBHNzakHglu21f2pBEHcgAWoiAyABcyACIApqIAEgBHMgA3NqQfD4/vV7akEXdyADaiICc2pBxv3txAJqQQR3IAJqIgRqIAMgC2ogASATaiACIANzIARzakH6z4TVfmpBC3cgBGoiASACIARzc2pBheG8p31qQRB3IAFqIgMgAXMgAiAGaiABIARzIANzakGFuqAkakEXdyADaiICc2pBuaDTzn1qQQR3IAJqIgRqIAIgDGogASAJaiACIANzIARzakHls+62fmpBC3cgBGoiASAEcyADIBJqIAIgBHMgAXNqQfj5if0BakEQdyABaiICc2pB5ayxpXxqQRd3IAJqIgMgAUF/c3IgAnNqQcTEpKF/akEGdyADaiIEaiADIBVqIAIgCGogASAOaiAEIAJBf3NyIANzakGX/6uZBGpBCncgBGoiASADQX9zciAEc2pBp8fQ3HpqQQ93IAFqIgIgBEF/c3IgAXNqQbnAzmRqQRV3IAJqIgMgAUF/c3IgAnNqQcOz7aoGakEGdyADaiIEaiADIBRqIAIgCmogASALaiAEIAJBf3NyIANzakGSmbP4eGpBCncgBGoiASADQX9zciAEc2pB/ei/f2pBD3cgAWoiAiAEQX9zciABc2pB0buRrHhqQRV3IAJqIgMgAUF/c3IgAnNqQc/8of0GakEGdyADaiIEaiADIBFqIAIgBmogASASaiAEIAJBf3NyIANzakHgzbNxakEKdyAEaiIBIANBf3NyIARzakGUhoWYempBD3cgAWoiAiAEQX9zciABc2pBoaOg8ARqQRV3IAJqIgMgAUF/c3IgAnNqQYL9zbp/akEGdyADaiIEIAAoAgBqNgIAIAAgASAQaiAEIAJBf3NyIANzakG15Ovpe2pBCncgBGoiASAAKAIMajYCDCAAIAIgDGogASADQX9zciAEc2pBu6Xf1gJqQQ93IAFqIgIgACgCCGo2AgggACACIAAoAgRqIAMgD2ogAiAEQX9zciABc2pBkaeb3H5qQRV3ajYCBAvcDwEFfyAAIAEtAAAiAzoAECAAIAEtAAEiAjoAESAAIAEtAAIiBDoAEiAAIAEtAAMiBToAEyAAIAEtAAQiBjoAFCAAIAMgAC0AAHM6ACAgACACIAAtAAFzOgAhIAAgBCAALQACczoAIiAAIAUgAC0AA3M6ACMgACAGIAAt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BCARIAEgA0F/c3EgAyAEcXIgAmpqQQd3IgVBf3NxIAMgBXFyIAFqakELdyIBIAVyIBIgBCABIAVxIgQgAyABQX9zcXJqakETdyICcSAEcmogFGpBmfOJ1AVqQQN3IgMgByABIAUgAyABIAJycSABIAJxcmogDWpBmfOJ1AVqQQV3IgQgAiADcnEgAiADcXJqakGZ84nUBWpBCXciASAEciAJIAIgASADIARycSADIARxcmpqQZnzidQFakENdyICcSABIARxcmogDGpBmfOJ1AVqQQN3IgMgDyABIAQgAyABIAJycSABIAJxcmogFWpBmfOJ1AVqQQV3IgQgAiADcnEgAiADcXJqakGZ84nUBWpBCXciASAEciARIAIgASADIARycSADIARxcmpqQZnzidQFakENdyICcSABIARxcmogC2pBmfOJ1AVqQQN3IgMgCiABIAYgBCADIAEgAnJxIAEgAnFyampBmfOJ1AVqQQV3IgQgAiADcnEgAiADcXJqakGZ84nUBWpBCXciASAEciAIIAIgASADIARycSADIARxcmpqQZnzidQFakENdyICcSABIARxcmogE2pBmfOJ1AVqQQN3IgMgEiACIBAgASAOIAQgAyABIAJycSABIAJxcmpqQZnzidQFakEFdyIEIAIgA3JxIAIgA3FyampBmfOJ1AVqQQl3IgUgAyAEcnEgAyAEcXJqakGZ84nUBWpBDXciAyAFcyICIARzaiAUakGh1+f2BmpBA3ciASAJIAMgASAHIAQgASACc2pqQaHX5/YGakEJdyICcyAFIA1qIAEgA3MgAnNqQaHX5/YGakELdyIEc2pqQaHX5/YGakEPdyIDIARzIgUgAnNqIAtqQaHX5/YGakEDdyIBIAggAyABIAogAiABIAVzampBodfn9gZqQQl3IgJzIAQgBmogASADcyACc2pBodfn9gZqQQt3IgRzampBodfn9gZqQQ93IgMgBHMiBSACc2ogDGpBodfn9gZqQQN3IgEgESADIAEgDyACIAEgBXNqakGh1+f2BmpBCXciAnMgBCAVaiABIANzIAJzakGh1+f2BmpBC3ciBHNqakGh1+f2BmpBD3ciAyAEcyIFIAJzaiATakGh1+f2BmpBA3ciASAAKAIAajYCACAAIBAgAiABIAVzampBodfn9gZqQQl3IgIgACgCDGo2Agwg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IgVFDQULIAIgBDYCFCACIAU2AhALIAIoAhAhBSACQThqIgZCADcDACACQTBqIgdCADcDACACQShqIghCADcDACACQSBqIglCADcDACACQRhqIgpCADcDACACQgA3AxAgAkHqAGpCADcBACACQfIAakEAOwEAIAJBEDYCYCACQQA7AWQgAkEANgFmIAJBiAFqIAJB8ABqKAIANgIAIAJBgAFqIAJB6ABqKQMANwMAIAJB2ABqIgsgAkGEAWopAgA3AwAgAiACKQNgNwN4IAIgAikCfDcDUCACQcgAaiIMIAspAwA3AwAgAiACKQNQNwNAIANBOGogDCkDADcAACADQTBqIAIpA0A3AAAgA0EoaiAGKQMANwAAIANBIGogBykDADcAACADQRhqIAgpAwA3AAAgA0EQaiAJKQMANwAAIANBCGogCikDADcAACADIAIpAxA3AAAgAUEANgIAIAAgBDYCBCAAIAU2AgAgAkGQAWokAA8LQbCawABBFyACQRBqQaCXwABBsJfAABB5AAtBEEEBQbSlwAAoAgAiAEECIAAbEQAAAAtBh4zAAEEkQayMwAAQiAEACyAEQQFBtKXAACgCACIAQQIgABsRAAAAC9gIAQV/IABBeGoiASAAQXxqKAIAIgNBeHEiAGohAgJAAkACQAJAIANBAXENACADQQNxRQ0BIAEoAgAiAyAAaiEAIAEgA2siAUH8pMAAKAIARgRAIAIoAgRBA3FBA0cNAUH0pMAAIAA2AgAgAiACKAIEQX5xNgIEIAEgAEEBcjYCBCAAIAFqIAA2AgAPCyABIAMQTAsCQCACQQRqIgQoAgAiA0ECcQRAIAQgA0F+cTYCACABIABBAXI2AgQgACABaiAANgIADAELAkAgAkGApcAAKAIARwRAQfykwAAoAgAgAkYNASACIANBeHEiAhBMIAEgACACaiIAQQFyNgIEIAAgAWogADYCACABQfykwAAoAgBHDQJB9KTAACAANgIADwtBgKXAACABNgIAQfikwABB+KTAACgCACAAaiIANgIAIAEgAEEBcjYCBEH8pMAAKAIAIAFGBEBB9KTAAEEANgIAQfykwABBADYCAAtBnKXAACgCACICIABPDQJBgKXAACgCACIARQ0CAkBB+KTAACgCACIDQSlJDQBBjKXAACEBA0AgASgCACIEIABNBEAgBCABKAIEaiAASw0CCyABKAIIIgENAAsLQaSlwAACf0H/H0GUpcAAKAIAIgBFDQAaQQAhAQNAIAFBAWohASAAKAIIIgANAAsgAUH/HyABQf8fSxsLNgIAIAMgAk0NAkGcpcAAQX82AgAPC0H8pMAAIAE2AgBB9KTAAEH0pMAAKAIAIABqIgA2AgAgASAAQQFyNgIEIAAgAWogADYCAA8LIABBgAJJDQEgAUIANwIQIAFBHGoCf0EAIABBCHYiA0UNABpBHyAAQf///wdLDQAaIABBBiADZyICa0EfcXZBAXEgAkEBdGtBPmoLIgI2AgAgAkECdEH0o8AAaiEDAkACQAJAAkACQEHoocAAKAIAIgRBASACQR9xdCIFcQRAIAMoAgAiA0EEaigCAEF4cSAARw0BIAMhAgwCC0HoocAAIAQgBXI2AgAgAyABNgIADAMLIABBAEEZIAJBAXZrQR9xIAJBH0YbdCEEA0AgAyAEQR12QQRxakEQaiIFKAIAIgJFDQIgBEEBdCEEIAIhAyACQQRqKAIAQXhxIABHDQALCyACKAIIIgAgATYCDCACIAE2AgggAUEYakEANgIAIAEgAjYCDCABIAA2AggMAgsgBSABNgIACyABQRhqIAM2AgAgASABNgIMIAEgATYCCAtBpKXAAEGkpcAAKAIAQX9qIgA2AgAgAEUNAgsPCyAAQQN2IgJBA3RB7KHAAGohAAJ/QeShwAAoAgAiA0EBIAJ0IgJxBEAgACgCCAwBC0HkocAAIAIgA3I2AgAgAAshAiAAIAE2AgggAiABNgIMIAEgADYCDCABIAI2AggPC0GkpcAAAn9B/x9BlKXAACgCACIARQ0AGkEAIQEDQCABQQFqIQEgACgCCCIADQALIAFB/x8gAUH/H0sbCzYCAAvOBwIGfwN+IwBBQGoiAiQAIAAQQCACQThqIgMgAEHIAGopAwA3AwAgAkEwaiIEIABBQGspAwA3AwAgAkEoaiIFIABBOGopAwA3AwAgAkEgaiIGIABBMGopAwA3AwAgAkEYaiIHIABBKGopAwA3AwAgAkEIaiAAQRhqKQMAIgg3AwAgAkEQaiAAQSBqKQMAIgk3AwAgASAAKQMQIgpCOIYgCkIohkKAgICAgIDA/wCDhCAKQhiGQoCAgICA4D+DIApCCIZCgICAgPAfg4SEIApCCIhCgICA+A+DIApCGIhCgID8B4OEIApCKIhCgP4DgyAKQjiIhISENwAAIAEgCEIohkKAgICAgIDA/wCDIAhCOIaEIAhCGIZCgICAgIDgP4MgCEIIhkKAgICA8B+DhIQgCEIIiEKAgID4D4MgCEIYiEKAgPwHg4QgCEIoiEKA/gODIAhCOIiEhIQ3AAggASAJQiiGQoCAgICAgMD/AIMgCUI4hoQgCUIYhkKAgICAgOA/gyAJQgiGQoCAgIDwH4OEhCAJQgiIQoCAgPgPgyAJQhiIQoCA/AeDhCAJQiiIQoD+A4MgCUI4iISEhDcAECACIAo3AwAgASAHKQMAIghCOIYgCEIohkKAgICAgIDA/wCDhCAIQhiGQoCAgICA4D+DIAhCCIZCgICAgPAfg4SEIAhCCIhCgICA+A+DIAhCGIhCgID8B4OEIAhCKIhCgP4DgyAIQjiIhISENwAYIAEgBikDACIIQjiGIAhCKIZCgICAgICAwP8Ag4QgCEIYhkKAgICAgOA/gyAIQgiGQoCAgIDwH4OEhCAIQgiIQoCAgPgPgyAIQhiIQoCA/AeDhCAIQiiIQoD+A4MgCEI4iISEhDcAICABIAUpAwAiCEI4hiAIQiiGQoCAgICAgMD/AIOEIAhCGIZCgICAgIDgP4MgCEIIhkKAgICA8B+DhIQgCEIIiEKAgID4D4MgCEIYiEKAgPwHg4QgCEIoiEKA/gODIAhCOIiEhIQ3ACggASAEKQMAIghCOIYgCEIohkKAgICAgIDA/wCDhCAIQhiGQoCAgICA4D+DIAhCCIZCgICAgPAfg4SEIAhCCIhCgICA+A+DIAhCGIhCgID8B4OEIAhCKIhCgP4DgyAIQjiIhISENwAwIAEgAykDACIIQjiGIAhCKIZCgICAgICAwP8Ag4QgCEIYhkKAgICAgOA/gyAIQgiGQoCAgIDwH4OEhCAIQgiIQoCAgPgPgyAIQhiIQoCA/AeDhCAIQiiIQoD+A4MgCEI4iISEhDcAOCACQUBrJAALwgYBDH8gACgCECEDAkACQAJAAkAgACgCCCINQQFHBEAgA0EBRg0BIAAoAhggASACIABBHGooAgAoAgwRAwAhAwwDCyADQQFHDQELAkAgAkUEQEEAIQIMAQsgASACaiEHIABBFGooAgBBAWohCiABIgMhCwNAIANBAWohBQJAAn8gAywAACIEQX9MBEACfyAFIAdGBEBBACEIIAcMAQsgAy0AAUE/cSEIIANBAmoiBQshAyAEQR9xIQkgCCAJQQZ0ciAEQf8BcSIOQd8BTQ0BGgJ/IAMgB0YEQEEAIQwgBwwBCyADLQAAQT9xIQwgA0EBaiIFCyEEIAwgCEEGdHIhCCAIIAlBDHRyIA5B8AFJDQEaAn8gBCAHRgRAIAUhA0EADAELIARBAWohAyAELQAAQT9xCyAJQRJ0QYCA8ABxIAhBBnRyciIEQYCAxABHDQIMBAsgBEH/AXELIQQgBSEDCyAKQX9qIgoEQCAGIAtrIANqIQYgAyELIAMgB0cNAQwCCwsgBEGAgMQARg0AAkAgBkUgAiAGRnJFBEBBACEDIAYgAk8NASABIAZqLAAAQUBIDQELIAEhAwsgBiACIAMbIQIgAyABIAMbIQELIA1BAUYNAAwCC0EAIQUgAgRAIAIhBCABIQMDQCAFIAMtAABBwAFxQYABRmohBSADQQFqIQMgBEF/aiIEDQALCyACIAVrIAAoAgwiB08NAUEAIQZBACEFIAIEQCACIQQgASEDA0AgBSADLQAAQcABcUGAAUZqIQUgA0EBaiEDIARBf2oiBA0ACwsgBSACayAHaiIDIQQCQAJAAkBBACAALQAgIgUgBUEDRhtBAWsOAwEAAQILIANBAXYhBiADQQFqQQF2IQQMAQtBACEEIAMhBgsgBkEBaiEDAkADQCADQX9qIgNFDQEgACgCGCAAKAIEIAAoAhwoAhARAQBFDQALQQEPCyAAKAIEIQVBASEDIAAoAhggASACIAAoAhwoAgwRAwANACAEQQFqIQMgACgCHCEBIAAoAhghAANAIANBf2oiA0UEQEEADwsgACAFIAEoAhARAQBFDQALQQEPCyADDwsgACgCGCABIAIgAEEcaigCACgCDBEDAAvOBgEEfyMAQaABayICJAAgAkE6akIANwEAIAJBwgBqQQA7AQAgAkHEAGpCADcCACACQcwAakIANwIAIAJB1ABqQgA3AgAgAkHcAGpCADcCACACQQA7ATQgAkEANgE2IAJBMDYCMCACQZABaiACQdgAaikDADcDACACQYgBaiACQdAAaikDADcDACACQYABaiACQcgAaikDADcDACACQfgAaiACQUBrKQMANwMAIAJB8ABqIAJBOGopAwA3AwAgAkGYAWogAkHgAGooAgA2AgAgAiACKQMwNwNoIAJBIGogAkGMAWopAgA3AwAgAkEYaiACQYQBaikCADcDACACQRBqIAJB/ABqKQIANwMAIAJBCGogAkH0AGopAgA3AwAgAkEoaiACQZQBaikCADcDACACIAIpAmw3AwAgASACEB8gAUIANwMIIAFCADcDACABQQA2AlAgAUHQmMAAKQMANwMQIAFBGGpB2JjAACkDADcDACABQSBqQeCYwAApAwA3AwAgAUEoakHomMAAKQMANwMAIAFBMGpB8JjAACkDADcDACABQThqQfiYwAApAwA3AwAgAUFAa0GAmcAAKQMANwMAIAFByABqQYiZwAApAwA3AwACQAJAQTBBARChASIDBEAgAkIwNwJsIAIgAzYCaCACQegAaiACQTAQXgJAIAIoAmwiBCACKAJwIgNGBEAgBCEDDAELIAQgA0kNAiAERQ0AIAIoAmghBQJAIANFBEAgBRAQQQEhBAwBCyAFIARBASADEJoBIgRFDQQLIAIgAzYCbCACIAQ2AmgLIAIoAmghBCABQgA3AwggAUIANwMAIAFBADYCUCABQRBqIgFB0JjAACkDADcDACABQQhqQdiYwAApAwA3AwAgAUEQakHgmMAAKQMANwMAIAFBGGpB6JjAACkDADcDACABQSBqQfCYwAApAwA3AwAgAUEoakH4mMAAKQMANwMAIAFBMGpBgJnAACkDADcDACABQThqQYiZwAApAwA3AwAgACADNgIEIAAgBDYCACACQaABaiQADwtBMEEBQbSlwAAoAgAiAEECIAAbEQAAAAtBh4zAAEEkQayMwAAQiAEACyADQQFBtKXAACgCACIAQQIgABsRAAAAC78GAQR/IAAgAWohAgJAAkACQAJAAkAgAEEEaigCACIDQQFxDQAgA0EDcUUNASAAKAIAIgMgAWohASAAIANrIgBB/KTAACgCAEYEQCACKAIEQQNxQQNHDQFB9KTAACABNgIAIAIgAigCBEF+cTYCBCAAIAFBAXI2AgQgAiABNgIADwsgACADEEwLAkAgAkEEaigCACIDQQJxBEAgAkEEaiADQX5xNgIAIAAgAUEBcjYCBCAAIAFqIAE2AgAMAQsCQCACQYClwAAoAgBHBEBB/KTAACgCACACRg0BIAIgA0F4cSICEEwgACABIAJqIgFBAXI2AgQgACABaiABNgIAIABB/KTAACgCAEcNAkH0pMAAIAE2AgAPC0GApcAAIAA2AgBB+KTAAEH4pMAAKAIAIAFqIgE2AgAgACABQQFyNgIEIABB/KTAACgCAEcNAkH0pMAAQQA2AgBB/KTAAEEANgIADwtB/KTAACAANgIAQfSkwABB9KTAACgCACABaiIBNgIAIAAgAUEBcjYCBCAAIAFqIAE2AgAPCyABQYACSQ0DIABCADcCECAAQRxqAn9BACABQQh2IgNFDQAaQR8gAUH///8HSw0AGiABQQYgA2ciAmtBH3F2QQFxIAJBAXRrQT5qCyICNgIAIAJBAnRB9KPAAGohAwJAAkBB6KHAACgCACIEQQEgAkEfcXQiBXEEQCADKAIAIgNBBGooAgBBeHEgAUcNASADIQIMAgtB6KHAACAEIAVyNgIAIAMgADYCAAwECyABQQBBGSACQQF2a0EfcSACQR9GG3QhBANAIAMgBEEddkEEcWpBEGoiBSgCACICRQ0DIARBAXQhBCACIQMgAkEEaigCAEF4cSABRw0ACwsgAigCCCIBIAA2AgwgAiAANgIIIABBGGpBADYCACAAIAI2AgwgACABNgIICw8LIAUgADYCAAsgAEEYaiADNgIAIAAgADYCDCAAIAA2AggPCyABQQN2IgJBA3RB7KHAAGohAQJ/QeShwAAoAgAiA0EBIAJ0IgJxBEAgASgCCAwBC0HkocAAIAIgA3I2AgAgAQshAiABIAA2AgggAiAANgIMIAAgATYCDCAAIAI2AggL1AYBBH8jAEHQAWsiAiQAIAJBygBqQgA3AQAgAkHSAGpBADsBACACQdQAakIANwIAIAJB3ABqQgA3AgAgAkHkAGpCADcCACACQewAakIANwIAIAJB9ABqQgA3AgAgAkH8AGpBADoAACACQf0AakEANgAAIAJBgQFqQQA7AAAgAkGDAWpBADoAACACQQA7AUQgAkEANgFGIAJBwAA2AkAgAkGIAWogAkFAa0HEABCLARogAkE4aiACQcQBaikCADcDACACQTBqIAJBvAFqKQIANwMAIAJBKGogAkG0AWopAgA3AwAgAkEgaiACQawBaikCADcDACACQRhqIAJBpAFqKQIANwMAIAJBEGogAkGcAWopAgA3AwAgAkEIaiACQZQBaikCADcDACACIAIpAowBNwMAIAEgAhARIAFCADcDCCABQgA3AwAgAUEANgJQIAFBkJnAACkDADcDECABQRhqQZiZwAApAwA3AwAgAUEgakGgmcAAKQMANwMAIAFBKGpBqJnAACkDADcDACABQTBqQbCZwAApAwA3AwAgAUE4akG4mcAAKQMANwMAIAFBQGtBwJnAACkDADcDACABQcgAakHImcAAKQMANwMAAkACQEHAAEEBEKEBIgMEQCACQsAANwKMASACIAM2AogBIAJBiAFqIAJBwAAQXgJAIAIoAowBIgQgAigCkAEiA0YEQCAEIQMMAQsgBCADSQ0CIARFDQAgAigCiAEhBQJAIANFBEAgBRAQQQEhBAwBCyAFIARBASADEJoBIgRFDQQLIAIgAzYCjAEgAiAENgKIAQsgAigCiAEhBCABQgA3AwggAUIANwMAIAFBADYCUCABQRBqIgFBkJnAACkDADcDACABQQhqQZiZwAApAwA3AwAgAUEQakGgmcAAKQMANwMAIAFBGGpBqJnAACkDADcDACABQSBqQbCZwAApAwA3AwAgAUEoakG4mcAAKQMANwMAIAFBMGpBwJnAACkDADcDACABQThqQciZwAApAwA3AwAgACADNgIEIAAgBDYCACACQdABaiQADwtBwABBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgA0EBQbSlwAAoAgAiAEECIAAbEQAAAAuOBgEKfyMAQTBrIgIkACACQSRqQYCHwAA2AgAgAkEDOgAoIAJCgICAgIAENwMIIAIgADYCICACQQA2AhggAkEANgIQAn8CQAJAAkAgASgCCCIDBEAgASgCACEFIAEoAgQiCCABQQxqKAIAIgYgBiAISxsiBkUNASABQRRqKAIAIQcgASgCECEJIAAgBSgCACAFKAIEQYyHwAAoAgARAwANAyAFQQhqIQECQAJAA0AgAiADQQRqKAIANgIMIAIgA0Ecai0AADoAKCACIANBCGooAgA2AgggA0EYaigCACEAQQAhBAJAAkACQCADQRRqKAIAQQFrDgIAAgELIAAgB08NAyAAQQN0IAlqIgooAgRBA0cNASAKKAIAKAIAIQALQQEhBAsgAiAANgIUIAIgBDYCECADQRBqKAIAIQBBACEEAkACQAJAIANBDGooAgBBAWsOAgACAQsgACAHTw0EIABBA3QgCWoiCigCBEEDRw0BIAooAgAoAgAh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IQEgACgCGCEAA0AgBkF/aiIGRQRAQQAPCyAAIAcgASgCEBEBAEUNAAsLIAULtwUBBH8jAEGQAWsiAiQAIAJBOmpCADcBACACQcIAakEAOwEAIAJBxABqQgA3AgAgAkHMAGpCADcCACACQdQAakIANwIAIAJBADsBNCACQQA2ATYgAkEoNgIwIAJBgAFqIAJB0ABqKQMANwMAIAJB+ABqIAJByABqKQMANwMAIAJB8ABqIAJBQGspAwA3AwAgAkHoAGogAkE4aikDADcDACACQYgBaiACQdgAaigCADYCACACIAIpAzA3A2AgAkEgaiACQfwAaikCADcDACACQRhqIAJB9ABqKQIANwMAIAJBEGogAkHsAGopAgA3AwAgAkEoaiACQYQBaikCADcDACACIAIpAmQ3AwggASACQQhqEE0gAUIANwMAIAFBADYCMCABQdCXwAApAwA3AwggAUEQakHYl8AAKQMANwMAIAFBGGpB4JfAACkDADcDACABQSBqQeiXwAApAwA3AwAgAUEoakHwl8AAKQMANwMAAkACQEEoQQEQoQEiAwRAIAJCKDcCZCACIAM2AmAgAkHgAGogAkEIakEoEF4CQCACKAJkIgQgAigCaCIDRgRAIAQhAwwBCyAEIANJDQIgBEUNACACKAJgIQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0ECyACIAM2AmQgAiAENgJgCyACKAJgIQQgAUIANwMAIAFBADYCMCABQQhqIgFB0JfAACkDADcDACABQQhqQdiXwAApAwA3AwAgAUEQakHgl8AAKQMANwMAIAFBGGpB6JfAACkDADcDACABQSBqQfCXwAApAwA3AwAgACADNgIEIAAgBDYCACACQZABaiQADwtBKEEBQbSlwAAoAgAiAEECIAAbEQAAAAtBh4zAAEEkQayMwAAQiAEACyADQQFBtKXAACgCACIAQQIgABsRAAAAC8YEAQR/IwBBoAFrIgIkACACQTpqQgA3AQAgAkHCAGpBADsBACACQcQAakIANwIAIAJBzABqQgA3AgAgAkHUAGpCADcCACACQdwAakIANwIAIAJBADsBNCACQQA2ATYgAkEwNgIwIAJBkAFqIAJB2ABqKQMANwMAIAJBiAFqIAJB0ABqKQMANwMAIAJBgAFqIAJByABqKQMANwMAIAJB+ABqIAJBQGspAwA3AwAgAkHwAGogAkE4aikDADcDACACQZgBaiACQeAAaigCADYCACACIAIpAzA3A2ggAkEgaiACQYwBaikCADcDACACQRhqIAJBhAFqKQIANwMAIAJBEGogAkH8AGopAgA3AwAgAkEIaiACQfQAaikCADcDACACQShqIAJBlAFqKQIANwMAIAIgAikCbDcDACABIAIQYyABQQBByAEQkQEiBUEANgLIAQJAAkBBMEEBEKEBIgEEQCACQjA3AmwgAiABNgJoIAJB6ABqIAJBMBBeAkAgAigCbCIDIAIoAnAiAUYEQCADIQEMAQsgAyABSQ0CIANFDQAgAigCaCEEAkAgAUUEQCAEEBBBASEDDAELIAQgA0EBIAEQmgEiA0UNBAsgAiABNgJsIAIgAzYCaAsgAigCaCEDIAVBAEHIARCRAUEANgLIASAAIAE2AgQgACADNgIAIAJBoAFqJAAPC0EwQQFBtKXAACgCACIAQQIgABsRAAAAC0GHjMAAQSRBrIzAABCIAQALIAFBAUG0pcAAKAIAIgBBAiAAGxEAAAALxgQBBH8jAEGgAWsiAiQAIAJBOmpCADcBACACQcIAakEAOwEAIAJBxABqQgA3AgAgAkHMAGpCADcCACACQdQAakIANwIAIAJB3ABqQgA3AgAgAkEAOwE0IAJBADYBNiACQTA2AjAgAkGQAWogAkHYAGopAwA3AwAgAkGIAWogAkHQAGopAwA3AwAgAkGAAWogAkHIAGopAwA3AwAgAkH4AGogAkFAaykDADcDACACQfAAaiACQThqKQMANwMAIAJBmAFqIAJB4ABqKAIANgIAIAIgAikDMDcDaCACQSBqIAJBjAFqKQIANwMAIAJBGGogAkGEAWopAgA3AwAgAkEQaiACQfwAaikCADcDACACQQhqIAJB9ABqKQIANwMAIAJBKGogAkGUAWopAgA3AwAgAiACKQJsNwMAIAEgAhBkIAFBAEHIARCRASIFQQA2AsgBAkACQEEwQQEQoQEiAQRAIAJCMDcCbCACIAE2AmggAkHoAGogAkEwEF4CQCACKAJsIgMgAigCcCIBRgRAIAMhAQwBCyADIAFJDQIgA0UNACACKAJoIQQCQCABRQRAIAQQEEEBIQMMAQsgBCADQQEgARCaASIDRQ0ECyACIAE2AmwgAiADNgJoCyACKAJoIQMgBUEAQcgBEJEBQQA2AsgBIAAgATYCBCAAIAM2AgAgAkGgAWokAA8LQTBBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgAUEBQbSlwAAoAgAiAEECIAAbEQAAAAu8BAEEfyMAQaADayICJAAgAkHyAmpCADcBACACQfoCakEAOwEAIAJB/AJqQgA3AgAgAkGEA2pCADcCACACQYwDakIANwIAIAJBlANqQgA3AgAgAkEAOwHsAiACQQA2Ae4CIAJBMDYC6AIgAkHYAGogAkGQA2opAwA3AwAgAkHQAGogAkGIA2opAwA3AwAgAkHIAGogAkGAA2opAwA3AwAgAkFAayACQfgCaikDADcDACACQThqIAJB8AJqKQMANwMAIAJB4ABqIAJBmANqKAIANgIAIAIgAikD6AI3AzAgAkEgaiACQdQAaikCADcDACACQRhqIAJBzABqKQIANwMAIAJBEGogAkHEAGopAgA3AwAgAkEIaiACQTxqKQIANwMAIAJBKGogAkHcAGopAgA3AwAgAiACKQI0NwMAIAJBMGogAUG4AhCLARogAkEwaiACEGMCQAJAQTBBARChASIDBEAgAkIwNwI0IAIgAzYCMCACQTBqIAJBMBBeAkAgAigCNCIEIAIoAjgiA0YEQCAEIQMMAQsgBCADSQ0CIARFDQAgAigCMCEFAkAgA0UEQCAFEBBBASEEDAELIAUgBEEBIAMQmgEiBEUNBAsgAiADNgI0IAIgBDYCMAsgAigCMCEEIAEQECAAIAM2AgQgACAENgIAIAJBoANqJAAPC0EwQQFBtKXAACgCACIAQQIgABsRAAAAC0GHjMAAQSRBrIzAABCIAQALIANBAUG0pcAAKAIAIgBBAiAAGxEAAAALvAQBBH8jAEGgA2siAiQAIAJB8gJqQgA3AQAgAkH6AmpBADsBACACQfwCakIANwIAIAJBhANqQgA3AgAgAkGMA2pCADcCACACQZQDakIANwIAIAJBADsB7AIgAkEANgHuAiACQTA2AugCIAJB2ABqIAJBkANqKQMANwMAIAJB0ABqIAJBiANqKQMANwMAIAJByABqIAJBgANqKQMANwMAIAJBQGsgAkH4AmopAwA3AwAgAkE4aiACQfACaikDADcDACACQeAAaiACQZgDaigCADYCACACIAIpA+gCNwMwIAJBIGogAkHUAGopAgA3AwAgAkEYaiACQcwAaikCADcDACACQRBqIAJBxABqKQIANwMAIAJBCGogAkE8aikCADcDACACQShqIAJB3ABqKQIANwMAIAIgAikCNDcDACACQTBqIAFBuAIQiwEaIAJBMGogAhBkAkACQEEwQQEQoQEiAwRAIAJCMDcCNCACIAM2AjAgAkEwaiACQTAQXgJAIAIoAjQiBCACKAI4IgNGBEAgBCEDDAELIAQgA0kNAiAERQ0AIAIoAjAhBQJAIANFBEAgBRAQQQEhBAwBCyAFIARBASADEJoBIgRFDQQLIAIgAzYCNCACIAQ2AjALIAIoAjAhBCABEBAgACADNgIEIAAgBDYCACACQaADaiQADwtBMEEBQbSlwAAoAgAiAEECIAAbEQAAAAtBh4zAAEEkQayMwAAQiAEACyADQQFBtKXAACgCACIAQQIgABsRAAAAC7wEAQR/IwBBwAJrIgIkACACQZICakIANwEAIAJBmgJqQQA7AQAgAkGcAmpCADcCACACQaQCakIANwIAIAJBrAJqQgA3AgAgAkG0AmpCADcCACACQQA7AYwCIAJBADYBjgIgAkEwNgKIAiACQdgAaiACQbACaikDADcDACACQdAAaiACQagCaikDADcDACACQcgAaiACQaACaikDADcDACACQUBrIAJBmAJqKQMANwMAIAJBOGogAkGQAmopAwA3AwAgAkHgAGogAkG4AmooAgA2AgAgAiACKQOIAjcDMCACQSBqIAJB1ABqKQIANwMAIAJBGGogAkHMAGopAgA3AwAgAkEQaiACQcQAaikCADcDACACQQhqIAJBPGopAgA3AwAgAkEoaiACQdwAaikCADcDACACIAIpAjQ3AwAgAkEwaiABQdgBEIsBGiACQTBqIAIQHwJAAkBBMEEBEKEBIgMEQCACQjA3AjQgAiADNgIwIAJBMGogAkEwEF4CQCACKAI0IgQgAigCOCIDRgRAIAQhAwwBCyAEIANJDQIgBEUNACACKAIwIQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0ECyACIAM2AjQgAiAENgIwCyACKAIwIQQgARAQIAAgAzYCBCAAIAQ2AgAgAkHAAmokAA8LQTBBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgA0EBQbSlwAAoAgAiAEECIAAbEQAAAAuBBQEBfiAAEEAgASAAKQMQIgJCOIYgAkIohkKAgICAgIDA/wCDhCACQhiGQoCAgICA4D+DIAJCCIZCgICAgPAfg4SEIAJCCIhCgICA+A+DIAJCGIhCgID8B4OEIAJCKIhCgP4DgyACQjiIhISENwAAIAEgAEEYaikDACICQjiGIAJCKIZCgICAgICAwP8Ag4QgAkIYhkKAgICAgOA/gyACQgiGQoCAgIDwH4OEhCACQgiIQoCAgPgPgyACQhiIQoCA/AeDhCACQiiIQoD+A4MgAkI4iISEhDcACCABIABBIGopAwAiAkI4hiACQiiGQoCAgICAgMD/AIOEIAJCGIZCgICAgIDgP4MgAkIIhkKAgICA8B+DhIQgAkIIiEKAgID4D4MgAkIYiEKAgPwHg4QgAkIoiEKA/gODIAJCOIiEhIQ3ABAgASAAQShqKQMAIgJCOIYgAkIohkKAgICAgIDA/wCDhCACQhiGQoCAgICA4D+DIAJCCIZCgICAgPAfg4SEIAJCCIhCgICA+A+DIAJCGIhCgID8B4OEIAJCKIhCgP4DgyACQjiIhISENwAYIAEgAEEwaikDACICQjiGIAJCKIZCgICAgICAwP8Ag4QgAkIYhkKAgICAgOA/gyACQgiGQoCAgIDwH4OEhCACQgiIQoCAgPgPgyACQhiIQoCA/AeDhCACQiiIQoD+A4MgAkI4iISEhDcAICABIABBOGopAwAiAkI4hiACQiiGQoCAgICAgMD/AIOEIAJCGIZCgICAgIDgP4MgAkIIhkKAgICA8B+DhIQgAkIIiEKAgID4D4MgAkIYiEKAgPwHg4QgAkIoiEKA/gODIAJCOIiEhIQ3ACgLyQQCBX8BfiAAQSBqIQMgAEEIaiEEIAApAwAhBwJAAkAgACgCHCICQcAARgRAIAQgA0EBEAhBACECIABBADYCHAwBCyACQT9LDQELIABBHGoiBSACakEEakGAAToAACAAIAAoAhwiBkEBaiICNgIcAkAgAkHBAEkEQCACIAVqQQRqQQBBPyAGaxCRARpBwAAgACgCHGtBB00EQCAEIANBARAIIAAoAhwiAkHBAE8NAiAAQSBqQQAgAhCRARoLIABB2ABqIAdCA4YiB0I4hiAHQiiGQoCAgICAgMD/AIOEIAdCGIZCgICAgIDgP4MgB0IIhkKAgICA8B+DhIQgB0IIiEKAgID4D4MgB0IYiEKAgPwHg4QgB0IoiEKA/gODIAdCOIiEhIQ3AgAgBCADQQEQCCAAQQA2AhwgASAAKAIIIgJBGHQgAkEIdEGAgPwHcXIgAkEIdkGA/gNxIAJBGHZycjYAACABIABBDGooAgAiAkEYdCACQQh0QYCA/AdxciACQQh2QYD+A3EgAkEYdnJyNgAEIAEgAEEQaigCACICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2AAggASAAQRRqKAIAIgJBGHQgAkEIdEGAgPwHcXIgAkEIdkGA/gNxIAJBGHZycjYADCABIABBGGooAgAiAEEYdCAAQQh0QYCA/AdxciAAQQh2QYD+A3EgAEEYdnJyNgAQDwsgAkHAAEGAmsAAEH4ACyACQcAAQZCawAAQfQALIAJBwABBoJrAABB8AAviBAEEfyMAQfAAayICJAAgAkEqakIANwEAIAJBMmpBADsBACACQTRqQgA3AgAgAkE8akIANwIAIAJBADsBJCACQQA2ASYgAkEgNgIgIAJB4ABqIAJBOGopAwA3AwAgAkHYAGogAkEwaikDADcDACACQdAAaiACQShqKQMANwMAIAJB6ABqIAJBQGsoAgA2AgAgAiACKQMgNwNIIAJBEGogAkHcAGopAgA3AwAgAkEIaiACQdQAaikCADcDACACQRhqIAJB5ABqKQIANwMAIAIgAikCTDcDACABIAIQOyABQQA2AgggAUIANwMAIAFBrJjAACkCADcCTCABQdQAakG0mMAAKQIANwIAIAFB3ABqQbyYwAApAgA3AgAgAUHkAGpBxJjAACkCADcCAAJAAkBBIEEBEKEBIgMEQCACQiA3AkwgAiADNgJIIAJByABqIAJBIBBeAkAgAigCTCIEIAIoAlAiA0YEQCAEIQMMAQsgBCADSQ0CIARFDQAgAigCSCEFAkAgA0UEQCAFEBBBASEEDAELIAUgBEEBIAMQmgEiBEUNBAsgAiADNgJMIAIgBDYCSAsgAigCSCEEIAFBADYCCCABQgA3AwAgAUHMAGoiAUGsmMAAKQIANwIAIAFBCGpBtJjAACkCADcCACABQRBqQbyYwAApAgA3AgAgAUEYakHEmMAAKQIANwIAIAAgAzYCBCAAIAQ2AgAgAkHwAGokAA8LQSBBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgA0EBQbSlwAAoAgAiAEECIAAbEQAAAAvMBAEEfyMAQdABayICJAAgAkHKAGpCADcBACACQdIAakEAOwEAIAJB1ABqQgA3AgAgAkHcAGpCADcCACACQeQAakIANwIAIAJB7ABqQgA3AgAgAkH0AGpCADcCACACQfwAakEAOgAAIAJB/QBqQQA2AAAgAkGBAWpBADsAACACQYMBakEAOgAAIAJBADsBRCACQQA2AUYgAkHAADYCQCACQYgBaiACQUBrQcQAEIsBGiACQThqIAJBxAFqKQIANwMAIAJBMGogAkG8AWopAgA3AwAgAkEoaiACQbQBaikCADcDACACQSBqIAJBrAFqKQIANwMAIAJBGGogAkGkAWopAgA3AwAgAkEQaiACQZwBaikCADcDACACQQhqIAJBlAFqKQIANwMAIAIgAikCjAE3AwAgASACEFsgAUEAQcgBEJEBIgVBADYCyAECQAJAQcAAQQEQoQEiAQRAIAJCwAA3AowBIAIgATYCiAEgAkGIAWogAkHAABBeAkAgAigCjAEiAyACKAKQASIBRgRAIAMhAQwBCyADIAFJDQIgA0UNACACKAKIASEEAkAgAUUEQCAEEBBBASEDDAELIAQgA0EBIAEQmgEiA0UNBAsgAiABNgKMASACIAM2AogBCyACKAKIASEDIAVBAEHIARCRAUEANgLIASAAIAE2AgQgACADNgIAIAJB0AFqJAAPC0HAAEEBQbSlwAAoAgAiAEECIAAbEQAAAAtBh4zAAEEkQayMwAAQiAEACyABQQFBtKXAACgCACIAQQIgABsRAAAAC8wEAQR/IwBB0AFrIgIkACACQcoAakIANwEAIAJB0gBqQQA7AQAgAkHUAGpCADcCACACQdwAakIANwIAIAJB5ABqQgA3AgAgAkHsAGpCADcCACACQfQAakIANwIAIAJB/ABqQQA6AAAgAkH9AGpBADYAACACQYEBakEAOwAAIAJBgwFqQQA6AAAgAkEAOwFEIAJBADYBRiACQcAANgJAIAJBiAFqIAJBQGtBxAAQiwEaIAJBOGogAkHEAWopAgA3AwAgAkEwaiACQbwBaikCADcDACACQShqIAJBtAFqKQIANwMAIAJBIGogAkGsAWopAgA3AwAgAkEYaiACQaQBaikCADcDACACQRBqIAJBnAFqKQIANwMAIAJBCGogAkGUAWopAgA3AwAgAiACKQKMATcDACABIAIQXCABQQBByAEQkQEiBUEANgLIAQJAAkBBwABBARChASIBBEAgAkLAADcCjAEgAiABNgKIASACQYgBaiACQcAAEF4CQCACKAKMASIDIAIoApABIgFGBEAgAyEBDAELIAMgAUkNAiADRQ0AIAIoAogBIQQCQCABRQRAIAQQEEEBIQMMAQsgBCADQQEgARCaASIDRQ0ECyACIAE2AowBIAIgAzYCiAELIAIoAogBIQMgBUEAQcgBEJEBQQA2AsgBIAAgATYCBCAAIAM2AgAgAkHQAWokAA8LQcAAQQFBtKXAACgCACIAQQIgABsRAAAAC0GHjMAAQSRBrIzAABCIAQALIAFBAUG0pcAAKAIAIgBBAiAAGxEAAAALuAQBBH8jAEGgA2siAiQAIAJB4gJqQgA3AQAgAkHqAmpBADsBACACQewCakIANwIAIAJB9AJqQgA3AgAgAkH8AmpCADcCACACQYQDakIANwIAIAJBjANqQgA3AgAgAkGUA2pBADoAACACQZUDakEANgAAIAJBmQNqQQA7AAAgAkGbA2pBADoAACACQQA7AdwCIAJBADYB3gIgAkHAADYC2AIgAkFAayACQdgCakHEABCLARogAkE4aiACQfwAaikCADcDACACQTBqIAJB9ABqKQIANwMAIAJBKGogAkHsAGopAgA3AwAgAkEgaiACQeQAaikCADcDACACQRhqIAJB3ABqKQIANwMAIAJBEGogAkHUAGopAgA3AwAgAkEIaiACQcwAaikCADcDACACIAIpAkQ3AwAgAkFAayABQZgCEIsBGiACQUBrIAIQWwJAAkBBwABBARChASIDBEAgAkLAADcCRCACIAM2AkAgAkFAayACQcAAEF4CQCACKAJEIgQgAigCSCIDRgRAIAQhAwwBCyAEIANJDQIgBEUNACACKAJAIQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0ECyACIAM2AkQgAiAENgJACyACKAJAIQQgARAQIAAgAzYCBCAAIAQ2AgAgAkGgA2okAA8LQcAAQQFBtKXAACgCACIAQQIgABsRAAAAC0GHjMAAQSRBrIzAABCIAQALIANBAUG0pcAAKAIAIgBBAiAAGxEAAAALuAQBBH8jAEGgA2siAiQAIAJB4gJqQgA3AQAgAkHqAmpBADsBACACQewCakIANwIAIAJB9AJqQgA3AgAgAkH8AmpCADcCACACQYQDakIANwIAIAJBjANqQgA3AgAgAkGUA2pBADoAACACQZUDakEANgAAIAJBmQNqQQA7AAAgAkGbA2pBADoAACACQQA7AdwCIAJBADYB3gIgAkHAADYC2AIgAkFAayACQdgCakHEABCLARogAkE4aiACQfwAaikCADcDACACQTBqIAJB9ABqKQIANwMAIAJBKGogAkHsAGopAgA3AwAgAkEgaiACQeQAaikCADcDACACQRhqIAJB3ABqKQIANwMAIAJBEGogAkHUAGopAgA3AwAgAkEIaiACQcwAaikCADcDACACIAIpAkQ3AwAgAkFAayABQZgCEIsBGiACQUBrIAIQXAJAAkBBwABBARChASIDBEAgAkLAADcCRCACIAM2AkAgAkFAayACQcAAEF4CQCACKAJEIgQgAigCSCIDRgRAIAQhAwwBCyAEIANJDQIgBEUNACACKAJAIQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0ECyACIAM2AkQgAiAENgJACyACKAJAIQQgARAQIAAgAzYCBCAAIAQ2AgAgAkGgA2okAA8LQcAAQQFBtKXAACgCACIAQQIgABsRAAAAC0GHjMAAQSRBrIzAABCIAQALIANBAUG0pcAAKAIAIgBBAiAAGxEAAAALuAQBBH8jAEHgAmsiAiQAIAJBogJqQgA3AQAgAkGqAmpBADsBACACQawCakIANwIAIAJBtAJqQgA3AgAgAkG8AmpCADcCACACQcQCakIANwIAIAJBzAJqQgA3AgAgAkHUAmpBADoAACACQdUCakEANgAAIAJB2QJqQQA7AAAgAkHbAmpBADoAACACQQA7AZwCIAJBADYBngIgAkHAADYCmAIgAkFAayACQZgCakHEABCLARogAkE4aiACQfwAaikCADcDACACQTBqIAJB9ABqKQIANwMAIAJBKGogAkHsAGopAgA3AwAgAkEgaiACQeQAaikCADcDACACQRhqIAJB3ABqKQIANwMAIAJBEGogAkHUAGopAgA3AwAgAkEIaiACQcwAaikCADcDACACIAIpAkQ3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AABzOgAAIAVBAWoiBUHIAEcNAAsgABAOIAZByABJDQJByAAhBSACQcgAaiECIAhByABqIQgMAAsACyACIARqIgYgBEkNAiAGQcgASw0DIAAgBGpBzAFqIAEgAhCLARogACgCyAEgAmohBwwBCyAAQcwBaiABIARqIAcQiwEaCyAAIAc2AsgBIANBQGskAA8LIAQgBkHAm8AAEH4ACyAGQcgAQcCbwAAQfQALIARByABB0JvAABB+AAsgBCACQeCbwAAQfQALIANBNGpBBjYCACADQSRqQQI2AgAgA0IDNwIUIANBuJ7AADYCECADQQY2AiwgAyADQQxqNgI4IANB3J7AADYCPCADIANBKGo2AiAgAyADQTxqNgIwIAMgA0E4ajYCKCADQRBqQeCewAAQkAEAC5sEAQd/IwBBQGoiAyQAAkACQAJAAkACQAJAAkBB6AAgACgCyAEiBGsiBiACTQRAIAQEQCAEQekATw0GIAAgBGpBzAFqIAEgBhCLARogAiAGayECIAEgBmohAQNAIAAgBWoiBCAELQAAIARBzAFqLQAAczoAACAFQQFqIgVB6ABHDQALIAAQDgsgAiACQegAcCIHayEEIAIgB0kNBiAEQegASQ0BIAFB6ABqIQggASECIAQhBkHoACEFA0AgAyAFNgIMIAVB6ABHDQggBkGYf2ohBkEAIQUDQCAAIAVqIgkgCS0AACACIAVqLQAAczoAACAFQQFqIgVB6ABHDQALIAAQDiAGQegASQ0CQegAIQUgAkHoAGohAiAIQegAaiEIDAALAAsgAiAEaiIGIARJDQIgBkHoAEsNAyAAIARqQcwBaiABIAIQiwEaIAAoAsgBIAJqIQcMAQsgAEHMAWogASAEaiAHEIsBGgsgACAHNgLIASADQUBrJAAPCyAEIAZBwJvAABB+AAsgBkHoAEHAm8AAEH0ACyAEQegAQdCbwAAQfgALIAQgAkHgm8AAEH0ACyADQTRqQQY2AgAgA0EkakECNgIAIANCAzcCFCADQbiewAA2AhAgA0EGNgIsIAMgA0EMajYCOCADQdiewAA2AjwgAyADQShqNgIgIAMgA0E8ajYCMCADIANBOGo2AiggA0EQakHgnsAAEJABAAvkAwEEfyMAQcABayICJAAgAkGiAWpCADcBACACQaoBakEAOwEAIAJBrAFqQgA3AgAgAkG0AWpCADcCACACQQA7AZwBIAJBADYBngEgAkEgNgKYASACQUBrIAJBsAFqKQMANwMAIAJBOGogAkGoAWopAwA3AwAgAkEwaiACQaABaikDADcDACACQcgAaiACQbgBaigCADYCACACIAIpA5gBNwMoIAJBGGogAkE8aikCADcDACACQRBqIAJBNGopAgA3AwAgAkEgaiACQcQAaikCADcDACACIAIpAiw3AwggAkEoaiABQfAAEIsBGiACQShqIAJBCGoQOwJAAkBBIEEBEKEBIgMEQCACQiA3AiwgAiADNgIoIAJBKGogAkEIakEgEF4CQCACKAIsIgQgAigCMCIDRgRAIAQhAwwBCyAEIANJDQIgBEUNACACKAIoIQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0ECyACIAM2AiwgAiAENgIoCyACKAIoIQQgARAQIAAgAzYCBCAAIAQ2AgAgAkHAAWokAA8LQSBBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgA0EBQbSlwAAoAgAiAEECIAAbEQAAAAuOBAEFfyMAQYABayICJAAgAkHyAGpCADcBACACQfoAakEAOwEAIAJBADsBbCACQQA2AW4gAkEQNgJoIAJBGGogAkHwAGoiBCkDADcDACACQSBqIAJB+ABqKAIANgIAIAJBCGoiBSACQRxqKQIANwMAIAIgAikDaDcDECACIAIpAhQ3AwAgAkEQaiABQdQAEIsBGgJAAkACQCACKAIQIgNBEEkEQCACQRBqQQRyIgYgA2pBECADayIDIAMQkQEaIAJBADYCECACQSRqIgMgBhALIAQgAkHcAGopAgA3AwAgAiACQdQAaikCADcDaCADIAJB6ABqEAsgBSACQSxqKQIANwMAIAIgAikCJDcDAEEQQQEQoQEiA0UNASACQhA3AhQgAiADNgIQIAJBEGogAkEQEF4CQCACKAIUIgQgAigCGCIDRgRAIAQhAwwBCyAEIANJDQMgBEUNACACKAIQIQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0FCyACIAM2AhQgAiAENgIQCyACKAIQIQQgARAQIAAgAzYCBCAAIAQ2AgAgAkGAAWokAA8LQbCawABBFyACQegAakGgl8AAQbCXwAAQeQALQRBBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgA0EBQbSlwAAoAgAiAEECIAAbEQAAAAuFBAEEfyMAQdAAayICJAAgAkEqakIANwEAIAJBMmpBADsBACACQRQ2AiAgAkE0akEANgIAIAJBADsBJCACQQA2ASYgAkHIAGogAkEwaikDADcDACACQUBrIAJBKGopAwA3AwAgAkEQaiACQcQAaikCADcDACACQRhqIAJBzABqKAIANgIAIAIgAikDIDcDOCACIAIpAjw3AwggASACQQhqEFogAUIANwMAIAFBADYCHCABQfiXwAApAwA3AwggAUEQakGAmMAAKQMANwMAIAFBGGpBiJjAACgCADYCAAJAAkBBFEEBEKEBIgMEQCACQhQ3AjwgAiADNgI4IAJBOGogAkEIakEUEF4CQCACKAI8IgQgAigCQCIDRgRAIAQhAwwBCyAEIANJDQIgBEUNACACKAI4IQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0ECyACIAM2AjwgAiAENgI4CyACKAI4IQQgAUIANwMAIAFBADYCHCABQQhqIgFB+JfAACkDADcDACABQQhqQYCYwAApAwA3AwAgAUEQakGImMAAKAIANgIAIAAgAzYCBCAAIAQ2AgAgAkHQAGokAA8LQRRBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgA0EBQbSlwAAoAgAiAEECIAAbEQAAAAuFBAEEfyMAQdAAayICJAAgAkEqakIANwEAIAJBMmpBADsBACACQRQ2AiAgAkE0akEANgIAIAJBADsBJCACQQA2ASYgAkHIAGogAkEwaikDADcDACACQUBrIAJBKGopAwA3AwAgAkEQaiACQcQAaikCADcDACACQRhqIAJBzABqKAIANgIAIAIgAikDIDcDOCACIAIpAjw3AwggASACQQhqECAgAUEANgIcIAFCADcDACABQRhqQYiYwAAoAgA2AgAgAUEQakGAmMAAKQMANwMAIAFB+JfAACkDADcDCAJAAkBBFEEBEKEBIgMEQCACQhQ3AjwgAiADNgI4IAJBOGogAkEIakEUEF4CQCACKAI8IgQgAigCQCIDRgRAIAQhAwwBCyAEIANJDQIgBEUNACACKAI4IQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0ECyACIAM2AjwgAiAENgI4CyACKAI4IQQgAUEANgIcIAFCADcDACABQQhqIgFBEGpBiJjAACgCADYCACABQQhqQYCYwAApAwA3AwAgAUH4l8AAKQMANwMAIAAgAzYCBCAAIAQ2AgAgAkHQAGokAA8LQRRBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgA0EBQbSlwAAoAgAiAEECIAAbEQAAAAvlAwEEfyMAQfAAayICJAAgAkEqakIANwEAIAJBMmpBADsBACACQTRqQgA3AgAgAkE8akIANwIAIAJBADsBJCACQQA2ASYgAkEgNgIgIAJB4ABqIAJBOGopAwA3AwAgAkHYAGogAkEwaikDADcDACACQdAAaiACQShqKQMANwMAIAJB6ABqIAJBQGsoAgA2AgAgAiACKQMgNwNIIAJBEGogAkHcAGopAgA3AwAgAkEIaiACQdQAaikCADcDACACQRhqIAJB5ABqKQIANwMAIAIgAikCTDcDACABIAIQZiABQQBByAEQkQEiBUEANgLIAQJAAkBBIEEBEKEBIgEEQCACQiA3AkwgAiABNgJIIAJByABqIAJBIBBeAkAgAigCTCIDIAIoAlAiAUYEQCADIQEMAQsgAyABSQ0CIANFDQAgAigCSCEEAkAgAUUEQCAEEBBBASEDDAELIAQgA0EBIAEQmgEiA0UNBAsgAiABNgJMIAIgAzYCSAsgAigCSCEDIAVBAEHIARCRAUEANgLIASAAIAE2AgQgACADNgIAIAJB8ABqJAAPC0EgQQFBtKXAACgCACIAQQIgABsRAAAAC0GHjMAAQSRBrIzAABCIAQALIAFBAUG0pcAAKAIAIgBBAiAAGxEAAAAL5QMBBH8jAEHwAGsiAiQAIAJBKmpCADcBACACQTJqQQA7AQAgAkE0akIANwIAIAJBPGpCADcCACACQQA7ASQgAkEANgEmIAJBIDYCICACQeAAaiACQThqKQMANwMAIAJB2ABqIAJBMGopAwA3AwAgAkHQAGogAkEoaikDADcDACACQegAaiACQUBrKAIANgIAIAIgAikDIDcDSCACQRBqIAJB3ABqKQIANwMAIAJBCGogAkHUAGopAgA3AwAgAkEYaiACQeQAaikCADcDACACIAIpAkw3AwAgASACEGcgAUEAQcgBEJEBIgVBADYCyAECQAJAQSBBARChASIBBEAgAkIgNwJMIAIgATYCSCACQcgAaiACQSAQXgJAIAIoAkwiAyACKAJQIgFGBEAgAyEBDAELIAMgAUkNAiADRQ0AIAIoAkghBAJAIAFFBEAgBBAQQQEhAwwBCyAEIANBASABEJoBIgNFDQQLIAIgATYCTCACIAM2AkgLIAIoAkghAyAFQQBByAEQkQFBADYCyAEgACABNgIEIAAgAzYCACACQfAAaiQADwtBIEEBQbSlwAAoAgAiAEECIAAbEQAAAAtBh4zAAEEkQayMwAAQiAEACyABQQFBtKXAACgCACIAQQIgABsRAAAAC9wDAQR/IwBBoANrIgIkACACQYIDakIANwEAIAJBigNqQQA7AQAgAkGMA2pCADcCACACQZQDakIANwIAIAJBADsB/AIgAkEANgH+AiACQSA2AvgCIAJBOGogAkGQA2opAwA3AwAgAkEwaiACQYgDaikDADcDACACQShqIAJBgANqKQMANwMAIAJBQGsgAkGYA2ooAgA2AgAgAiACKQP4AjcDICACQRBqIAJBNGopAgA3AwAgAkEIaiACQSxqKQIANwMAIAJBGGogAkE8aikCADcDACACIAIpAiQ3AwAgAkEgaiABQdgCEIsBGiACQSBqIAIQZgJAAkBBIEEBEKEBIgMEQCACQiA3AiQgAiADNgIgIAJBIGogAkEgEF4CQCACKAIkIgQgAigCKCIDRgRAIAQhAwwBCyAEIANJDQIgBEUNACACKAIgIQUCQCADRQRAIAUQEEEBIQQMAQsgBSAEQQEgAxCaASIERQ0ECyACIAM2AiQgAiAENgIgCyACKAIgIQQgARAQIAAgAzYCBCAAIAQ2AgAgAkGgA2okAA8LQSBBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgA0EBQbSlwAAoAgAiAEECIAAbEQAAAAvcAwEEfyMAQaADayICJAAgAkGCA2pCADcBACACQYoDakEAOwEAIAJBjANqQgA3AgAgAkGUA2pCADcCACACQQA7AfwCIAJBADYB/gIgAkEgNgL4AiACQThqIAJBkANqKQMANwMAIAJBMGogAkGIA2opAwA3AwAgAkEoaiACQYADaikDADcDACACQUBrIAJBmANqKAIANgIAIAIgAikD+AI3AyAgAkEQaiACQTRqKQIANwMAIAJBCGogAkEsaikCADcDACACQRhqIAJBPGopAgA3AwAgAiACKQIkNwMAIAJBIGogAUHYAhCLARogAkEgaiACEGcCQAJAQSBBARChASIDBEAgAkIgNwIkIAIgAzYCICACQSBqIAJBIBBeAkAgAigCJCIEIAIoAigiA0YEQCAEIQMMAQsgBCADSQ0CIARFDQAgAigCICEFAkAgA0UEQCAFEBBBASEEDAELIAUgBEEBIAMQmgEiBEUNBAsgAiADNgIkIAIgBDYCIAsgAigCICEEIAEQECAAIAM2AgQgACAENgIAIAJBoANqJAAPC0EgQQFBtKXAACgCACIAQQIgABsRAAAAC0GHjMAAQSRBrIzAABCIAQALIANBAUG0pcAAKAIAIgBBAiAAGxEAAAAL0wMBBH8jAEHgAGsiAiQAIAJBKmpCADcBACACQTJqQQA7AQAgAkE0akIANwIAIAJBHDYCICACQTxqQQA2AgAgAkEAOwEkIAJBADYBJiACQdgAaiACQThqKQMANwMAIAJB0ABqIAJBMGopAwA3AwAgAkHIAGogAkEoaikDADcDACACIAIpAyA3A0AgAkEYaiACQdwAaigCADYCACACQRBqIAJB1ABqKQIANwMAIAJBCGogAkHMAGopAgA3AwAgAiACKQJENwMAIAEgAhBoIAFBAEHIARCRASIFQQA2AsgBAkACQEEcQQEQoQEiAQRAIAJCHDcCRCACIAE2AkAgAkFAayACQRwQXgJAIAIoAkQiAyACKAJIIgFGBEAgAyEBDAELIAMgAUkNAiADRQ0AIAIoAkAhBAJAIAFFBEAgBBAQQQEhAwwBCyAEIANBASABEJoBIgNFDQQLIAIgATYCRCACIAM2AkALIAIoAkAhAyAFQQBByAEQkQFBADYCyAEgACABNgIEIAAgAzYCACACQeAAaiQADwtBHEEBQbSlwAAoAgAiAEECIAAbEQAAAAtBh4zAAEEkQayMwAAQiAEACyABQQFBtKXAACgCACIAQQIgABsRAAAAC9MDAQR/IwBB4ABrIgIkACACQSpqQgA3AQAgAkEyakEAOwEAIAJBNGpCADcCACACQRw2AiAgAkE8akEANgIAIAJBADsBJCACQQA2ASYgAkHYAGogAkE4aikDADcDACACQdAAaiACQTBqKQMANwMAIAJByABqIAJBKGopAwA3AwAgAiACKQMgNwNAIAJBGGogAkHcAGooAgA2AgAgAkEQaiACQdQAaikCADcDACACQQhqIAJBzABqKQIANwMAIAIgAikCRDcDACABIAIQaSABQQBByAEQkQEiBUEANgLIAQJAAkBBHEEBEKEBIgEEQCACQhw3AkQgAiABNgJAIAJBQGsgAkEcEF4CQCACKAJEIgMgAigCSCIBRgRAIAMhAQwBCyADIAFJDQIgA0UNACACKAJAIQQCQCABRQRAIAQQEEEBIQMMAQsgBCADQQEgARCaASIDRQ0ECyACIAE2AkQgAiADNgJACyACKAJAIQMgBUEAQcgBEJEBQQA2AsgBIAAgATYCBCAAIAM2AgAgAkHgAGokAA8LQRxBAUG0pcAAKAIAIgBBAiAAGxEAAAALQYeMwABBJEGsjMAAEIgBAAsgAUEBQbSlwAAoAgAiAEECIAAbEQAAAAvkAwIJfwF+IwBBoAFrIgIkACACQUBrIAFBBGoQciABKAIAIQggAkH4AGoiAyABQTxqKQAANwMAIAJB8ABqIgQgAUE0aikAADcDACACQegAaiIFIAFBLGopAAA3AwAgAkHgAGoiBiABQSRqKQAANwMAIAJB2ABqIgcgAUEcaikAADcDACACIAEpABQ3A1AgAkGQAWogAUHEAGoQciACQQhqIgkgBykDADcDACACQRBqIgcgBikDADcDACACQRhqIgYgBSkDADcDACACQSBqIgUgBCkDADcDACACQShqIgQgAykDADcDACACQTBqIgMgAikDkAEiCzcDACACQThqIgogAkGYAWopAwA3AwAgAiALNwOAASACIAIpA1A3AwBB1ABBBBChASIBRQRAQdQAQQRBtKXAACgCACIAQQIgABsRAAAACyABIAg2AgAgASACKQNANwIEIAEgAikDADcCFCABQQxqIAJByABqKQMANwIAIAFBHGogCSkDADcCACABQSRqIAcpAwA3AgAgAUEsaiAGKQMANwIAIAFBNGogBSkDADcCACABQTxqIAQpAwA3AgAgAUHEAGogAykDADcCACABQcwAaiAKKQMANwIAIABB9I/AADYCBCAAIAE2AgAgAkGgAWokAAvLAwEEfyMAQaADayICJAAgAkGKA2pCADcBACACQZIDakEAOwEAIAJBlANqQgA3AgAgAkEcNgKAAyACQZwDakEANgIAIAJBADsBhAMgAkEANgGGAyACQThqIAJBmANqKQMANwMAIAJBMGogAkGQA2opAwA3AwAgAkEoaiACQYgDaikDADcDACACIAIpA4ADNwMgIAJBGGogAkE8aigCADYCACACQRBqIAJBNGopAgA3AwAgAkEIaiACQSxqKQIANwMAIAIgAikCJDcDACACQSBqIAFB4AIQiwEaIAJBIGogAhBpAkACQEEcQQEQoQEiAwRAIAJCHDcCJCACIAM2AiAgAkEgaiACQRwQXgJAIAIoAiQiBCACKAIoIgNGBEAgBCEDDAELIAQgA0kNAiAERQ0AIAIoAiAhBQJAIANFBEAgBRAQQQEhBAwBCyAFIARBASADEJoBIgRFDQQLIAIgAzYCJCACIAQ2AiALIAIoAiAhBCABEBAgACADNgIEIAAgBDYCACACQaADaiQADwtBHEEBQbSlwAAoAgAiAEECIAAbEQAAAAtBh4zAAEEkQayMwAAQiAEACyADQQFBtKXAACgCACIAQQIgABsRAAAAC8sDAQR/IwBBoANrIgIkACACQYoDakIANwEAIAJBkgNqQQA7AQAgAkGUA2pCADcCACACQRw2AoADIAJBnANqQQA2AgAgAkEAOwGEAyACQQA2AYYDIAJBOGogAkGYA2opAwA3AwAgAkEwaiACQZADaikDADcDACACQShqIAJBiANqKQMANwMAIAIgAikDgAM3AyAgAkEYaiACQTxqKAIANgIAIAJBEGogAkE0aikCADcDACACQQhqIAJBLGopAgA3AwAgAiACKQIkNwMAIAJBIGogAUHgAhCLARogAkEgaiACEGgCQAJAQRxBARChASIDBEAgAkIcNwIkIAIgAzYCICACQSBqIAJBHBBeAkAgAigCJCIEIAIoAigiA0YEQCAEIQMMAQsgBCADSQ0CIARFDQAgAigCICEFAkAgA0UEQCAFEBBBASEEDAELIAUgBEEBIAMQmgEiBEUNBAsgAiADNgIkIAIgBDYCIAsgAigCICEEIAEQECAAIAM2AgQgACAENgIAIAJBoANqJAAPC0EcQQFBtKXAACgCACIAQQIgABsRAAAAC0GHjMAAQSRBrIzAABCIAQALIANBAUG0pcAAKAIAIgBBAiAAGxEAAAALywMBBH8jAEGwAWsiAiQAIAJBmgFqQgA3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HCIEayIFIAJNBEAgAEEIaiEHIAQEQCAEQcEATw0GIAQgAEEgaiIEaiABIAUQiwEaIAcgBBAHIAIgBWshAiABIAVqIQELIAJBP3EhBSACQUBxIghBwABJDQEgAiAFa0FAaiEGIAEhBEHAACECA0AgAyACNgIMIAJBwABHDQcgByAEEAcgBkHAAEkNAiAEQUBrIQQgBkFAaiEGDAALAAsgAiAEaiIFIARJDQIgBUHAAEsNAyAAIARqQSBqIAEgAhCLARogACgCHCACaiEFDAELIABBIGogASAIaiAFEIsBGgsgACAFNgIcIANBQGskAA8LIAQgBUHAm8AAEH4ACyAFQcAAQcCbwAAQfQALIARBwABB0JvAABB+AAsgA0E0akEGNgIAIANBJGpBAjYCACADQgM3AhQgA0G4nsAANgIQIANBBjYCLCADIANBDGo2AjggA0GsjcAANgI8IAMgA0EoajYCICADIANBPGo2AjAgAyADQThqNgIoIANBEGpB4J7AABCQAQALtAMBBn8jAEFAaiIDJAAgACAAKQMAIAKtfDcDAAJAAkACQAJAAkACQEHAACAAKAIIIgRrIgUgAk0EQCAAQcwAaiEHIAQEQCAEQcEATw0GIAQgAEEMaiIEaiABIAUQiwEaIAcgBBAKIAIgBWshAiABIAVqIQELIAJBP3EhBSACQUBxIghBwABJDQEgAiAFa0FAaiEGIAEhBEHAACECA0AgAyACNgIMIAJBwABHDQcgByAEEAogBkHAAEkNAiAEQUBrIQQgBkFAaiEGDAALAAsgAiAEaiIFIARJDQIgBUHAAEsNAyAAIARqQQxqIAEgAhCLARogACgCCCACaiEFDAELIABBDGogASAIaiAFEIsBGgsgACAFNgIIIANBQGskAA8LIAQgBUHAm8AAEH4ACyAFQcAAQcCbwAAQfQALIARBwABB0JvAABB+AAsgA0E0akEGNgIAIANBJGpBAjYCACADQgM3AhQgA0G4nsAANgIQIANBBjYCLCADIANBDGo2AjggA0GsjcAANgI8IAMgA0EoajYCICADIANBPGo2AjAgAyADQThqNgIoIANBEGpB4J7AABCQAQAL0QMCBX8CfiAAQdQAaiECIABBEGohAyAAQQhqKQMAIQYgACkDACEHAkACQCAAKAJQIgFBgAFGBEAgAyACQQEQDEEAIQEgAEEA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AXFyQQJyNgIEIAAgA2oiAyADKAIEQQFyNgIEIAUgAiAFKAIAQQFxckECcjYCACAAIAAoAgRBAXI2AgQgASACEBQMAQsgASgCACEBIAAgAzYCBCAAIAEgAmo2AgALAkAgAEEEaigCACIBQQNxRQ0AIAFBeHEiAiAEQRBqTQ0AIABBBGogBCABQQFxckECcjYCACAAIARqIgEgAiAEayIEQQNyNgIEIAAgAmoiAiACKAIEQQFyNgIEIAEgBBAUCyAAQQhqIQMLIAMLiwMCBn8BfiMAQfAAayICJAAgAkHQAGoiAyABQRBqKQMANwMAIAJB2ABqIgQgAUEYaikDADcDACACQeAAaiIFIAFBIGopAwA3AwAgAkHoAGoiBiABQShqKQMANwMAIAIgASkDCDcDSCABKQMAIQggAkEIaiABQTRqEGUgASgCMCEHQfgAQQgQoQEiAUUEQEH4AEEIQbSlwAAoAgAiAEECIAAbEQAAAAsgASAINwMAIAEgAikDSDcDCCABIAc2AjAgASACKQMINwI0IAFBEGogAykDADcDACABQRhqIAQpAwA3AwAgAUEgaiAFKQMANwMAIAFBKGogBikDADcDACABQTxqIAJBEGopAwA3AgAgAUHEAGogAkEYaikDADcCACABQcwAaiACQSBqKQMANwIAIAFB1ABqIAJBKGopAwA3AgAgAUHcAGogAkEwaikDADcCACABQeQAaiACQThqKQMANwIAIAFB7ABqIAJBQGspAwA3AgAgAEHgjMAANgIEIAAgATYCACACQfAAaiQAC4YDAQR/IwBBkAFrIgIkACACQYIBakIANwEAIAJBigFqQQA7AQAgAkEAOwF8IAJBADYBfiACQRA2AnggAkEgaiACQYABaikDADcDACACQShqIAJBiAFqKAIANgIAIAJBEGogAkEkaikCADcDACACIAIpA3g3AxggAiACKQIcNwMIIAJBGGogAUHgABCLARogAkEYaiACQQhqEF0CQAJAQRBBARChASIDBEAgAkIQNwIcIAIgAzYCGCACQRhqIAJBCGpBEBBeAkAgAigCHCIEIAIoAiAiA0YEQCAEIQMMAQsgBCADSQ0CIARFDQAgAigCGCEFAkAgA0UEQCAFEBBBASEEDAELIAUgBEEBIAMQmgEiBEUNBAsgAiADNgIcIAIgBDYCGAsgAigCGCEEIAEQ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QT8gBmsQkQEaQcAAIAAoAjBrQQdNBEAgBCADEAYgACgCMCICQcEATw0CIABBNGpBACACEJEBGgsgAEHsAGogB0IDhjcCACAEIAMQBiAAQQA2AjAgASAAKAIINgAAIAEgAEEMaigCADYABCABIABBEGooAgA2AAggASAAQRRqKAIANgAMIAEgAEEYaigCADYAECABIABBHGooAgA2ABQgASAAQSBqKAIANgAYIAEgAEEkaigCADYAHCABIABBKGooAgA2ACAgASAAQSxqKAIANgAkDwsgAkHAAEGAmsAAEH4ACyACQcAAQZCawAAQfQALIAJBwABBoJrAABB8AAvwAgIGfwF+IwBBEGsiBCQAIABBDGohBSAAQcwAaiEDIAApAwAhCAJAAkAgACgCCCICQcAARgRAIAMgBRAKQQAhAiAAQQA2AggMAQsgAkE/Sw0BCyAAQQhqIgYgAmpBBGpBgAE6AAAgACAAKAIIIgdBAWoiAjYCCAJAIAJBwQBJBEAgAiAGakEEakEAQT8gB2sQkQEaQcAAIAAoAghrQQdNBEAgAyAFEAogACgCCCICQcEATw0CIABBDGpBACACEJEBGgsgAEHEAGogCEIDhjcCACADIAUQCiAAQQA2AgggBEEIaiICIABB3ABqNgIEIAIgAzYCACAEKAIMIAQoAggiAGtBAnYiA0EEIANBBEkbIgIEQEEAIQMDQCABIAAoAgA2AAAgAEEEaiEAIAFBBGohASADQQFqIgMgAkkNAAsLIARBEGokAA8LIAJBwABBgJrAABB+AAsgAkHAAEGQmsAAEH0ACyACQcAAQaCawAAQfAAL1AIBAX8gABBUIAEgACgCTCICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2AAAgASAAQdAAaigCACICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2AAQgASAAQdQAaigCACICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2AAggASAAQdgAaigCACICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2AAwgASAAQdwAaigCACICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2ABAgASAAQeAAaigCACICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2ABQgASAAQeQAaigCACIAQRh0IABBCHRBgID8B3FyIABBCHZBgP4DcSAAQRh2cnI2ABgL7AICBX8BfiMAQeAAayICJAAgASkDACEHIAJBIGogAUEMahBlIAJBCGoiAyABQdQAaikCADcDACACQRBqIgQgAUHcAGopAgA3AwAgAkEYaiIFIAFB5ABqKQIANwMAIAIgASkCTDcDACABKAIIIQZB8ABBCBChASIBRQRAQfAAQQhBtKXAACgCACIAQQIgABsRAAAACyABIAY2AgggASAHNwMAIAEgAikDIDcCDCABQRRqIAJBKGopAwA3AgAgAUEcaiACQTBqKQMANwIAIAFBJGogAkE4aikDADcCACABQSxqIAJBQGspAwA3AgAgAUE0aiACQcgAaikDADcCACABQTxqIAJB0ABqKQMANwIAIAFBxABqIAJB2ABqKQMANwIAIAFB5ABqIAUpAwA3AgAgAUHcAGogBCkDADcCACABQdQAaiADKQMANwIAIAEgAikDADcCTCAAQeCQwAA2AgQgACABNgIAIAJB4ABqJAAL7AICBX8BfiMAQeAAayICJAAgASkDACEHIAJBIGogAUEMahBlIAJBCGoiAyABQdQAaikCADcDACACQRBqIgQgAUHcAGopAgA3AwAgAkEYaiIFIAFB5ABqKQIANwMAIAIgASkCTDcDACABKAIIIQZB8ABBCBChASIBRQRAQfAAQQhBtKXAACgCACIAQQIgABsRAAAACyABIAY2AgggASAHNwMAIAEgAikDIDcCDCABQRRqIAJBKGopAwA3AgAgAUEcaiACQTBqKQMANwIAIAFBJGogAkE4aikDADcCACABQSxqIAJBQGspAwA3AgAgAUE0aiACQcgAaikDADcCACABQTxqIAJB0ABqKQMANwIAIAFBxABqIAJB2ABqKQMANwIAIAFB5ABqIAUpAwA3AgAgAUHcAGogBCkDADcCACABQdQAaiADKQMANwIAIAEgAikDADcCTCAAQYSRwAA2AgQgACABNgIAIAJB4ABqJAALyAICBH8BfiMAQeAAayICJAAgAkHQAGoiAyABQRBqKQMANwMAIAJB2ABqIgQgAUEYaigCADYCACACIAEpAwg3A0ggASkDACEGIAJBCGogAUEgahBlIAEoAhwhBUHgAEEIEKEBIgFFBEBB4ABBCEG0pcAAKAIAIgBBAiAAGxEAAAALIAEgBjcDACABIAIpA0g3AwggASAFNgIcIAEgAikDCDcDICABQRBqIAMpAwA3AwAgAUEYaiAEKAIANgIAIAFBKGogAkEQaikDADcDACABQTBqIAJBGGopAwA3AwAgAUE4aiACQSBqKQMANwMAIAFBQGsgAkEoaikDADcDACABQcgAaiACQTBqKQMANwMAIAFB0ABqIAJBOGopAwA3AwAgAUHYAGogAkFAaykDADcDACAAQYSNwAA2AgQgACABNgIAIAJB4ABqJAALyAICBH8BfiMAQeAAayICJAAgAkHQAGoiAyABQRBqKQMANwMAIAJB2ABqIgQgAUEYaigCADYCACACIAEpAwg3A0ggASkDACEGIAJBCGogAUEgahBlIAEoAhwhBUHgAEEIEKEBIgFFBEBB4ABBCEG0pcAAKAIAIgBBAiAAGxEAAAALIAEgBjcDACABIAIpA0g3AwggASAFNgIcIAEgAikDCDcDICABQRBqIAMpAwA3AwAgAUEYaiAEKAIANgIAIAFBKGogAkEQaikDADcDACABQTBqIAJBGGopAwA3AwAgAUE4aiACQSBqKQMANwMAIAFBQGsgAkEoaikDADcDACABQcgAaiACQTBqKQMANwMAIAFB0ABqIAJBOGopAwA3AwAgAUHYAGogAkFAaykDADcDACAAQbCNwAA2AgQgACABNgIAIAJB4ABqJAAL3QICBX8BfiAAQQxqIQIgAEHMAGohAyAAKQMAIQYCQAJAIAAoAggiAUHAAEYEQCADIAJBARAEQQAhASAAQQA2AggMAQsgAUE/Sw0BCyAAQQhqIgQgAWpBBGpBgAE6AAAgACAAKAIIIgVBAWoiATYCCAJAIAFBwQBJBEAgASAEakEEakEAQT8gBWsQkQEaQcAAIAAoAghrQQdNBEAgAyACQQEQBCAAKAIIIgFBwQBPDQIgAEEMakEAIAEQkQEaCyAAQcQAaiAGQiiGQoCAgICAgMD/AIMgBkI4hoQgBkIYhkKAgICAgOA/gyAGQgiGQoCAgIDwH4OEhCAGQgiIQoCAgPgPgyAGQhiIQoCA/AeDhCAGQiiIQoD+A4MgBkI4iISEhDcCACADIAJBARAEIABBADYCCA8LIAFBwABBgJrAABB+AAsgAUHAAEGQmsAAEH0ACyABQcAAQaCawAAQfAALvgICBX8BfiMAQTBrIgQkAEEnIQICQCAAQpDOAFQEQCAAIQcMAQsDQCAEQQlqIAJqIgNBfGogACAAQpDOAIAiB0LwsX9+fKciBUH//wNxQeQAbiIGQQF0QdqIwABqLwAAOwAAIANBfmogBkGcf2wgBWpB//8DcUEBdEHaiMAAai8AADsAACACQXxqIQIgAEL/wdcvViAHIQANAAsLIAenIgNB4wBKBEAgAkF+aiICIARBCWpqIAenIgVB//8DcUHkAG4iA0Gcf2wgBWpB//8DcUEBdEHaiMAAai8AADsAAAsCQCADQQpOBEAgAkF+aiICIARBCWpqIANBAXRB2ojAAGovAAA7AAAMAQsgAkF/aiICIARBCWpqIANBMGo6AAALIAFByKDAAEEAIARBCWogAmpBJyACaxAYIARBMGokAAu/AgEDfyMAQRBrIgIkAAJAIAAoAgAiAAJ/AkAgAUGAAU8EQCACQQA2AgwgAUGAEEkNASABQYCABEkEQCACIAFBP3FBgAFyOgAOIAIgAUEMdkHgAXI6AAwgAiABQQZ2QT9xQYABcjoADUEDDAMLIAIgAUE/cUGAAXI6AA8gAiABQRJ2QfABcjoADCACIAFBBnZBP3FBgAFyOgAOIAIgAUEMdkE/cUGAAXI6AA1BBAwCCyAAKAIIIgMgAEEEaigCAEYEfyAAQQEQaiAAKAIIBSADCyAAKAIAaiABOgAAIAAgACgCCEEBajYCCAwCCyACIAFBP3FBgAFyOgANIAIgAUEGdkHAAXI6AAxBAgsiARBqIABBCGoiAygCACIEIAAoAgBqIAJBDGogARCLARogAyABIARqNgIACyACQRBqJABBAAvLAgEIfyMAQYABayIBQShqIgJCADcDACABQSBqIgNCADcDACABQRhqIgRCADcDACABQRBqIgVCADcDACABQQhqIgZCADcDACABQgA3AwAgAUHaAGpCADcBACABQeIAakEAOwEAIAFBEDYCUCABQQA7AVQgAUEANgFWIAFB+ABqIAFB4ABqKAIANgIAIAFB8ABqIAFB2ABqKQMANwMAIAFByABqIgcgAUH0AGopAgA3AwAgASABKQNQNwNoIAEgASkCbDcDQCABQThqIgggBykDADcDACABIAEpA0A3AzAgAEHMAGogCCkDADcAACAAQcQAaiABKQMwNwAAIABBPGogAikDADcAACAAQTRqIAMpAwA3AAAgAEEsaiAEKQMANwAAIABBJGogBSkDADcAACAAQRxqIAYpAwA3AAAgACABKQMANwAUIABBADYCAAuxAgEDfyMAQYABayIEJAAgACgCACEAAkACQAJ/AkAgASgCACIDQRBxRQRAIAAoAgAhAiADQSBxDQEgAq0gARBVDAILIAAoAgAhAkEAIQADQCAAIARqQf8AaiACQQ9xIgNBMHIgA0HXAGogA0EKSRs6AAAgAEF/aiEAIAJBBHYiAg0ACyAAQYABaiICQYEBTw0CIAFB2IvAAEECIAAgBGpBgAFqQQAgAGsQGAwBC0EAIQADQCAAIARqQf8AaiACQQ9xIgNBMHIgA0E3aiADQQpJGzoAACAAQX9qIQAgAkEEdiICDQALIABBgAFqIgJBgQFPDQIgAUHYi8AAQQIgACAEakGAAWpBACAAaxAYCyAEQYABaiQADwsgAkGAAUHIi8AAEH4ACyACQYABQciLwAAQfgALrAICA38CfiAAIAApAwAiBiACrUIDhnwiBzcDACAAQQhqIgMgAykDACAHIAZUrXw3AwACQAJAQYABIAAoAlAiA2siBCACTQRAIABBEGoiBSADBEAgA0GBAU8NAiADIABB1ABqIgNqIAEgBBCLARogAEEANgJQIAUgA0EBEAwgAiAEayECIAEgBGohAQsgASACQQd2EAwgAkH/AHEiA0GBAU8NAiAAQdQAaiABIAJBgH9xaiADEIsBGiAAIAM2AlAPCwJAIAIgA2oiBCADTwRAIARBgAFLDQEgACADakHUAGogASACEIsBGiAAIAAoAlAgAmo2AlAPCyADIARB0JnAABB+AAsgBEGAAUHQmcAAEH0ACyADQYABQeCZwAAQfgALIANBgAFB8JnAABB9AAu8AgIFfwF+IABBIGohAyAAQQhqIQQgACkDACEHAkACQCAAKAIcIgJBwABGBEAgBCADEAdBACECIABBADYCHAwBCyACQT9LDQELIABBHGoiBSACakEEakGAAToAACAAIAAoAhwiBkEBaiICNgIcAkAgAkHBAEkEQCACIAVqQQRqQQBBPyAGaxCRARpBwAAgACgCHGtBB00EQCAEIAMQByAAKAIcIgJBwQBPDQIgAEEgakEAIAIQkQEaCyAAQdgAaiAHQgOGNwIAIAQgAxAHIABBADYCHCABIAAoAgg2AAAgASAAQQxqKAIANgAEIAEgAEEQaigCADYACCABIABBFGooAgA2AAwgASAAQRhqKAIANgAQDwsgAkHAAEGAmsAAEH4ACyACQcAAQZCawAAQfQALIAJBwABBoJrAABB8AAu1AgEDfyMAQRBrIgQkACAAKALIASICQccATQRAIAAgAmpBzAFqQQY6AAAgAkEBaiIDQcgARwRAIAAgA2pBzAFqQQBBxwAgAmsQkQEaC0EAIQIgAEEANgLIASAAQZMCaiIDIAMtAABBgAFyOgAAA0AgACACaiIDIAMtAAAgA0HMAWotAABzOgAAIAJBAWoiAkHIAEcNAAsgABAOIAEgACkAADcAACABQThqIABBOGopAAA3AAAgAUEwaiAAQTBqKQAANwAAIAFBKGogAEEoaikAADcAACABQSBqIABBIGopAAA3AAAgAUEYaiAAQRhqKQAANwAAIAFBEGogAEEQaikAADcAACABQQhqIABBCGopAAA3AAAgBEEQaiQADwtBsJrAAEEXIARBCGpByJrAAEGknsAAEHkAC7UCAQN/IwBBEGsiBCQAIAAoAsgBIgJBxwBNBEAgACACakHMAWpBAToAACACQQFqIgNByABHBEAgACADakHMAWpBAEHHACACaxCRARoLQQAhAiAAQQA2AsgBIABBkwJqIgMgAy0AAEGAAXI6AAADQCAAIAJqIgMgAy0AACADQcwBai0AAHM6AAAgAkEBaiICQcgARw0ACyAAEA4gASAAKQAANwAAIAFBOGogAEE4aikAADcAACABQTBqIABBMGopAAA3AAAgAUEoaiAAQShqKQAANwAAIAFBIGogAEEgaikAADcAACABQRhqIABBGGopAAA3AAAgAUEQaiAAQRBqKQAANwAAIAFBCGogAEEIaikAADcAACAEQRBqJAAPC0GwmsAAQRcgBEEIakHImsAAQeSdwAAQeQALswICBX8BfiAAQQxqIQMgAEHMAGohBCAAKQMAIQcCQAJAIAAoAggiAkHAAEYEQCAEIAMQDUEAIQIgAEEANgIIDAELIAJBP0sNAQsgAEEIaiIFIAJqQQRqQYABOgAAIAAgACgCCCIGQQFqIgI2AggCQCACQcEASQRAIAIgBWpBBGpBAEE/IAZrEJEBGkHAACAAKAIIa0EHTQRAIAQgAxANIAAoAggiAkHBAE8NAiAAQQxqQQAgAhCRARoLIABBxABqIAdCA4Y3AgAgBCADEA0gAEEANgIIIAEgACgCTDYAACABIABB0ABqKAIANgAEIAEgAEHUAGooAgA2AAggASAAQdgAaigCADYADA8LIAJBwABBgJrAABB+AAsgAkHAAEGQmsAAEH0ACyACQcAAQaCawAAQfAALhgIBBH8CQCAAQQRqKAIAIgYgAEEIaigCACIFayACTwRAIAAoAgAhBAwBCwJAAn8gAiAFaiIDIAVPBEBBACAGQQF0IgUgAyAFIANLGyIDQQggA0EISxsiA0EASA0BGgJAIAAoAgBBACAGGyIERQRAIANBARChASIEDQQMAQsgAyAGRg0DIAZFBEAgA0EBEKEBIgRFDQEMBAsgBCAGQQEgAxCaASIEDQMLQQEMAQtBAAsiBARAIAMgBEG0pcAAKAIAIgBBAiAAGxEAAAALEJsBAAsgACAENgIAIABBBGogAzYCACAAQQhqKAIAIQULIAQgBWogASACEIsBGiAAQQhqIAIgBWo2AgALjAIBA38gACAAKQMAIAKtQgOGfDcDAAJAAkBBwAAgACgCCCIDayIEIAJNBEAgAEHMAGoiBSADBEAgA0HBAE8NAiADIABBDGoiA2ogASAEEIsBGiAAQQA2AgggBSADQQEQBCACIARrIQIgASAEaiEBCyABIAJBBnYQBCACQT9xIgNBwQBPDQIgAEEMaiABIAJBQHFqIAMQiwEaIAAgAzYCCA8LAkAgAiADaiIEIANPBEAgBEHAAEsNASAAIANqQQxqIAEgAhCLARogACAAKAIIIAJqNgIIDwsgAyAEQdCZwAAQfgALIARBwABB0JnAABB9AAsgA0HAAEHgmcAAEH4ACyADQcAAQfCZwAAQfQALqAICA38BfiMAQdAAayICJAAgASkDACEFIAJBEGogAUEMahBlIAJBCGoiAyABQdQAaikCADcDACACIAEpAkw3AwAgASgCCCEEQeAAQQgQoQEiAUUEQEHgAEEIQbSlwAAoAgAiAEECIAAbEQAAAAsgASAENgIIIAEgBTcDACABIAIpAxA3AgwgAUEUaiACQRhqKQMANwIAIAFBHGogAkEgaikDADcCACABQSRqIAJBKGopAwA3AgAgAUEsaiACQTBqKQMANwIAIAFBNGogAkE4aikDADcCACABQTxqIAJBQGspAwA3AgAgAUHEAGogAkHIAGopAwA3AgAgAUHUAGogAykDADcCACABIAIpAwA3AkwgAEG8jMAANgIEIAAgATYCACACQdAAaiQAC4gCAQN/IAAgACkDACACrXw3AwACQAJAQcAAIAAoAhwiA2siBCACTQRAIABBCGoiBSADBEAgA0HBAE8NAiADIABBIGoiA2ogASAEEIsBGiAAQQA2AhwgBSADQQEQCCACIARrIQIgASAEaiEBCyABIAJBBnYQCCACQT9xIgNBwQBPDQIgAEEgaiABIAJBQHFqIAMQiwEaIAAgAzYCHA8LAkAgAiADaiIEIANPBEAgBEHAAEsNASAAIANqQSBqIAEgAhCLARogACAAKAIcIAJqNgIcDwsgAyAEQdCZwAAQfgALIARBwABB0JnAABB9AAsgA0HAAEHgmcAAEH4ACyADQcAAQfCZwAAQfQALqAICA38BfiMAQdAAayICJAAgASkDACEFIAJBEGogAUEMahBlIAJBCGoiAyABQdQAaikCADcDACACIAEpAkw3AwAgASgCCCEEQeAAQQgQoQEiAUUEQEHgAEEIQbSlwAAoAgAiAEECIAAbEQAAAAsgASAENgIIIAEgBTcDACABIAIpAxA3AgwgAUEUaiACQRhqKQMANwIAIAFBHGogAkEgaikDADcCACABQSRqIAJBKGopAwA3AgAgAUEsaiACQTBqKQMANwIAIAFBNGogAkE4aikDADcCACABQTxqIAJBQGspAwA3AgAgAUHEAGogAkHIAGopAwA3AgAgAUHUAGogAykDADcCACABIAIpAwA3AkwgAEGokcAANgIEIAAgATYCACACQdAAaiQAC5UCAQN/IwBBEGsiBCQAIAAoAsgBIgJB5wBNBEAgACACakHMAWpBBjoAACACQQFqIgNB6ABHBEAgACADakHMAWpBAEHnACACaxCRARoLQQAhAiAAQQA2AsgBIABBswJqIgMgAy0AAEGAAXI6AAADQCAAIAJqIgMgAy0AACADQcwBai0AAHM6AAAgAkEBaiICQegARw0ACyAAEA4gASAAKQAANwAAIAFBKGogAEEoaikAADcAACABQSBqIABBIGopAAA3AAAgAUEYaiAAQRhqKQAANwAAIAFBEGogAEEQaikAADcAACABQQhqIABBCGopAAA3AAAgBEEQaiQADwtBsJrAAEEXIARBCGpByJrAAEGUnsAAEHkAC5UCAQN/IwBBEGsiBCQAIAAoAsgBIgJB5wBNBEAgACACakHMAWpBAToAACACQQFqIgNB6ABHBEAgACADakHMAWpBAEHnACACaxCRARoLQQAhAiAAQQA2AsgBIABBswJqIgMgAy0AAEGAAXI6AAADQCAAIAJqIgMgAy0AACADQcwBai0AAHM6AAAgAkEBaiICQegARw0ACyAAEA4gASAAKQAANwAAIAFBKGogAEEoaikAADcAACABQSBqIABBIGopAAA3AAAgAUEYaiAAQRhqKQAANwAAIAFBEGogAEEQaikAADcAACABQQhqIABBCGopAAA3AAAgBEEQaiQADwtBsJrAAEEXIARBCGpByJrAAEHUncAAEHkAC/MBAQR/IwBBkAFrIgIkACACQQA2AgAgAkEEciEFA0AgAyAFaiABIANqLQAAOgAAIAIgAigCAEEBaiIENgIAIANBAWoiA0HAAEcNAAsgBEE/TQRAIARBwAAQfwALIAJByABqIAJBxAAQiwEaIABBOGogAkGEAWopAgA3AAAgAEEwaiACQfwAaikCADcAACAAQShqIAJB9ABqKQIANwAAIABBIGogAkHsAGopAgA3AAAgAEEYaiACQeQAaikCADcAACAAQRBqIAJB3ABqKQIANwAAIABBCGogAkHUAGopAgA3AAAgACACKQJMNwAAIAJBkAFqJAAL9QEBA38jAEEQayIEJAAgACgCyAEiAkGHAU0EQCAAIAJqQcwBakEBOgAAIAJBAWoiA0GIAUcEQCAAIANqQcwBakEAQYcBIAJrEJEBGgtBACECIABBADYCyAEgAEHTAmoiAyADLQAAQYABcjoAAANAIAAgAmoiAyADLQAAIANBzAFqLQAAczoAACACQQFqIgJBiAFHDQALIAAQDiABIAApAAA3AAAgAUEYaiAAQRhqKQAANwAAIAFBEGogAEEQaikAADcAACABQQhqIABBCGopAAA3AAAgBEEQaiQADwtBsJrAAEEXIARBCGpByJrAAEHEncAAEHkAC/UBAQN/IwBBEGsiBCQAIAAoAsgBIgJBhwFNBEAgACACakHMAWpBBjoAACACQQFqIgNBiAFHBEAgACADakHMAWpBAEGHASACaxCRARoLQQAhAiAAQQA2AsgBIABB0wJqIgMgAy0AAEGAAXI6AAADQCAAIAJqIgMgAy0AACADQcwBai0AAHM6AAAgAkEBaiICQYgBRw0ACyAAEA4gASAAKQAANwAAIAFBGGogAEEYaikAADcAACABQRBqIABBEGopAAA3AAAgAUEIaiAAQQhqKQAANwAAIARBEGokAA8LQbCawABBFyAEQQhqQciawABBhJ7AABB5AAv1AQEDfyMAQRBrIgQkACAAKALIASICQY8BTQRAIAAgAmpBzAFqQQE6AAAgAkEBaiIDQZABRwRAIAAgA2pBzAFqQQBBjwEgAmsQkQEaC0EAIQIgAEEANgLIASAAQdsCaiIDIAMtAABBgAFyOgAAA0AgACACaiIDIAMtAAAgA0HMAWotAABzOgAAIAJBAWoiAkGQAUcNAAsgABAOIAEgACkAADcAACABQRhqIABBGGooAAA2AAAgAUEQaiAAQRBqKQAANwAAIAFBCGogAEEIaikAADcAACAEQRBqJAAPC0GwmsAAQRcgBEEIakHImsAAQdiawAAQeQAL9QEBA38jAEEQayIEJAAgACgCyAEiAkGPAU0EQCAAIAJqQcwBakEGOgAAIAJBAWoiA0GQAUcEQCAAIANqQcwBakEAQY8BIAJrEJEBGgtBACECIABBADYCyAEgAEHbAmoiAyADLQAAQYABcjoAAANAIAAgAmoiAyADLQAAIANBzAFqLQAAczoAACACQQFqIgJBkAFHDQALIAAQDiABIAApAAA3AAAgAUEYaiAAQRhqKAAANgAAIAFBEGogAEEQaikAADcAACABQQhqIABBCGopAAA3AAAgBEEQaiQADwtBsJrAAEEXIARBCGpByJrAAEH0ncAAEHkAC8MBAQJ/AkACQCAAQQRqKAIAIgMgACgCCCICayABSQRAIAEgAmoiASACSQ0BIANBAXQiAiABIAIgAUsbIgFBCCABQQhLGyICQQBIDQECQCAAKAIAQQAgAxsiAUUEQCACQQEQoQEhAQwBCyACIANGDQAgA0UEQCACQQEQoQEhAQwBCyABIANBASACEJoBIQELIAFFDQIgACABNgIAIABBBGogAjYCAAsPCxCbAQALIAJBAUG0pcAAKAIAIgBBAiAAGxEAAAALhQEBBH8jAEGgAWsiAiQAIAJBADYCACACQQRyIQUDQCADIAVqIAEgA2otAAA6AAAgAiACKAIAQQFqIgQ2AgAgA0EBaiIDQcgARw0A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JAAgAkGIAWogAUHIARCLARogAiABQcwBahBuIAEoAsgBIQNB2AJBCBChASIBRQRAQdgCQQhBtKXAACgCACIAQQIgABsRAAAACyABIAJBiAFqQcgBEIsBIgEgAzYCyAEgAUHMAWogAkGIARCLARogAEGsj8AANgIEIAAgATYCACACQdACaiQAC34BAX8jAEFAaiIFJAAgBSABNgIMIAUgADYCCCAFIAM2AhQgBSACNgIQIAVBLGpBAjYCACAFQTxqQQQ2AgAgBUICNwIcIAVB8IvAADYCGCAFQQE2AjQgBSAFQTBqNgIoIAUgBUEQajYCOCAFIAVBCGo2AjAgBUEYaiAEEJABAAuVAQAgAEIANwMIIABCADcDACAAQQA2AlAgAEGQmcAAKQMANwMQIABBGGpBmJnAACkDADcDACAAQSBqQaCZwAApAwA3AwAgAEEoakGomcAAKQMANwMAIABBMGpBsJnAACkDADcDACAAQThqQbiZwAApAwA3AwAgAEFAa0HAmcAAKQMANwMAIABByABqQciZwAApAwA3AwALlQEAIABCADcDCCAAQgA3AwAgAEEANgJQIABB0JjAACkDADcDECAAQRhqQdiYwAApAwA3AwAgAEEgakHgmMAAKQMANwMAIABBKGpB6JjAACkDADcDACAAQTBqQfCYwAApAwA3AwAgAEE4akH4mMAAKQMANwMAIABBQGtBgJnAACkDADcDACAAQcgAakGImcAAKQMANwMAC20BAX8jAEEwayIDJAAgAyABNgIEIAMgADYCACADQRxqQQI2AgAgA0EsakEFNgIAIANCAjcCDCADQYiIwAA2AgggA0EFNgIkIAMgA0EgajYCGCADIAM2AiggAyADQQRqNgIgIANBCGogAhCQAQALbQEBfyMAQTBrIgMkACADIAE2AgQgAyAANgIAIANBHGpBAjYCACADQSxqQQU2AgAgA0ICNwIMIANBpIrAADYCCCADQQU2AiQgAyADQSBqNgIYIAMgA0EEajYCKCADIAM2AiAgA0EIaiACEJABAAttAQF/IwBBMGsiAyQAIAMgATYCBCADIAA2AgAgA0EcakECNgIAIANBLGpBBTYCACADQgI3AgwgA0HcisAANgIIIANBBTYCJCADIANBIGo2AhggAyADQQRqNgIoIAMgAzYCICADQQhqIAIQkAEAC3ABAX8jAEEwayICJAAgAiABNgIEIAIgADYCACACQRxqQQI2AgAgAkEsakEFNgIAIAJCAjcCDCACQcyRwAA2AgggAkEFNgIkIAIgAkEgajYCGCACIAJBBGo2AiggAiACNgIgIAJBCGpB3JHAABCQAQALVAEBfyMAQSBrIgIkACACIAAoAgA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEaiACQQhqEBYgAkEgaiQAC30BAn9BASEAQeChwABB4KHAACgCAEEBajYCAAJAAkBBqKXAACgCAEEBRwRAQailwABCgYCAgBA3AwAMAQtBrKXAAEGspcAAKAIAQQFqIgA2AgAgAEECSw0BC0GwpcAAKAIAIgFBf0wNAEGwpcAAIAE2AgAgAEEBSw0AAAsAC2ICAX8BfiMAQRBrIgIkAAJAIAEEQCABKAIADQEgAUF/NgIAIAJBCGogASgCBCABQQhqKAIAKAIQEQAAIAIpAwghAyABQQA2AgAgACADNwIAIAJBEGokAA8LEJ0BAAsQngEAC0MBA38CQCACRQ0AA0AgAC0AACIEIAEtAAAiBUYEQCAAQQFqIQAgAUEBaiEBIAJBf2oiAg0BDAILCyAEIAVrIQMLIAMLSwECfwJAIAAEQCAAKAIADQEgAEEANgIAIAAoAgQhASAAKAIIIQIgABAQIAEgAigCABEEACACKAIEBEAgARAQCw8LEJ0BAAsQngEAC0gAAkAgAARAIAAoAgANASAAQX82AgAgACgCBCABIAIgAEEIaigCACgCDBECACACBEAgARAQCyAAQQA2AgAPCxCdAQALEJ4BAAtKAAJ/IAFBgIDEAEcEQEEBIAAoAhggASAAQRxqKAIAKAIQEQEADQEaCyACRQRAQQAPCyAAKAIYIAIgAyAAQRxqKAIAKAIMEQMACwtdACAAQgA3AwAgAEEANgIwIABB0JfAACkDADcDCCAAQRBqQdiXwAApAwA3AwAgAEEYakHgl8AAKQMANwMAIABBIGpB6JfAACkDADcDACAAQShqQfCXwAApAwA3AwALSAEBfyMAQSBrIgMkACADQRRqQQA2AgAgA0HIoMAANgIQIANCATcCBCADIAE2AhwgAyAANgIYIAMgA0EYajYCACADIAIQkAEAC1AAIABBADYCCCAAQgA3AwAgAEGsmMAAKQIANwJMIABB1ABqQbSYwAApAgA3AgAgAEHcAGpBvJjAACkCADcCACAAQeQAakHEmMAAKQIANwIAC1AAIABBADYCCCAAQgA3AwAgAEGMmMAAKQIANwJMIABB1ABqQZSYwAApAgA3AgAgAEHcAGpBnJjAACkCADcCACAAQeQAakGkmMAAKQIANwIACzMBAX8gAgRAIAAhAwNAIAMgAS0AADoAACABQQFqIQEgA0EBaiEDIAJBf2oiAg0ACwsgAAs1AQJ/IAAoAgAiACACEGogAEEIaiIDKAIAIgQgACgCAGogASACEIsBGiADIAIgBGo2AgBBAAsrAAJAIABBfEsNACAARQRAQQQPCyAAIABBfUlBAnQQoQEiAEUNACAADwsACz0AIABCADcDACAAQQA2AhwgAEH4l8AAKQMANwMIIABBEGpBgJjAACkDADcDACAAQRhqQYiYwAAoAgA2AgALPQAgAEEANgIcIABCADcDACAAQRhqQYiYwAAoAgA2AgAgAEEQakGAmMAAKQMANwMAIABB+JfAACkDADcDCAtMAQF/IwBBEGsiAiQAIAIgATYCDCACIAA2AgggAkGYiMAANgIEIAJByKDAADYCACACKAIIRQRAQZ2gwABBK0HIoMAAEIgBAAsQgQEACykBAX8gAgRAIAAhAwNAIAMgAToAACADQQFqIQMgAkF/aiICDQALCyAACy4AIABBADYCCCAAQgA3AwAgAEHUAGpByJfAACkCADcCACAAQcCXwAApAgA3AkwLIAACQCABQXxLDQAgACABQQQgAhCaASIARQ0AIAAPCwALHAAgASgCGEH/h8AAQQggAUEcaigCACgCDBEDAAscACABKAIYQYKMwABBBSABQRxqKAIAKAIMEQMACxQAIAAoAgAgASAAKAIEKAIMEQEACxAAIAEgACgCACAAKAIEEBILEgAgAEEAQcgBEJEBQQA2AsgBCwsAIAEEQCAAEBALCwwAIAAgASACIAMQFwsSAEHEhsAAQRFB2IbAABCIAQALDgAgACgCABoDQAwACwALDQBB76DAAEEbEKABAAsOAEGKocAAQc8AEKABAAsLACAANQIAIAEQVQsJACAAIAEQAQALGQACfyABQQlPBEAgASAAEEYMAQsgABAJCwsNAEKtqduM/5imovgACwQAQRALBABBKAsEAEEUCwUAQcAACwQA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AAAvaG9tZS9sdWNhY2Fzb25hdG8vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9naXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjMvYmxvY2stYnVmZmVyLTAuOS4wL3NyYy9saWIucnMvaG9tZS9sdWNhY2Fzb25hdG8vLnJ1c3R1cC90b29sY2hhaW5zL3N0YWJsZS14ODZfNjQtdW5rbm93bi1saW51eC1nbnUvbGliL3J1c3RsaWIvc3JjL3J1c3Qvc3JjL2xpYmNvcmUvc2xpY2UvbW9kLnJzAGgNEABYAAAASAAAAAEAAABoDRAAWAAAAE8AAAABAAAAaA0QAFgAAABWAAAAAQAAAGgNEABYAAAAZgAAAAEAAABoDRAAWAAAAG0AAAABAAAAaA0QAFgAAAB0AAAAAQAAAGgNEABYAAAAewAAAAEAAACQAAAA5A8QAC0AAAAREBAADAAAAFAPEAABAAAAYAAAAIgAAABoAAAASAAAAHAPEAB0AAAAEAAAAAkAAAAvaG9tZS9sdWNhY2Fzb25hdG8vLnJ1c3R1cC90b29sY2hhaW5zL3N0YWJsZS14ODZfNjQtdW5rbm93bi1saW51eC1nbnUvbGliL3J1c3RsaWIvc3JjL3J1c3Qvc3JjL2xpYmNvcmUvbWFjcm9zL21vZC5yc2Fzc2VydGlvbiBmYWlsZWQ6IGAobGVmdCA9PSByaWdodClgCiAgbGVmdDogYGAsCiByaWdodDogYGNhbGxlZCBgT3B0aW9uOjp1bndyYXAoKWAgb24gYSBgTm9uZWAgdmFsdWVYEBAAFwAAALQBAAAeAAAAc3JjL2xpYnN0ZC9wYW5pY2tpbmcucnNudWxsIHBvaW50ZXIgcGFzc2VkIHRvIHJ1c3RyZWN1cnNpdmUgdXNlIG9mIGFuIG9iamVjdCBkZXRlY3RlZCB3aGljaCB3b3VsZCBsZWFkIHRvIHVuc2FmZSBhbGlhc2luZyBpbiBydXN0AHsJcHJvZHVjZXJzAghsYW5ndWFnZQEEUnVzdAAMcHJvY2Vzc2VkLWJ5AwVydXN0Yx0xLjQ2LjAgKDA0NDg4YWZlMyAyMDIwLTA4LTI0KQZ3YWxydXMGMC4xOC4wDHdhc20tYmluZGdlbhIwLjIuNjggKGEwNGUxODk3MSk=");
let wasm;
let cachedTextDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
});
cachedTextDecoder.decode();
let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}
function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}
const heap = new Array(32).fill(undefined);
heap.push(undefined, null, true, false);
let heap_next = heap.length;
function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
}
function getObject(idx) {
    return heap[idx];
}
function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}
function takeObject(idx) {
    const ret1 = getObject(idx);
    dropObject(idx);
    return ret1;
}
let WASM_VECTOR_LEN = 0;
let cachedTextEncoder = new TextEncoder("utf-8");
const encodeString = typeof cachedTextEncoder.encodeInto === "function" ? function(arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
} : function(arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
};
function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }
    let len = arg.length;
    let ptr = malloc(len);
    const mem = getUint8Memory0();
    let offset = 0;
    for(; offset < len; offset++){
        const code7 = arg.charCodeAt(offset);
        if (code7 > 127) break;
        mem[ptr + offset] = code7;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret1 = encodeString(arg, view);
        offset += ret1.written;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
}
function create_hash(algorithm) {
    var ptr0 = passStringToWasm0(algorithm, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ret1 = wasm.create_hash(ptr0, len0);
    return DenoHash.__wrap(ret1);
}
function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}
function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
function update_hash(hash, data) {
    _assertClass(hash, DenoHash);
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.update_hash(hash.ptr, ptr0, len0);
}
let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}
function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
function digest_hash(hash) {
    try {
        const retptr = wasm.__wbindgen_export_2.value - 16;
        wasm.__wbindgen_export_2.value = retptr;
        _assertClass(hash, DenoHash);
        wasm.digest_hash(retptr, hash.ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
    } finally{
        wasm.__wbindgen_export_2.value += 16;
    }
}
class DenoHash {
    static __wrap(ptr) {
        const obj = Object.create(DenoHash.prototype);
        obj.ptr = ptr;
        return obj;
    }
    free() {
        const ptr = this.ptr;
        this.ptr = 0;
        wasm.__wbg_denohash_free(ptr);
    }
}
async function load(module, imports) {
    if (typeof Response === "function" && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === "function") {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                if (module.headers.get("Content-Type") != "application/wasm") {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                } else {
                    throw e;
                }
            }
        }
        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);
        if (instance instanceof WebAssembly.Instance) {
            return {
                instance,
                module
            };
        } else {
            return instance;
        }
    }
}
async function init(input5) {
    if (typeof input5 === "undefined") {
        input5 = importMeta.url.replace(/\.js$/, "_bg.wasm");
    }
    const imports = {
    };
    imports.wbg = {
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        var ret1 = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret1);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_rethrow = function(arg0) {
        throw takeObject(arg0);
    };
    if (typeof input5 === "string" || typeof Request === "function" && input5 instanceof Request || typeof URL === "function" && input5 instanceof URL) {
        input5 = fetch(input5);
    }
    const { instance , module  } = await load(await input5, imports);
    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    return wasm;
}
await init(source);
const TYPE_ERROR_MSG = "hash: `data` is invalid type";
class Hash {
    #hash;
    #digested;
    constructor(algorithm){
        this.#hash = create_hash(algorithm);
        this.#digested = false;
    }
    update(data) {
        let msg2;
        if (typeof data === "string") {
            msg2 = new TextEncoder().encode(data);
        } else if (typeof data === "object") {
            if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
                msg2 = new Uint8Array(data);
            } else {
                throw new Error(TYPE_ERROR_MSG);
            }
        } else {
            throw new Error(TYPE_ERROR_MSG);
        }
        update_hash(this.#hash, msg2);
        return this;
    }
    digest() {
        if (this.#digested) throw new Error("hash: already digested");
        this.#digested = true;
        return digest_hash(this.#hash);
    }
    toString(format = "hex") {
        const finalized = new Uint8Array(this.digest());
        switch(format){
            case "hex":
                return encodeToString(finalized);
            case "base64":
                return encode1(finalized);
            default:
                throw new Error("hash: invalid format");
        }
    }
}
const supportedAlgorithms = [
    "md2",
    "md4",
    "md5",
    "ripemd160",
    "ripemd320",
    "sha1",
    "sha224",
    "sha256",
    "sha384",
    "sha512",
    "sha3-224",
    "sha3-256",
    "sha3-384",
    "sha3-512",
    "keccak224",
    "keccak256",
    "keccak384",
    "keccak512", 
];
function createHash(algorithm1) {
    return new Hash(algorithm1);
}
const MAX_ALLOC = Math.pow(2, 30) - 1;
function createHasher(alg) {
    let normalizedAlg;
    if (alg === "rmd160") {
        normalizedAlg = "ripemd160";
    } else {
        normalizedAlg = alg;
    }
    return (value7)=>Buffer1.from(createHash(normalizedAlg).update(value7).digest())
    ;
}
function getZeroes(zeros) {
    return Buffer1.alloc(zeros);
}
const sizes = {
    md5: 16,
    sha1: 20,
    sha224: 28,
    sha256: 32,
    sha384: 48,
    sha512: 64,
    rmd160: 20,
    ripemd160: 20
};
function toBuffer(bufferable) {
    if (bufferable instanceof Uint8Array || typeof bufferable === "string") {
        return Buffer1.from(bufferable);
    } else {
        return Buffer1.from(bufferable.buffer);
    }
}
class Hmac {
    hash;
    ipad1;
    opad;
    alg;
    blocksize;
    size;
    ipad2;
    constructor(alg, key1, saltLen){
        this.hash = createHasher(alg);
        const blocksize = alg === "sha512" || alg === "sha384" ? 128 : 64;
        if (key1.length > blocksize) {
            key1 = this.hash(key1);
        } else if (key1.length < blocksize) {
            key1 = Buffer1.concat([
                key1,
                getZeroes(blocksize - key1.length)
            ], blocksize);
        }
        const ipad2 = Buffer1.allocUnsafe(blocksize + sizes[alg]);
        const opad = Buffer1.allocUnsafe(blocksize + sizes[alg]);
        for(let i1 = 0; i1 < blocksize; i1++){
            ipad2[i1] = key1[i1] ^ 54;
            opad[i1] = key1[i1] ^ 92;
        }
        const ipad1 = Buffer1.allocUnsafe(blocksize + saltLen + 4);
        ipad2.copy(ipad1, 0, 0, blocksize);
        this.ipad1 = ipad1;
        this.ipad2 = ipad2;
        this.opad = opad;
        this.alg = alg;
        this.blocksize = blocksize;
        this.size = sizes[alg];
    }
    run(data, ipad) {
        data.copy(ipad, this.blocksize);
        const h = this.hash(ipad);
        h.copy(this.opad, this.blocksize);
        return this.hash(this.opad);
    }
}
function pbkdf2Sync(password, salt, iterations, keylen, digest = "sha1") {
    if (typeof iterations !== "number" || iterations < 0) {
        throw new TypeError("Bad iterations");
    }
    if (typeof keylen !== "number" || keylen < 0 || keylen > MAX_ALLOC) {
        throw new TypeError("Bad key length");
    }
    const bufferedPassword = toBuffer(password);
    const bufferedSalt = toBuffer(salt);
    const hmac = new Hmac(digest, bufferedPassword, bufferedSalt.length);
    const DK = Buffer1.allocUnsafe(keylen);
    const block1 = Buffer1.allocUnsafe(bufferedSalt.length + 4);
    bufferedSalt.copy(block1, 0, 0, bufferedSalt.length);
    let destPos = 0;
    const hLen = sizes[digest];
    const l = Math.ceil(keylen / hLen);
    for(let i2 = 1; i2 <= l; i2++){
        block1.writeUInt32BE(i2, bufferedSalt.length);
        const T = hmac.run(block1, hmac.ipad1);
        let U = T;
        for(let j = 1; j < iterations; j++){
            U = hmac.run(U, hmac.ipad2);
            for(let k = 0; k < hLen; k++)T[k] ^= U[k];
        }
        T.copy(DK, destPos);
        destPos += hLen;
    }
    return DK;
}
function pbkdf2(password, salt, iterations, keylen, digest = "sha1", callback) {
    setTimeout(()=>{
        let err = null, res;
        try {
            res = pbkdf2Sync(password, salt, iterations, keylen, digest);
        } catch (e) {
            err = e;
        }
        if (err) {
            callback(err);
        } else {
            callback(null, res);
        }
    }, 0);
}
function isReadable(stream) {
    return typeof stream.readable === "boolean" || typeof stream.readableEnded === "boolean" || !!stream._readableState;
}
function isWritable(stream) {
    return typeof stream.writable === "boolean" || typeof stream.writableEnded === "boolean" || !!stream._writableState;
}
function isWritableFinished(stream) {
    if (stream.writableFinished) return true;
    const wState = stream._writableState;
    if (!wState || wState.errored) return false;
    return wState.finished || wState.ended && wState.length === 0;
}
function nop1() {
}
function isReadableEnded(stream) {
    if (stream.readableEnded) return true;
    const rState = stream._readableState;
    if (!rState || rState.errored) return false;
    return rState.endEmitted || rState.ended && rState.length === 0;
}
function eos(stream, x87, y19) {
    let opts;
    let callback;
    if (!y19) {
        if (typeof x87 !== "function") {
            throw new ERR_INVALID_ARG_TYPE("callback", "function", x87);
        }
        opts = {
        };
        callback = x87;
    } else {
        if (!x87 || Array.isArray(x87) || typeof x87 !== "object") {
            throw new ERR_INVALID_ARG_TYPE("opts", "object", x87);
        }
        opts = x87;
        if (typeof y19 !== "function") {
            throw new ERR_INVALID_ARG_TYPE("callback", "function", y19);
        }
        callback = y19;
    }
    callback = once(callback);
    const readable = opts.readable ?? isReadable(stream);
    const writable = opts.writable ?? isWritable(stream);
    const wState = stream._writableState;
    const rState = stream._readableState;
    const validState = wState || rState;
    const onlegacyfinish = ()=>{
        if (!stream.writable) {
            onfinish();
        }
    };
    let willEmitClose = validState?.autoDestroy && validState?.emitClose && validState?.closed === false && isReadable(stream) === readable && isWritable(stream) === writable;
    let writableFinished = stream.writableFinished || wState?.finished;
    const onfinish = ()=>{
        writableFinished = true;
        if (stream.destroyed) {
            willEmitClose = false;
        }
        if (willEmitClose && (!stream.readable || readable)) {
            return;
        }
        if (!readable || readableEnded) {
            callback.call(stream);
        }
    };
    let readableEnded = stream.readableEnded || rState?.endEmitted;
    const onend = ()=>{
        readableEnded = true;
        if (stream.destroyed) {
            willEmitClose = false;
        }
        if (willEmitClose && (!stream.writable || writable)) {
            return;
        }
        if (!writable || writableFinished) {
            callback.call(stream);
        }
    };
    const onerror = (err)=>{
        callback.call(stream, err);
    };
    const onclose = ()=>{
        if (readable && !readableEnded) {
            if (!isReadableEnded(stream)) {
                return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
            }
        }
        if (writable && !writableFinished) {
            if (!isWritableFinished(stream)) {
                return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
            }
        }
        callback.call(stream);
    };
    if (writable && !wState) {
        stream.on("end", onlegacyfinish);
        stream.on("close", onlegacyfinish);
    }
    stream.on("end", onend);
    stream.on("finish", onfinish);
    if (opts.error !== false) stream.on("error", onerror);
    stream.on("close", onclose);
    const closed = wState?.closed || rState?.closed || wState?.errorEmitted || rState?.errorEmitted || (!writable || wState?.finished) && (!readable || rState?.endEmitted);
    if (closed) {
        queueMicrotask(callback);
    }
    return function() {
        callback = nop1;
        stream.removeListener("aborted", onclose);
        stream.removeListener("complete", onfinish);
        stream.removeListener("abort", onclose);
        stream.removeListener("end", onlegacyfinish);
        stream.removeListener("close", onlegacyfinish);
        stream.removeListener("finish", onfinish);
        stream.removeListener("end", onend);
        stream.removeListener("error", onerror);
        stream.removeListener("close", onclose);
    };
}
function destroyer(stream, err) {
    if (typeof stream.destroy === "function") {
        return stream.destroy(err);
    }
    if (typeof stream.close === "function") {
        return stream.close();
    }
}
class Stream1 extends __default {
    constructor(){
        super();
    }
    static _isUint8Array = mod.isUint8Array;
    static _uint8ArrayToBuffer = (chunk)=>Buffer1.from(chunk)
    ;
    pipe(dest, options) {
        const source1 = this;
        if (options?.end ?? true) {
            source1.on("end", onend);
            source1.on("close", onclose);
        }
        let didOnEnd = false;
        function onend() {
            if (didOnEnd) return;
            didOnEnd = true;
            dest.end();
        }
        function onclose() {
            if (didOnEnd) return;
            didOnEnd = true;
            if (typeof dest.destroy === "function") dest.destroy();
        }
        function onerror(er) {
            cleanup();
            if (this.listenerCount("error") === 0) {
                throw er;
            }
        }
        source1.on("error", onerror);
        dest.on("error", onerror);
        function cleanup() {
            source1.removeListener("end", onend);
            source1.removeListener("close", onclose);
            source1.removeListener("error", onerror);
            dest.removeListener("error", onerror);
            source1.removeListener("end", cleanup);
            source1.removeListener("close", cleanup);
            dest.removeListener("close", cleanup);
        }
        source1.on("end", cleanup);
        source1.on("close", cleanup);
        dest.on("close", cleanup);
        dest.emit("pipe", source1);
        return dest;
    }
    static Readable;
    static Writable;
    static Duplex;
    static Transform;
    static PassThrough;
    static pipeline;
    static finished;
    static promises;
    static Stream;
}
class BufferList {
    head = null;
    tail = null;
    length;
    constructor(){
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
    push(v) {
        const entry = {
            data: v,
            next: null
        };
        if (this.length > 0) {
            this.tail.next = entry;
        } else {
            this.head = entry;
        }
        this.tail = entry;
        ++this.length;
    }
    unshift(v) {
        const entry = {
            data: v,
            next: this.head
        };
        if (this.length === 0) {
            this.tail = entry;
        }
        this.head = entry;
        ++this.length;
    }
    shift() {
        if (this.length === 0) {
            return;
        }
        const ret1 = this.head.data;
        if (this.length === 1) {
            this.head = this.tail = null;
        } else {
            this.head = this.head.next;
        }
        --this.length;
        return ret1;
    }
    clear() {
        this.head = this.tail = null;
        this.length = 0;
    }
    join(s) {
        if (this.length === 0) {
            return "";
        }
        let p = this.head;
        let ret1 = "" + p.data;
        p = p.next;
        while(p){
            ret1 += s + p.data;
            p = p.next;
        }
        return ret1;
    }
    concat(n) {
        if (this.length === 0) {
            return Buffer1.alloc(0);
        }
        const ret1 = Buffer1.allocUnsafe(n >>> 0);
        let p = this.head;
        let i2 = 0;
        while(p){
            ret1.set(p.data, i2);
            i2 += p.data.length;
            p = p.next;
        }
        return ret1;
    }
    consume(n, hasStrings) {
        const data = this.head.data;
        if (n < data.length) {
            const slice = data.slice(0, n);
            this.head.data = data.slice(n);
            return slice;
        }
        if (n === data.length) {
            return this.shift();
        }
        return hasStrings ? this._getString(n) : this._getBuffer(n);
    }
    first() {
        return this.head.data;
    }
    *[Symbol.iterator]() {
        for(let p = this.head; p; p = p.next){
            yield p.data;
        }
    }
    _getString(n) {
        let ret1 = "";
        let p = this.head;
        let c = 0;
        p = p.next;
        do {
            const str1 = p.data;
            if (n > str1.length) {
                ret1 += str1;
                n -= str1.length;
            } else {
                if (n === str1.length) {
                    ret1 += str1;
                    ++c;
                    if (p.next) {
                        this.head = p.next;
                    } else {
                        this.head = this.tail = null;
                    }
                } else {
                    ret1 += str1.slice(0, n);
                    this.head = p;
                    p.data = str1.slice(n);
                }
                break;
            }
            ++c;
            p = p.next;
        }while (p)
        this.length -= c;
        return ret1;
    }
    _getBuffer(n) {
        const ret1 = Buffer1.allocUnsafe(n);
        const retLen = n;
        let p = this.head;
        let c = 0;
        p = p.next;
        do {
            const buf = p.data;
            if (n > buf.length) {
                ret1.set(buf, retLen - n);
                n -= buf.length;
            } else {
                if (n === buf.length) {
                    ret1.set(buf, retLen - n);
                    ++c;
                    if (p.next) {
                        this.head = p.next;
                    } else {
                        this.head = this.tail = null;
                    }
                } else {
                    ret1.set(new Uint8Array(buf.buffer, buf.byteOffset, n), retLen - n);
                    this.head = p;
                    p.data = buf.slice(n);
                }
                break;
            }
            ++c;
            p = p.next;
        }while (p)
        this.length -= c;
        return ret1;
    }
}
var NotImplemented;
(function(NotImplemented1) {
    NotImplemented1[NotImplemented1["ascii"] = 0] = "ascii";
    NotImplemented1[NotImplemented1["latin1"] = 1] = "latin1";
    NotImplemented1[NotImplemented1["utf16le"] = 2] = "utf16le";
})(NotImplemented || (NotImplemented = {
}));
function normalizeEncoding1(enc) {
    const encoding2 = normalizeEncoding(enc ?? null);
    if (encoding2 && encoding2 in NotImplemented) notImplemented(encoding2);
    if (!encoding2 && typeof enc === "string" && enc.toLowerCase() !== "raw") {
        throw new Error(`Unknown encoding: ${enc}`);
    }
    return String(encoding2);
}
function utf8CheckByte(__byte) {
    if (__byte <= 127) return 0;
    else if (__byte >> 5 === 6) return 2;
    else if (__byte >> 4 === 14) return 3;
    else if (__byte >> 3 === 30) return 4;
    return __byte >> 6 === 2 ? -1 : -2;
}
function utf8CheckIncomplete(self, buf, i2) {
    let j = buf.length - 1;
    if (j < i2) return 0;
    let nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
        if (nb > 0) self.lastNeed = nb - 1;
        return nb;
    }
    if ((--j) < i2 || nb === -2) return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
        if (nb > 0) self.lastNeed = nb - 2;
        return nb;
    }
    if ((--j) < i2 || nb === -2) return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
        if (nb > 0) {
            if (nb === 2) nb = 0;
            else self.lastNeed = nb - 3;
        }
        return nb;
    }
    return 0;
}
function utf8CheckExtraBytes(self, buf) {
    if ((buf[0] & 192) !== 128) {
        self.lastNeed = 0;
        return "\ufffd";
    }
    if (self.lastNeed > 1 && buf.length > 1) {
        if ((buf[1] & 192) !== 128) {
            self.lastNeed = 1;
            return "\ufffd";
        }
        if (self.lastNeed > 2 && buf.length > 2) {
            if ((buf[2] & 192) !== 128) {
                self.lastNeed = 2;
                return "\ufffd";
            }
        }
    }
}
function utf8FillLastComplete(buf) {
    const p = this.lastTotal - this.lastNeed;
    const r = utf8CheckExtraBytes(this, buf);
    if (r !== undefined) return r;
    if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, p, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, p, 0, buf.length);
    this.lastNeed -= buf.length;
}
function utf8FillLastIncomplete(buf) {
    if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
    this.lastNeed -= buf.length;
}
function utf8Text(buf, i2) {
    const total = utf8CheckIncomplete(this, buf, i2);
    if (!this.lastNeed) return buf.toString("utf8", i2);
    this.lastTotal = total;
    const end = buf.length - (total - this.lastNeed);
    buf.copy(this.lastChar, 0, end);
    return buf.toString("utf8", i2, end);
}
function utf8End(buf) {
    const r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) return r + "\ufffd";
    return r;
}
function utf8Write(buf) {
    if (typeof buf === "string") {
        return buf;
    }
    if (buf.length === 0) return "";
    let r;
    let i2;
    if (this.lastNeed) {
        r = this.fillLast(buf);
        if (r === undefined) return "";
        i2 = this.lastNeed;
        this.lastNeed = 0;
    } else {
        i2 = 0;
    }
    if (i2 < buf.length) return r ? r + this.text(buf, i2) : this.text(buf, i2);
    return r || "";
}
function base64Text(buf, i2) {
    const n = (buf.length - i2) % 3;
    if (n === 0) return buf.toString("base64", i2);
    this.lastNeed = 3 - n;
    this.lastTotal = 3;
    if (n === 1) {
        this.lastChar[0] = buf[buf.length - 1];
    } else {
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
    }
    return buf.toString("base64", i2, buf.length - n);
}
function base64End(buf) {
    const r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) {
        return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
    }
    return r;
}
function simpleWrite(buf) {
    if (typeof buf === "string") {
        return buf;
    }
    return buf.toString(this.encoding);
}
function simpleEnd(buf) {
    return buf && buf.length ? this.write(buf) : "";
}
class StringDecoderBase {
    encoding;
    lastChar;
    lastNeed = 0;
    lastTotal = 0;
    constructor(encoding2, nb){
        this.encoding = encoding2;
        this.lastChar = Buffer1.allocUnsafe(nb);
    }
}
class Base64Decoder extends StringDecoderBase {
    end = base64End;
    fillLast = utf8FillLastIncomplete;
    text = base64Text;
    write = utf8Write;
    constructor(encoding3){
        super(normalizeEncoding1(encoding3), 3);
    }
}
class GenericDecoder extends StringDecoderBase {
    end = simpleEnd;
    fillLast = undefined;
    text = utf8Text;
    write = simpleWrite;
    constructor(encoding4){
        super(normalizeEncoding1(encoding4), 4);
    }
}
class Utf8Decoder extends StringDecoderBase {
    end = utf8End;
    fillLast = utf8FillLastComplete;
    text = utf8Text;
    write = utf8Write;
    constructor(encoding5){
        super(normalizeEncoding1(encoding5), 4);
    }
}
class StringDecoder {
    encoding;
    end;
    fillLast;
    lastChar;
    lastNeed;
    lastTotal;
    text;
    write;
    constructor(encoding6){
        let decoder1;
        switch(encoding6){
            case "utf8":
                decoder1 = new Utf8Decoder(encoding6);
                break;
            case "base64":
                decoder1 = new Base64Decoder(encoding6);
                break;
            default:
                decoder1 = new GenericDecoder(encoding6);
        }
        this.encoding = decoder1.encoding;
        this.end = decoder1.end;
        this.fillLast = decoder1.fillLast;
        this.lastChar = decoder1.lastChar;
        this.lastNeed = decoder1.lastNeed;
        this.lastTotal = decoder1.lastTotal;
        this.text = decoder1.text;
        this.write = decoder1.write;
    }
}
const kDestroy = Symbol("kDestroy");
const kPaused = Symbol("kPaused");
function _destroy(self, err, cb) {
    self._destroy(err || null, (err1)=>{
        const r = self._readableState;
        if (err1) {
            err1.stack;
            if (!r.errored) {
                r.errored = err1;
            }
        }
        r.closed = true;
        if (typeof cb === "function") {
            cb(err1);
        }
        if (err1) {
            queueMicrotask(()=>{
                if (!r.errorEmitted) {
                    r.errorEmitted = true;
                    self.emit("error", err1);
                }
                r.closeEmitted = true;
                if (r.emitClose) {
                    self.emit("close");
                }
            });
        } else {
            queueMicrotask(()=>{
                r.closeEmitted = true;
                if (r.emitClose) {
                    self.emit("close");
                }
            });
        }
    });
}
function addChunk(stream, state, chunk, addToFront) {
    if (state.flowing && state.length === 0 && !state.sync) {
        if (state.multiAwaitDrain) {
            state.awaitDrainWriters.clear();
        } else {
            state.awaitDrainWriters = null;
        }
        stream.emit("data", chunk);
    } else {
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront) {
            state.buffer.unshift(chunk);
        } else {
            state.buffer.push(chunk);
        }
        if (state.needReadable) {
            emitReadable(stream);
        }
    }
    maybeReadMore(stream, state);
}
const MAX_HWM = 1073741824;
function computeNewHighWaterMark(n) {
    if (n >= 1073741824) {
        n = MAX_HWM;
    } else {
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
    }
    return n;
}
function emitReadable(stream) {
    const state = stream._readableState;
    state.needReadable = false;
    if (!state.emittedReadable) {
        state.emittedReadable = true;
        queueMicrotask(()=>emitReadable_(stream)
        );
    }
}
function emitReadable_(stream) {
    const state = stream._readableState;
    if (!state.destroyed && !state.errored && (state.length || state.ended)) {
        stream.emit("readable");
        state.emittedReadable = false;
    }
    state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
    flow(stream);
}
function endReadable(stream) {
    const state = stream._readableState;
    if (!state.endEmitted) {
        state.ended = true;
        queueMicrotask(()=>endReadableNT1(state, stream)
        );
    }
}
function endReadableNT1(state, stream) {
    if (!state.errorEmitted && !state.closeEmitted && !state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.emit("end");
        if (state.autoDestroy) {
            stream.destroy();
        }
    }
}
function errorOrDestroy(stream, err, sync = false) {
    const r = stream._readableState;
    if (r.destroyed) {
        return stream;
    }
    if (r.autoDestroy) {
        stream.destroy(err);
    } else if (err) {
        err.stack;
        if (!r.errored) {
            r.errored = err;
        }
        if (sync) {
            queueMicrotask(()=>{
                if (!r.errorEmitted) {
                    r.errorEmitted = true;
                    stream.emit("error", err);
                }
            });
        } else if (!r.errorEmitted) {
            r.errorEmitted = true;
            stream.emit("error", err);
        }
    }
}
function flow(stream) {
    const state = stream._readableState;
    while(state.flowing && stream.read() !== null);
}
function fromList(n, state) {
    if (state.length === 0) {
        return null;
    }
    let ret1;
    if (state.objectMode) {
        ret1 = state.buffer.shift();
    } else if (!n || n >= state.length) {
        if (state.decoder) {
            ret1 = state.buffer.join("");
        } else if (state.buffer.length === 1) {
            ret1 = state.buffer.first();
        } else {
            ret1 = state.buffer.concat(state.length);
        }
        state.buffer.clear();
    } else {
        ret1 = state.buffer.consume(n, !!state.decoder);
    }
    return ret1;
}
function howMuchToRead(n, state) {
    if (n <= 0 || state.length === 0 && state.ended) {
        return 0;
    }
    if (state.objectMode) {
        return 1;
    }
    if (Number.isNaN(n)) {
        if (state.flowing && state.length) {
            return state.buffer.first().length;
        }
        return state.length;
    }
    if (n <= state.length) {
        return n;
    }
    return state.ended ? state.length : 0;
}
function maybeReadMore(stream, state) {
    if (!state.readingMore && state.constructed) {
        state.readingMore = true;
        queueMicrotask(()=>maybeReadMore_(stream, state)
        );
    }
}
function maybeReadMore_(stream, state) {
    while(!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)){
        const len = state.length;
        stream.read(0);
        if (len === state.length) {
            break;
        }
    }
    state.readingMore = false;
}
function nReadingNextTick(self) {
    self.read(0);
}
function onEofChunk(stream, state) {
    if (state.ended) return;
    if (state.decoder) {
        const chunk = state.decoder.end();
        if (chunk && chunk.length) {
            state.buffer.push(chunk);
            state.length += state.objectMode ? 1 : chunk.length;
        }
    }
    state.ended = true;
    if (state.sync) {
        emitReadable(stream);
    } else {
        state.needReadable = false;
        state.emittedReadable = true;
        emitReadable_(stream);
    }
}
function pipeOnDrain(src, dest) {
    return function pipeOnDrainFunctionResult() {
        const state = src._readableState;
        if (state.awaitDrainWriters === dest) {
            state.awaitDrainWriters = null;
        } else if (state.multiAwaitDrain) {
            state.awaitDrainWriters.delete(dest);
        }
        if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && src.listenerCount("data")) {
            state.flowing = true;
            flow(src);
        }
    };
}
function prependListener(emitter, event, fn) {
    if (typeof emitter.prependListener === "function") {
        return emitter.prependListener(event, fn);
    }
    if (emitter._events.get(event)?.length) {
        const listeners = [
            fn,
            ...emitter._events.get(event)
        ];
        emitter._events.set(event, listeners);
    } else {
        emitter.on(event, fn);
    }
}
function readableAddChunk(stream, chunk, encoding7 = undefined, addToFront) {
    const state = stream._readableState;
    let usedEncoding = encoding7;
    let err;
    if (!state.objectMode) {
        if (typeof chunk === "string") {
            usedEncoding = encoding7 || state.defaultEncoding;
            if (state.encoding !== usedEncoding) {
                if (addToFront && state.encoding) {
                    chunk = Buffer1.from(chunk, usedEncoding).toString(state.encoding);
                } else {
                    chunk = Buffer1.from(chunk, usedEncoding);
                    usedEncoding = "";
                }
            }
        } else if (chunk instanceof Uint8Array) {
            chunk = Buffer1.from(chunk);
        }
    }
    if (err) {
        errorOrDestroy(stream, err);
    } else if (chunk === null) {
        state.reading = false;
        onEofChunk(stream, state);
    } else if (state.objectMode || chunk.length > 0) {
        if (addToFront) {
            if (state.endEmitted) {
                errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
            } else {
                addChunk(stream, state, chunk, true);
            }
        } else if (state.ended) {
            errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
        } else if (state.destroyed || state.errored) {
            return false;
        } else {
            state.reading = false;
            if (state.decoder && !usedEncoding) {
                chunk = state.decoder.write(Buffer1.from(chunk));
                if (state.objectMode || chunk.length !== 0) {
                    addChunk(stream, state, chunk, false);
                } else {
                    maybeReadMore(stream, state);
                }
            } else {
                addChunk(stream, state, chunk, false);
            }
        }
    } else if (!addToFront) {
        state.reading = false;
        maybeReadMore(stream, state);
    }
    return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}
function resume1(stream, state) {
    if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        queueMicrotask(()=>resume_(stream, state)
        );
    }
}
function resume_(stream, state) {
    if (!state.reading) {
        stream.read(0);
    }
    state.resumeScheduled = false;
    stream.emit("resume");
    flow(stream);
    if (state.flowing && !state.reading) {
        stream.read(0);
    }
}
function updateReadableListening(self) {
    const state = self._readableState;
    state.readableListening = self.listenerCount("readable") > 0;
    if (state.resumeScheduled && state[kPaused] === false) {
        state.flowing = true;
    } else if (self.listenerCount("data") > 0) {
        self.resume();
    } else if (!state.readableListening) {
        state.flowing = null;
    }
}
const kOnFinished = Symbol("kOnFinished");
function _destroy1(self, err, cb) {
    self._destroy(err || null, (err1)=>{
        const w = self._writableState;
        if (err1) {
            err1.stack;
            if (!w.errored) {
                w.errored = err1;
            }
        }
        w.closed = true;
        if (typeof cb === "function") {
            cb(err1);
        }
        if (err1) {
            queueMicrotask(()=>{
                if (!w.errorEmitted) {
                    w.errorEmitted = true;
                    self.emit("error", err1);
                }
                w.closeEmitted = true;
                if (w.emitClose) {
                    self.emit("close");
                }
            });
        } else {
            queueMicrotask(()=>{
                w.closeEmitted = true;
                if (w.emitClose) {
                    self.emit("close");
                }
            });
        }
    });
}
function afterWrite(stream, state, count, cb) {
    const needDrain = !state.ending && !stream.destroyed && state.length === 0 && state.needDrain;
    if (needDrain) {
        state.needDrain = false;
        stream.emit("drain");
    }
    while((count--) > 0){
        state.pendingcb--;
        cb();
    }
    if (state.destroyed) {
        errorBuffer(state);
    }
    finishMaybe(stream, state);
}
function afterWriteTick({ cb , count , state , stream  }) {
    state.afterWriteTickInfo = null;
    return afterWrite(stream, state, count, cb);
}
function clearBuffer(stream, state) {
    if (state.corked || state.bufferProcessing || state.destroyed || !state.constructed) {
        return;
    }
    const { buffered , bufferedIndex , objectMode  } = state;
    const bufferedLength = buffered.length - bufferedIndex;
    if (!bufferedLength) {
        return;
    }
    const i2 = bufferedIndex;
    state.bufferProcessing = true;
    if (bufferedLength > 1 && stream._writev) {
        state.pendingcb -= bufferedLength - 1;
        const callback = state.allNoop ? nop2 : (err)=>{
            for(let n = i2; n < buffered.length; ++n){
                buffered[n].callback(err);
            }
        };
        const chunks = state.allNoop && i2 === 0 ? buffered : buffered.slice(i2);
        doWrite(stream, state, true, state.length, chunks, "", callback);
        resetBuffer(state);
    } else {
        do {
            const { chunk , encoding: encoding7 , callback  } = buffered[i2];
            const len = objectMode ? 1 : chunk.length;
            doWrite(stream, state, false, len, chunk, encoding7, callback);
        }while (i2 < buffered.length && !state.writing)
        if (i2 === buffered.length) {
            resetBuffer(state);
        } else if (i2 > 256) {
            buffered.splice(0, i2);
            state.bufferedIndex = 0;
        } else {
            state.bufferedIndex = i2;
        }
    }
    state.bufferProcessing = false;
}
function destroy(err, cb) {
    const w = this._writableState;
    if (w.destroyed) {
        if (typeof cb === "function") {
            cb();
        }
        return this;
    }
    if (err) {
        err.stack;
        if (!w.errored) {
            w.errored = err;
        }
    }
    w.destroyed = true;
    if (!w.constructed) {
        this.once(kDestroy, (er)=>{
            _destroy1(this, err || er, cb);
        });
    } else {
        _destroy1(this, err, cb);
    }
    return this;
}
function doWrite(stream, state, writev, len, chunk, encoding7, cb) {
    state.writelen = len;
    state.writecb = cb;
    state.writing = true;
    state.sync = true;
    if (state.destroyed) {
        state.onwrite(new ERR_STREAM_DESTROYED("write"));
    } else if (writev) {
        stream._writev(chunk, state.onwrite);
    } else {
        stream._write(chunk, encoding7, state.onwrite);
    }
    state.sync = false;
}
function errorBuffer(state) {
    if (state.writing) {
        return;
    }
    for(let n = state.bufferedIndex; n < state.buffered.length; ++n){
        const { chunk , callback  } = state.buffered[n];
        const len = state.objectMode ? 1 : chunk.length;
        state.length -= len;
        callback(new ERR_STREAM_DESTROYED("write"));
    }
    for (const callback of state[kOnFinished].splice(0)){
        callback(new ERR_STREAM_DESTROYED("end"));
    }
    resetBuffer(state);
}
function errorOrDestroy1(stream, err, sync = false) {
    const w = stream._writableState;
    if (w.destroyed) {
        return stream;
    }
    if (w.autoDestroy) {
        stream.destroy(err);
    } else if (err) {
        err.stack;
        if (!w.errored) {
            w.errored = err;
        }
        if (sync) {
            queueMicrotask(()=>{
                if (w.errorEmitted) {
                    return;
                }
                w.errorEmitted = true;
                stream.emit("error", err);
            });
        } else {
            if (w.errorEmitted) {
                return;
            }
            w.errorEmitted = true;
            stream.emit("error", err);
        }
    }
}
function finish(stream, state) {
    state.pendingcb--;
    if (state.errorEmitted || state.closeEmitted) {
        return;
    }
    state.finished = true;
    for (const callback of state[kOnFinished].splice(0)){
        callback();
    }
    stream.emit("finish");
    if (state.autoDestroy) {
        stream.destroy();
    }
}
function finishMaybe(stream, state, sync) {
    if (needFinish(state)) {
        prefinish(stream, state);
        if (state.pendingcb === 0 && needFinish(state)) {
            state.pendingcb++;
            if (sync) {
                queueMicrotask(()=>finish(stream, state)
                );
            } else {
                finish(stream, state);
            }
        }
    }
}
function needFinish(state) {
    return state.ending && state.constructed && state.length === 0 && !state.errored && state.buffered.length === 0 && !state.finished && !state.writing;
}
function nop2() {
}
function resetBuffer(state) {
    state.buffered = [];
    state.bufferedIndex = 0;
    state.allBuffers = true;
    state.allNoop = true;
}
function onwriteError1(stream, state, er, cb) {
    --state.pendingcb;
    cb(er);
    errorBuffer(state);
    errorOrDestroy1(stream, er);
}
function onwrite1(stream, er) {
    const state = stream._writableState;
    const sync = state.sync;
    const cb = state.writecb;
    if (typeof cb !== "function") {
        errorOrDestroy1(stream, new ERR_MULTIPLE_CALLBACK());
        return;
    }
    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;
    if (er) {
        er.stack;
        if (!state.errored) {
            state.errored = er;
        }
        if (sync) {
            queueMicrotask(()=>onwriteError1(stream, state, er, cb)
            );
        } else {
            onwriteError1(stream, state, er, cb);
        }
    } else {
        if (state.buffered.length > state.bufferedIndex) {
            clearBuffer(stream, state);
        }
        if (sync) {
            if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) {
                state.afterWriteTickInfo.count++;
            } else {
                state.afterWriteTickInfo = {
                    count: 1,
                    cb: cb,
                    stream,
                    state
                };
                queueMicrotask(()=>afterWriteTick(state.afterWriteTickInfo)
                );
            }
        } else {
            afterWrite(stream, state, 1, cb);
        }
    }
}
function prefinish(stream, state) {
    if (!state.prefinished && !state.finalCalled) {
        if (typeof stream._final === "function" && !state.destroyed) {
            state.finalCalled = true;
            state.sync = true;
            state.pendingcb++;
            stream._final((err)=>{
                state.pendingcb--;
                if (err) {
                    for (const callback of state[kOnFinished].splice(0)){
                        callback(err);
                    }
                    errorOrDestroy1(stream, err, state.sync);
                } else if (needFinish(state)) {
                    state.prefinished = true;
                    stream.emit("prefinish");
                    state.pendingcb++;
                    queueMicrotask(()=>finish(stream, state)
                    );
                }
            });
            state.sync = false;
        } else {
            state.prefinished = true;
            stream.emit("prefinish");
        }
    }
}
function writeOrBuffer(stream, state, chunk, encoding7, callback) {
    const len = state.objectMode ? 1 : chunk.length;
    state.length += len;
    if (state.writing || state.corked || state.errored || !state.constructed) {
        state.buffered.push({
            chunk,
            encoding: encoding7,
            callback
        });
        if (state.allBuffers && encoding7 !== "buffer") {
            state.allBuffers = false;
        }
        if (state.allNoop && callback !== nop2) {
            state.allNoop = false;
        }
    } else {
        state.writelen = len;
        state.writecb = callback;
        state.writing = true;
        state.sync = true;
        stream._write(chunk, encoding7, state.onwrite);
        state.sync = false;
    }
    const ret1 = state.length < state.highWaterMark;
    if (!ret1) {
        state.needDrain = true;
    }
    return ret1 && !state.errored && !state.destroyed;
}
class WritableState1 {
    [kOnFinished] = [];
    afterWriteTickInfo = null;
    allBuffers = true;
    allNoop = true;
    autoDestroy;
    buffered = [];
    bufferedIndex = 0;
    bufferProcessing = false;
    closed = false;
    closeEmitted = false;
    constructed;
    corked = 0;
    decodeStrings;
    defaultEncoding;
    destroyed = false;
    emitClose;
    ended = false;
    ending = false;
    errored = null;
    errorEmitted = false;
    finalCalled = false;
    finished = false;
    highWaterMark;
    length = 0;
    needDrain = false;
    objectMode;
    onwrite;
    pendingcb = 0;
    prefinished = false;
    sync = true;
    writecb = null;
    writable = true;
    writelen = 0;
    writing = false;
    constructor(options7, stream1){
        this.objectMode = !!options7?.objectMode;
        this.highWaterMark = options7?.highWaterMark ?? (this.objectMode ? 16 : 16 * 1024);
        if (Number.isInteger(this.highWaterMark) && this.highWaterMark >= 0) {
            this.highWaterMark = Math.floor(this.highWaterMark);
        } else {
            throw new ERR_INVALID_OPT_VALUE("highWaterMark", this.highWaterMark);
        }
        this.decodeStrings = !options7?.decodeStrings === false;
        this.defaultEncoding = options7?.defaultEncoding || "utf8";
        this.onwrite = onwrite1.bind(undefined, stream1);
        resetBuffer(this);
        this.emitClose = options7?.emitClose ?? true;
        this.autoDestroy = options7?.autoDestroy ?? true;
        this.constructed = true;
    }
    getBuffer() {
        return this.buffered.slice(this.bufferedIndex);
    }
    get bufferedRequestCount() {
        return this.buffered.length - this.bufferedIndex;
    }
}
class Writable extends Stream1 {
    _final;
    _writableState;
    _writev = null;
    constructor(options1){
        super();
        this._writableState = new WritableState1(options1, this);
        if (options1) {
            if (typeof options1.write === "function") {
                this._write = options1.write;
            }
            if (typeof options1.writev === "function") {
                this._writev = options1.writev;
            }
            if (typeof options1.destroy === "function") {
                this._destroy = options1.destroy;
            }
            if (typeof options1.final === "function") {
                this._final = options1.final;
            }
        }
    }
    [captureRejectionSymbol](err) {
        this.destroy(err);
    }
    static WritableState = WritableState1;
    get destroyed() {
        return this._writableState ? this._writableState.destroyed : false;
    }
    set destroyed(value) {
        if (this._writableState) {
            this._writableState.destroyed = value;
        }
    }
    get writable() {
        const w = this._writableState;
        return !w.destroyed && !w.errored && !w.ending && !w.ended;
    }
    set writable(val) {
        if (this._writableState) {
            this._writableState.writable = !!val;
        }
    }
    get writableFinished() {
        return this._writableState ? this._writableState.finished : false;
    }
    get writableObjectMode() {
        return this._writableState ? this._writableState.objectMode : false;
    }
    get writableBuffer() {
        return this._writableState && this._writableState.getBuffer();
    }
    get writableEnded() {
        return this._writableState ? this._writableState.ending : false;
    }
    get writableHighWaterMark() {
        return this._writableState && this._writableState.highWaterMark;
    }
    get writableCorked() {
        return this._writableState ? this._writableState.corked : 0;
    }
    get writableLength() {
        return this._writableState && this._writableState.length;
    }
    _undestroy() {
        const w = this._writableState;
        w.constructed = true;
        w.destroyed = false;
        w.closed = false;
        w.closeEmitted = false;
        w.errored = null;
        w.errorEmitted = false;
        w.ended = false;
        w.ending = false;
        w.finalCalled = false;
        w.prefinished = false;
        w.finished = false;
    }
    _destroy(err, cb) {
        cb(err);
    }
    destroy(err, cb) {
        const state = this._writableState;
        if (!state.destroyed) {
            queueMicrotask(()=>errorBuffer(state)
            );
        }
        destroy.call(this, err, cb);
        return this;
    }
    end(x, y, z) {
        const state = this._writableState;
        let chunk;
        let encoding7;
        let cb;
        if (typeof x === "function") {
            chunk = null;
            encoding7 = null;
            cb = x;
        } else if (typeof y === "function") {
            chunk = x;
            encoding7 = null;
            cb = y;
        } else {
            chunk = x;
            encoding7 = y;
            cb = z;
        }
        if (chunk !== null && chunk !== undefined) {
            this.write(chunk, encoding7);
        }
        if (state.corked) {
            state.corked = 1;
            this.uncork();
        }
        let err;
        if (!state.errored && !state.ending) {
            state.ending = true;
            finishMaybe(this, state, true);
            state.ended = true;
        } else if (state.finished) {
            err = new ERR_STREAM_ALREADY_FINISHED("end");
        } else if (state.destroyed) {
            err = new ERR_STREAM_DESTROYED("end");
        }
        if (typeof cb === "function") {
            if (err || state.finished) {
                queueMicrotask(()=>{
                    cb(err);
                });
            } else {
                state[kOnFinished].push(cb);
            }
        }
        return this;
    }
    _write(chunk, encoding, cb) {
        if (this._writev) {
            this._writev([
                {
                    chunk,
                    encoding
                }
            ], cb);
        } else {
            throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
        }
    }
    pipe(dest) {
        errorOrDestroy1(this, new ERR_STREAM_CANNOT_PIPE());
        return dest;
    }
    write(chunk, x, y) {
        const state = this._writableState;
        let encoding7;
        let cb;
        if (typeof x === "function") {
            cb = x;
            encoding7 = state.defaultEncoding;
        } else {
            if (!x) {
                encoding7 = state.defaultEncoding;
            } else if (x !== "buffer" && !Buffer1.isEncoding(x)) {
                throw new ERR_UNKNOWN_ENCODING(x);
            } else {
                encoding7 = x;
            }
            if (typeof y !== "function") {
                cb = nop2;
            } else {
                cb = y;
            }
        }
        if (chunk === null) {
            throw new ERR_STREAM_NULL_VALUES();
        } else if (!state.objectMode) {
            if (typeof chunk === "string") {
                if (state.decodeStrings !== false) {
                    chunk = Buffer1.from(chunk, encoding7);
                    encoding7 = "buffer";
                }
            } else if (chunk instanceof Buffer1) {
                encoding7 = "buffer";
            } else if (Stream1._isUint8Array(chunk)) {
                chunk = Stream1._uint8ArrayToBuffer(chunk);
                encoding7 = "buffer";
            } else {
                throw new ERR_INVALID_ARG_TYPE("chunk", [
                    "string",
                    "Buffer",
                    "Uint8Array"
                ], chunk);
            }
        }
        let err;
        if (state.ending) {
            err = new ERR_STREAM_WRITE_AFTER_END();
        } else if (state.destroyed) {
            err = new ERR_STREAM_DESTROYED("write");
        }
        if (err) {
            queueMicrotask(()=>cb(err)
            );
            errorOrDestroy1(this, err, true);
            return false;
        }
        state.pendingcb++;
        return writeOrBuffer(this, state, chunk, encoding7, cb);
    }
    cork() {
        this._writableState.corked++;
    }
    uncork() {
        const state = this._writableState;
        if (state.corked) {
            state.corked--;
            if (!state.writing) {
                clearBuffer(this, state);
            }
        }
    }
    setDefaultEncoding(encoding) {
        if (typeof encoding === "string") {
            encoding = encoding.toLowerCase();
        }
        if (!Buffer1.isEncoding(encoding)) {
            throw new ERR_UNKNOWN_ENCODING(encoding);
        }
        this._writableState.defaultEncoding = encoding;
        return this;
    }
}
function endDuplex(stream1) {
    const state = stream1._readableState;
    if (!state.endEmitted) {
        state.ended = true;
        queueMicrotask(()=>endReadableNT2(state, stream1)
        );
    }
}
function endReadableNT2(state, stream1) {
    if (!state.errorEmitted && !state.closeEmitted && !state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream1.emit("end");
        if (stream1.writable && stream1.allowHalfOpen === false) {
            queueMicrotask(()=>endWritableNT(state, stream1)
            );
        } else if (state.autoDestroy) {
            const wState = stream1._writableState;
            const autoDestroy = !wState || wState.autoDestroy && (wState.finished || wState.writable === false);
            if (autoDestroy) {
                stream1.destroy();
            }
        }
    }
}
function endWritableNT(_state, stream1) {
    const writable = stream1.writable && !stream1.writableEnded && !stream1.destroyed;
    if (writable) {
        stream1.end();
    }
}
function errorOrDestroy2(stream1, err, sync = false) {
    const r = stream1._readableState;
    const w = stream1._writableState;
    if (w.destroyed || r.destroyed) {
        return this;
    }
    if (r.autoDestroy || w.autoDestroy) {
        stream1.destroy(err);
    } else if (err) {
        err.stack;
        if (w && !w.errored) {
            w.errored = err;
        }
        if (r && !r.errored) {
            r.errored = err;
        }
        if (sync) {
            queueMicrotask(()=>{
                if (w.errorEmitted || r.errorEmitted) {
                    return;
                }
                w.errorEmitted = true;
                r.errorEmitted = true;
                stream1.emit("error", err);
            });
        } else {
            if (w.errorEmitted || r.errorEmitted) {
                return;
            }
            w.errorEmitted = true;
            r.errorEmitted = true;
            stream1.emit("error", err);
        }
    }
}
function finish1(stream1, state) {
    state.pendingcb--;
    if (state.errorEmitted || state.closeEmitted) {
        return;
    }
    state.finished = true;
    for (const callback of state[kOnFinished].splice(0)){
        callback();
    }
    stream1.emit("finish");
    if (state.autoDestroy) {
        stream1.destroy();
    }
}
function finishMaybe1(stream1, state, sync) {
    if (needFinish(state)) {
        prefinish(stream1, state);
        if (state.pendingcb === 0 && needFinish(state)) {
            state.pendingcb++;
            if (sync) {
                queueMicrotask(()=>finish1(stream1, state)
                );
            } else {
                finish1(stream1, state);
            }
        }
    }
}
function onwrite2(stream1, er) {
    const state = stream1._writableState;
    const sync = state.sync;
    const cb = state.writecb;
    if (typeof cb !== "function") {
        errorOrDestroy2(stream1, new ERR_MULTIPLE_CALLBACK());
        return;
    }
    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;
    if (er) {
        er.stack;
        if (!state.errored) {
            state.errored = er;
        }
        if (stream1._readableState && !stream1._readableState.errored) {
            stream1._readableState.errored = er;
        }
        if (sync) {
            queueMicrotask(()=>onwriteError2(stream1, state, er, cb)
            );
        } else {
            onwriteError2(stream1, state, er, cb);
        }
    } else {
        if (state.buffered.length > state.bufferedIndex) {
            clearBuffer(stream1, state);
        }
        if (sync) {
            if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) {
                state.afterWriteTickInfo.count++;
            } else {
                state.afterWriteTickInfo = {
                    count: 1,
                    cb: cb,
                    stream: stream1,
                    state
                };
                queueMicrotask(()=>afterWriteTick(state.afterWriteTickInfo)
                );
            }
        } else {
            afterWrite(stream1, state, 1, cb);
        }
    }
}
function onwriteError2(stream1, state, er, cb) {
    --state.pendingcb;
    cb(er);
    errorBuffer(state);
    errorOrDestroy2(stream1, er);
}
function readableAddChunk1(stream1, chunk, encoding7 = undefined, addToFront) {
    const state = stream1._readableState;
    let usedEncoding = encoding7;
    let err;
    if (!state.objectMode) {
        if (typeof chunk === "string") {
            usedEncoding = encoding7 || state.defaultEncoding;
            if (state.encoding !== usedEncoding) {
                if (addToFront && state.encoding) {
                    chunk = Buffer1.from(chunk, usedEncoding).toString(state.encoding);
                } else {
                    chunk = Buffer1.from(chunk, usedEncoding);
                    usedEncoding = "";
                }
            }
        } else if (chunk instanceof Uint8Array) {
            chunk = Buffer1.from(chunk);
        }
    }
    if (err) {
        errorOrDestroy2(stream1, err);
    } else if (chunk === null) {
        state.reading = false;
        onEofChunk(stream1, state);
    } else if (state.objectMode || chunk.length > 0) {
        if (addToFront) {
            if (state.endEmitted) {
                errorOrDestroy2(stream1, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
            } else {
                addChunk(stream1, state, chunk, true);
            }
        } else if (state.ended) {
            errorOrDestroy2(stream1, new ERR_STREAM_PUSH_AFTER_EOF());
        } else if (state.destroyed || state.errored) {
            return false;
        } else {
            state.reading = false;
            if (state.decoder && !usedEncoding) {
                chunk = state.decoder.write(Buffer1.from(chunk));
                if (state.objectMode || chunk.length !== 0) {
                    addChunk(stream1, state, chunk, false);
                } else {
                    maybeReadMore(stream1, state);
                }
            } else {
                addChunk(stream1, state, chunk, false);
            }
        }
    } else if (!addToFront) {
        state.reading = false;
        maybeReadMore(stream1, state);
    }
    return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}
class ReadableState1 {
    [kPaused] = null;
    awaitDrainWriters = null;
    buffer = new BufferList();
    closed = false;
    closeEmitted = false;
    constructed;
    decoder = null;
    destroyed = false;
    emittedReadable = false;
    encoding = null;
    ended = false;
    endEmitted = false;
    errored = null;
    errorEmitted = false;
    flowing = null;
    highWaterMark;
    length = 0;
    multiAwaitDrain = false;
    needReadable = false;
    objectMode;
    pipes = [];
    readable = true;
    readableListening = false;
    reading = false;
    readingMore = false;
    resumeScheduled = false;
    sync = true;
    emitClose;
    autoDestroy;
    defaultEncoding;
    constructor(options2){
        this.objectMode = !!options2?.objectMode;
        this.highWaterMark = options2?.highWaterMark ?? (this.objectMode ? 16 : 16 * 1024);
        if (Number.isInteger(this.highWaterMark) && this.highWaterMark >= 0) {
            this.highWaterMark = Math.floor(this.highWaterMark);
        } else {
            throw new ERR_INVALID_OPT_VALUE("highWaterMark", this.highWaterMark);
        }
        this.emitClose = options2?.emitClose ?? true;
        this.autoDestroy = options2?.autoDestroy ?? true;
        this.defaultEncoding = options2?.defaultEncoding || "utf8";
        if (options2?.encoding) {
            this.decoder = new StringDecoder(options2.encoding);
            this.encoding = options2.encoding;
        }
        this.constructed = true;
    }
}
const kLastResolve = Symbol("lastResolve");
function from(iterable, opts) {
    let iterator;
    if (typeof iterable === "string" || iterable instanceof Buffer1) {
        return new Readable({
            objectMode: true,
            ...opts,
            read () {
                this.push(iterable);
                this.push(null);
            }
        });
    }
    if (Symbol.asyncIterator in iterable) {
        iterator = iterable[Symbol.asyncIterator]();
    } else if (Symbol.iterator in iterable) {
        iterator = iterable[Symbol.iterator]();
    } else {
        throw new ERR_INVALID_ARG_TYPE("iterable", [
            "Iterable"
        ], iterable);
    }
    const readable = new Readable({
        objectMode: true,
        highWaterMark: 1,
        ...opts
    });
    let reading = false;
    let needToClose = false;
    readable._read = function() {
        if (!reading) {
            reading = true;
            next();
        }
    };
    readable._destroy = function(error1, cb) {
        if (needToClose) {
            needToClose = false;
            close().then(()=>queueMicrotask(()=>cb(error1)
                )
            , (e)=>queueMicrotask(()=>cb(error1 || e)
                )
            );
        } else {
            cb(error1);
        }
    };
    async function close() {
        if (typeof iterator.return === "function") {
            const { value: value7  } = await iterator.return();
            await value7;
        }
    }
    async function next() {
        try {
            needToClose = false;
            const { value: value7 , done  } = await iterator.next();
            needToClose = !done;
            if (done) {
                readable.push(null);
            } else if (readable.destroyed) {
                await close();
            } else {
                const res = await value7;
                if (res === null) {
                    reading = false;
                    throw new ERR_STREAM_NULL_VALUES();
                } else if (readable.push(res)) {
                    next();
                } else {
                    reading = false;
                }
            }
        } catch (err) {
            readable.destroy(err);
        }
    }
    return readable;
}
class Readable extends Stream1 {
    _readableState;
    constructor(options3){
        super();
        if (options3) {
            if (typeof options3.read === "function") {
                this._read = options3.read;
            }
            if (typeof options3.destroy === "function") {
                this._destroy = options3.destroy;
            }
        }
        this._readableState = new ReadableState1(options3);
    }
    static from(iterable, opts) {
        return from(iterable, opts);
    }
    static ReadableState = ReadableState1;
    static _fromList = fromList;
    read(n) {
        if (n === undefined) {
            n = NaN;
        }
        const state = this._readableState;
        const nOrig = n;
        if (n > state.highWaterMark) {
            state.highWaterMark = computeNewHighWaterMark(n);
        }
        if (n !== 0) {
            state.emittedReadable = false;
        }
        if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
            if (state.length === 0 && state.ended) {
                endReadable(this);
            } else {
                emitReadable(this);
            }
            return null;
        }
        n = howMuchToRead(n, state);
        if (n === 0 && state.ended) {
            if (state.length === 0) {
                endReadable(this);
            }
            return null;
        }
        let doRead = state.needReadable;
        if (state.length === 0 || state.length - n < state.highWaterMark) {
            doRead = true;
        }
        if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
            doRead = false;
        } else if (doRead) {
            state.reading = true;
            state.sync = true;
            if (state.length === 0) {
                state.needReadable = true;
            }
            this._read();
            state.sync = false;
            if (!state.reading) {
                n = howMuchToRead(nOrig, state);
            }
        }
        let ret1;
        if (n > 0) {
            ret1 = fromList(n, state);
        } else {
            ret1 = null;
        }
        if (ret1 === null) {
            state.needReadable = state.length <= state.highWaterMark;
            n = 0;
        } else {
            state.length -= n;
            if (state.multiAwaitDrain) {
                state.awaitDrainWriters.clear();
            } else {
                state.awaitDrainWriters = null;
            }
        }
        if (state.length === 0) {
            if (!state.ended) {
                state.needReadable = true;
            }
            if (nOrig !== n && state.ended) {
                endReadable(this);
            }
        }
        if (ret1 !== null) {
            this.emit("data", ret1);
        }
        return ret1;
    }
    _read(_size) {
        throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
    }
    pipe(dest, pipeOpts) {
        const src = this;
        const state = this._readableState;
        if (state.pipes.length === 1) {
            if (!state.multiAwaitDrain) {
                state.multiAwaitDrain = true;
                state.awaitDrainWriters = new Set(state.awaitDrainWriters ? [
                    state.awaitDrainWriters
                ] : []);
            }
        }
        state.pipes.push(dest);
        const doEnd = !pipeOpts || pipeOpts.end !== false;
        const endFn = doEnd ? onend : unpipe;
        if (state.endEmitted) {
            queueMicrotask(endFn);
        } else {
            this.once("end", endFn);
        }
        dest.on("unpipe", onunpipe);
        function onunpipe(readable, unpipeInfo) {
            if (readable === src) {
                if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
                    unpipeInfo.hasUnpiped = true;
                    cleanup();
                }
            }
        }
        function onend() {
            dest.end();
        }
        let ondrain;
        let cleanedUp = false;
        function cleanup() {
            dest.removeListener("close", onclose);
            dest.removeListener("finish", onfinish);
            if (ondrain) {
                dest.removeListener("drain", ondrain);
            }
            dest.removeListener("error", onerror);
            dest.removeListener("unpipe", onunpipe);
            src.removeListener("end", onend);
            src.removeListener("end", unpipe);
            src.removeListener("data", ondata);
            cleanedUp = true;
            if (ondrain && state.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain)) {
                ondrain();
            }
        }
        this.on("data", ondata);
        function ondata(chunk) {
            const ret1 = dest.write(chunk);
            if (ret1 === false) {
                if (!cleanedUp) {
                    if (state.pipes.length === 1 && state.pipes[0] === dest) {
                        state.awaitDrainWriters = dest;
                        state.multiAwaitDrain = false;
                    } else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
                        state.awaitDrainWriters.add(dest);
                    }
                    src.pause();
                }
                if (!ondrain) {
                    ondrain = pipeOnDrain(src, dest);
                    dest.on("drain", ondrain);
                }
            }
        }
        function onerror(er) {
            unpipe();
            dest.removeListener("error", onerror);
            if (dest.listenerCount("error") === 0) {
                const s = dest._writableState || dest._readableState;
                if (s && !s.errorEmitted) {
                    if (dest instanceof Duplex) {
                        errorOrDestroy2(dest, er);
                    } else {
                        errorOrDestroy1(dest, er);
                    }
                } else {
                    dest.emit("error", er);
                }
            }
        }
        prependListener(dest, "error", onerror);
        function onclose() {
            dest.removeListener("finish", onfinish);
            unpipe();
        }
        dest.once("close", onclose);
        function onfinish() {
            dest.removeListener("close", onclose);
            unpipe();
        }
        dest.once("finish", onfinish);
        function unpipe() {
            src.unpipe(dest);
        }
        dest.emit("pipe", this);
        if (!state.flowing) {
            this.resume();
        }
        return dest;
    }
    isPaused() {
        return this._readableState[kPaused] === true || this._readableState.flowing === false;
    }
    setEncoding(enc) {
        const decoder2 = new StringDecoder(enc);
        this._readableState.decoder = decoder2;
        this._readableState.encoding = this._readableState.decoder.encoding;
        const buffer = this._readableState.buffer;
        let content = "";
        for (const data of buffer){
            content += decoder2.write(data);
        }
        buffer.clear();
        if (content !== "") {
            buffer.push(content);
        }
        this._readableState.length = content.length;
        return this;
    }
    on(ev, fn) {
        const res = super.on.call(this, ev, fn);
        const state = this._readableState;
        if (ev === "data") {
            state.readableListening = this.listenerCount("readable") > 0;
            if (state.flowing !== false) {
                this.resume();
            }
        } else if (ev === "readable") {
            if (!state.endEmitted && !state.readableListening) {
                state.readableListening = state.needReadable = true;
                state.flowing = false;
                state.emittedReadable = false;
                if (state.length) {
                    emitReadable(this);
                } else if (!state.reading) {
                    queueMicrotask(()=>nReadingNextTick(this)
                    );
                }
            }
        }
        return res;
    }
    removeListener(ev, fn) {
        const res = super.removeListener.call(this, ev, fn);
        if (ev === "readable") {
            queueMicrotask(()=>updateReadableListening(this)
            );
        }
        return res;
    }
    off = this.removeListener;
    destroy(err, cb) {
        const r = this._readableState;
        if (r.destroyed) {
            if (typeof cb === "function") {
                cb();
            }
            return this;
        }
        if (err) {
            err.stack;
            if (!r.errored) {
                r.errored = err;
            }
        }
        r.destroyed = true;
        if (!r.constructed) {
            this.once(kDestroy, (er)=>{
                _destroy(this, err || er, cb);
            });
        } else {
            _destroy(this, err, cb);
        }
        return this;
    }
    _undestroy() {
        const r = this._readableState;
        r.constructed = true;
        r.closed = false;
        r.closeEmitted = false;
        r.destroyed = false;
        r.errored = null;
        r.errorEmitted = false;
        r.reading = false;
        r.ended = false;
        r.endEmitted = false;
    }
    _destroy(error, callback) {
        callback(error);
    }
    [captureRejectionSymbol](err) {
        this.destroy(err);
    }
    push(chunk, encoding) {
        return readableAddChunk(this, chunk, encoding, false);
    }
    unshift(chunk, encoding) {
        return readableAddChunk(this, chunk, encoding, true);
    }
    unpipe(dest) {
        const state = this._readableState;
        const unpipeInfo = {
            hasUnpiped: false
        };
        if (state.pipes.length === 0) {
            return this;
        }
        if (!dest) {
            const dests = state.pipes;
            state.pipes = [];
            this.pause();
            for (const dest of dests){
                dest.emit("unpipe", this, {
                    hasUnpiped: false
                });
            }
            return this;
        }
        const index = state.pipes.indexOf(dest);
        if (index === -1) {
            return this;
        }
        state.pipes.splice(index, 1);
        if (state.pipes.length === 0) {
            this.pause();
        }
        dest.emit("unpipe", this, unpipeInfo);
        return this;
    }
    removeAllListeners(ev) {
        const res = super.removeAllListeners(ev);
        if (ev === "readable" || ev === undefined) {
            queueMicrotask(()=>updateReadableListening(this)
            );
        }
        return res;
    }
    resume() {
        const state = this._readableState;
        if (!state.flowing) {
            state.flowing = !state.readableListening;
            resume1(this, state);
        }
        state[kPaused] = false;
        return this;
    }
    pause() {
        if (this._readableState.flowing !== false) {
            this._readableState.flowing = false;
            this.emit("pause");
        }
        this._readableState[kPaused] = true;
        return this;
    }
    wrap(stream) {
        const state = this._readableState;
        let paused = false;
        stream.on("end", ()=>{
            if (state.decoder && !state.ended) {
                const chunk = state.decoder.end();
                if (chunk && chunk.length) {
                    this.push(chunk);
                }
            }
            this.push(null);
        });
        stream.on("data", (chunk)=>{
            if (state.decoder) {
                chunk = state.decoder.write(chunk);
            }
            if (state.objectMode && (chunk === null || chunk === undefined)) {
                return;
            } else if (!state.objectMode && (!chunk || !chunk.length)) {
                return;
            }
            const ret1 = this.push(chunk);
            if (!ret1) {
                paused = true;
                stream.pause();
            }
        });
        for(const i2 in stream){
            if (this[i2] === undefined && typeof stream[i2] === "function") {
                this[i2] = (function methodWrap(method) {
                    return function methodWrapReturnFunction() {
                        return stream[method].apply(stream);
                    };
                })(i2);
            }
        }
        stream.on("error", (err)=>{
            errorOrDestroy(this, err);
        });
        stream.on("close", ()=>{
            this.emit("close");
        });
        stream.on("destroy", ()=>{
            this.emit("destroy");
        });
        stream.on("pause", ()=>{
            this.emit("pause");
        });
        stream.on("resume", ()=>{
            this.emit("resume");
        });
        this._read = ()=>{
            if (paused) {
                paused = false;
                stream.resume();
            }
        };
        return this;
    }
    [Symbol.asyncIterator]() {
        return createReadableStreamAsyncIterator(this);
    }
    get readable() {
        return this._readableState?.readable && !this._readableState?.destroyed && !this._readableState?.errorEmitted && !this._readableState?.endEmitted;
    }
    set readable(val) {
        if (this._readableState) {
            this._readableState.readable = val;
        }
    }
    get readableHighWaterMark() {
        return this._readableState.highWaterMark;
    }
    get readableBuffer() {
        return this._readableState && this._readableState.buffer;
    }
    get readableFlowing() {
        return this._readableState.flowing;
    }
    set readableFlowing(state) {
        if (this._readableState) {
            this._readableState.flowing = state;
        }
    }
    get readableLength() {
        return this._readableState.length;
    }
    get readableObjectMode() {
        return this._readableState ? this._readableState.objectMode : false;
    }
    get readableEncoding() {
        return this._readableState ? this._readableState.encoding : null;
    }
    get destroyed() {
        if (this._readableState === undefined) {
            return false;
        }
        return this._readableState.destroyed;
    }
    set destroyed(value) {
        if (!this._readableState) {
            return;
        }
        this._readableState.destroyed = value;
    }
    get readableEnded() {
        return this._readableState ? this._readableState.endEmitted : false;
    }
}
class Duplex extends Stream1 {
    allowHalfOpen = true;
    _final;
    _readableState;
    _writableState;
    _writev;
    constructor(options4){
        super();
        if (options4) {
            if (options4.allowHalfOpen === false) {
                this.allowHalfOpen = false;
            }
            if (typeof options4.destroy === "function") {
                this._destroy = options4.destroy;
            }
            if (typeof options4.final === "function") {
                this._final = options4.final;
            }
            if (typeof options4.read === "function") {
                this._read = options4.read;
            }
            if (options4.readable === false) {
                this.readable = false;
            }
            if (options4.writable === false) {
                this.writable = false;
            }
            if (typeof options4.write === "function") {
                this._write = options4.write;
            }
            if (typeof options4.writev === "function") {
                this._writev = options4.writev;
            }
        }
        const readableOptions = {
            autoDestroy: options4?.autoDestroy,
            defaultEncoding: options4?.defaultEncoding,
            destroy: options4?.destroy,
            emitClose: options4?.emitClose,
            encoding: options4?.encoding,
            highWaterMark: options4?.highWaterMark ?? options4?.readableHighWaterMark,
            objectMode: options4?.objectMode ?? options4?.readableObjectMode,
            read: options4?.read
        };
        const writableOptions = {
            autoDestroy: options4?.autoDestroy,
            decodeStrings: options4?.decodeStrings,
            defaultEncoding: options4?.defaultEncoding,
            destroy: options4?.destroy,
            emitClose: options4?.emitClose,
            final: options4?.final,
            highWaterMark: options4?.highWaterMark ?? options4?.writableHighWaterMark,
            objectMode: options4?.objectMode ?? options4?.writableObjectMode,
            write: options4?.write,
            writev: options4?.writev
        };
        this._readableState = new ReadableState1(readableOptions);
        this._writableState = new WritableState1(writableOptions, this);
        this._writableState.onwrite = onwrite2.bind(undefined, this);
    }
    [captureRejectionSymbol](err) {
        this.destroy(err);
    }
    [Symbol.asyncIterator]() {
        return createReadableStreamAsyncIterator(this);
    }
    _destroy(error, callback) {
        callback(error);
    }
    _read = Readable.prototype._read;
    _undestroy = Readable.prototype._undestroy;
    destroy(err, cb) {
        const r = this._readableState;
        const w = this._writableState;
        if (w.destroyed || r.destroyed) {
            if (typeof cb === "function") {
                cb();
            }
            return this;
        }
        if (err) {
            err.stack;
            if (!w.errored) {
                w.errored = err;
            }
            if (!r.errored) {
                r.errored = err;
            }
        }
        w.destroyed = true;
        r.destroyed = true;
        this._destroy(err || null, (err)=>{
            if (err) {
                err.stack;
                if (!w.errored) {
                    w.errored = err;
                }
                if (!r.errored) {
                    r.errored = err;
                }
            }
            w.closed = true;
            r.closed = true;
            if (typeof cb === "function") {
                cb(err);
            }
            if (err) {
                queueMicrotask(()=>{
                    const r1 = this._readableState;
                    const w1 = this._writableState;
                    if (!w1.errorEmitted && !r1.errorEmitted) {
                        w1.errorEmitted = true;
                        r1.errorEmitted = true;
                        this.emit("error", err);
                    }
                    r1.closeEmitted = true;
                    if (w1.emitClose || r1.emitClose) {
                        this.emit("close");
                    }
                });
            } else {
                queueMicrotask(()=>{
                    const r1 = this._readableState;
                    const w1 = this._writableState;
                    r1.closeEmitted = true;
                    if (w1.emitClose || r1.emitClose) {
                        this.emit("close");
                    }
                });
            }
        });
        return this;
    }
    isPaused = Readable.prototype.isPaused;
    off = this.removeListener;
    on(ev, fn) {
        const res = super.on.call(this, ev, fn);
        const state = this._readableState;
        if (ev === "data") {
            state.readableListening = this.listenerCount("readable") > 0;
            if (state.flowing !== false) {
                this.resume();
            }
        } else if (ev === "readable") {
            if (!state.endEmitted && !state.readableListening) {
                state.readableListening = state.needReadable = true;
                state.flowing = false;
                state.emittedReadable = false;
                if (state.length) {
                    emitReadable(this);
                } else if (!state.reading) {
                    queueMicrotask(()=>nReadingNextTick(this)
                    );
                }
            }
        }
        return res;
    }
    pause = Readable.prototype.pause;
    pipe = Readable.prototype.pipe;
    push(chunk, encoding) {
        return readableAddChunk1(this, chunk, encoding, false);
    }
    read(n) {
        if (n === undefined) {
            n = NaN;
        }
        const state = this._readableState;
        const nOrig = n;
        if (n > state.highWaterMark) {
            state.highWaterMark = computeNewHighWaterMark(n);
        }
        if (n !== 0) {
            state.emittedReadable = false;
        }
        if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
            if (state.length === 0 && state.ended) {
                endDuplex(this);
            } else {
                emitReadable(this);
            }
            return null;
        }
        n = howMuchToRead(n, state);
        if (n === 0 && state.ended) {
            if (state.length === 0) {
                endDuplex(this);
            }
            return null;
        }
        let doRead = state.needReadable;
        if (state.length === 0 || state.length - n < state.highWaterMark) {
            doRead = true;
        }
        if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
            doRead = false;
        } else if (doRead) {
            state.reading = true;
            state.sync = true;
            if (state.length === 0) {
                state.needReadable = true;
            }
            this._read();
            state.sync = false;
            if (!state.reading) {
                n = howMuchToRead(nOrig, state);
            }
        }
        let ret1;
        if (n > 0) {
            ret1 = fromList(n, state);
        } else {
            ret1 = null;
        }
        if (ret1 === null) {
            state.needReadable = state.length <= state.highWaterMark;
            n = 0;
        } else {
            state.length -= n;
            if (state.multiAwaitDrain) {
                state.awaitDrainWriters.clear();
            } else {
                state.awaitDrainWriters = null;
            }
        }
        if (state.length === 0) {
            if (!state.ended) {
                state.needReadable = true;
            }
            if (nOrig !== n && state.ended) {
                endDuplex(this);
            }
        }
        if (ret1 !== null) {
            this.emit("data", ret1);
        }
        return ret1;
    }
    removeAllListeners(ev) {
        const res = super.removeAllListeners(ev);
        if (ev === "readable" || ev === undefined) {
            queueMicrotask(()=>updateReadableListening(this)
            );
        }
        return res;
    }
    removeListener(ev, fn) {
        const res = super.removeListener.call(this, ev, fn);
        if (ev === "readable") {
            queueMicrotask(()=>updateReadableListening(this)
            );
        }
        return res;
    }
    resume = Readable.prototype.resume;
    setEncoding = Readable.prototype.setEncoding;
    unshift(chunk, encoding) {
        return readableAddChunk1(this, chunk, encoding, true);
    }
    unpipe = Readable.prototype.unpipe;
    wrap = Readable.prototype.wrap;
    get readable() {
        return this._readableState?.readable && !this._readableState?.destroyed && !this._readableState?.errorEmitted && !this._readableState?.endEmitted;
    }
    set readable(val) {
        if (this._readableState) {
            this._readableState.readable = val;
        }
    }
    get readableHighWaterMark() {
        return this._readableState.highWaterMark;
    }
    get readableBuffer() {
        return this._readableState && this._readableState.buffer;
    }
    get readableFlowing() {
        return this._readableState.flowing;
    }
    set readableFlowing(state) {
        if (this._readableState) {
            this._readableState.flowing = state;
        }
    }
    get readableLength() {
        return this._readableState.length;
    }
    get readableObjectMode() {
        return this._readableState ? this._readableState.objectMode : false;
    }
    get readableEncoding() {
        return this._readableState ? this._readableState.encoding : null;
    }
    get readableEnded() {
        return this._readableState ? this._readableState.endEmitted : false;
    }
    _write = Writable.prototype._write;
    write = Writable.prototype.write;
    cork = Writable.prototype.cork;
    uncork = Writable.prototype.uncork;
    setDefaultEncoding(encoding) {
        if (typeof encoding === "string") {
            encoding = encoding.toLowerCase();
        }
        if (!Buffer1.isEncoding(encoding)) {
            throw new ERR_UNKNOWN_ENCODING(encoding);
        }
        this._writableState.defaultEncoding = encoding;
        return this;
    }
    end(x, y, z) {
        const state = this._writableState;
        let chunk;
        let encoding7;
        let cb;
        if (typeof x === "function") {
            chunk = null;
            encoding7 = null;
            cb = x;
        } else if (typeof y === "function") {
            chunk = x;
            encoding7 = null;
            cb = y;
        } else {
            chunk = x;
            encoding7 = y;
            cb = z;
        }
        if (chunk !== null && chunk !== undefined) {
            this.write(chunk, encoding7);
        }
        if (state.corked) {
            state.corked = 1;
            this.uncork();
        }
        let err;
        if (!state.errored && !state.ending) {
            state.ending = true;
            finishMaybe1(this, state, true);
            state.ended = true;
        } else if (state.finished) {
            err = new ERR_STREAM_ALREADY_FINISHED("end");
        } else if (state.destroyed) {
            err = new ERR_STREAM_DESTROYED("end");
        }
        if (typeof cb === "function") {
            if (err || state.finished) {
                queueMicrotask(()=>{
                    cb(err);
                });
            } else {
                state[kOnFinished].push(cb);
            }
        }
        return this;
    }
    get destroyed() {
        if (this._readableState === undefined || this._writableState === undefined) {
            return false;
        }
        return this._readableState.destroyed && this._writableState.destroyed;
    }
    set destroyed(value) {
        if (this._readableState && this._writableState) {
            this._readableState.destroyed = value;
            this._writableState.destroyed = value;
        }
    }
    get writable() {
        const w = this._writableState;
        return !w.destroyed && !w.errored && !w.ending && !w.ended;
    }
    set writable(val) {
        if (this._writableState) {
            this._writableState.writable = !!val;
        }
    }
    get writableFinished() {
        return this._writableState ? this._writableState.finished : false;
    }
    get writableObjectMode() {
        return this._writableState ? this._writableState.objectMode : false;
    }
    get writableBuffer() {
        return this._writableState && this._writableState.getBuffer();
    }
    get writableEnded() {
        return this._writableState ? this._writableState.ending : false;
    }
    get writableHighWaterMark() {
        return this._writableState && this._writableState.highWaterMark;
    }
    get writableCorked() {
        return this._writableState ? this._writableState.corked : 0;
    }
    get writableLength() {
        return this._writableState && this._writableState.length;
    }
}
Object.defineProperties(Readable, {
    _readableState: {
        enumerable: false
    },
    destroyed: {
        enumerable: false
    },
    readableBuffer: {
        enumerable: false
    },
    readableEncoding: {
        enumerable: false
    },
    readableEnded: {
        enumerable: false
    },
    readableFlowing: {
        enumerable: false
    },
    readableHighWaterMark: {
        enumerable: false
    },
    readableLength: {
        enumerable: false
    },
    readableObjectMode: {
        enumerable: false
    }
});
const kLastReject = Symbol("lastReject");
const kError = Symbol("error");
const kEnded = Symbol("ended");
const kLastPromise = Symbol("lastPromise");
const kHandlePromise = Symbol("handlePromise");
const kStream = Symbol("stream");
function initIteratorSymbols(o, symbols) {
    const properties = {
    };
    for(const sym in symbols){
        properties[sym] = {
            configurable: false,
            enumerable: false,
            writable: true
        };
    }
    Object.defineProperties(o, properties);
}
function createIterResult1(value7, done) {
    return {
        value: value7,
        done
    };
}
function readAndResolve(iter) {
    const resolve3 = iter[kLastResolve];
    if (resolve3 !== null) {
        const data = iter[kStream].read();
        if (data !== null) {
            iter[kLastPromise] = null;
            iter[kLastResolve] = null;
            iter[kLastReject] = null;
            resolve3(createIterResult1(data, false));
        }
    }
}
function onReadable(iter) {
    queueMicrotask(()=>readAndResolve(iter)
    );
}
function wrapForNext(lastPromise, iter) {
    return (resolve3, reject)=>{
        lastPromise.then(()=>{
            if (iter[kEnded]) {
                resolve3(createIterResult1(undefined, true));
                return;
            }
            iter[kHandlePromise](resolve3, reject);
        }, reject);
    };
}
function finish2(self, err) {
    return new Promise((resolve3, reject)=>{
        const stream2 = self[kStream];
        eos(stream2, (err1)=>{
            if (err1 && err1.code !== "ERR_STREAM_PREMATURE_CLOSE") {
                reject(err1);
            } else {
                resolve3(createIterResult1(undefined, true));
            }
        });
        destroyer(stream2, err);
    });
}
const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function*() {
}).prototype);
class ReadableStreamAsyncIterator {
    [kEnded];
    [kError] = null;
    [kHandlePromise] = (resolve3, reject)=>{
        const data = this[kStream].read();
        if (data) {
            this[kLastPromise] = null;
            this[kLastResolve] = null;
            this[kLastReject] = null;
            resolve3(createIterResult1(data, false));
        } else {
            this[kLastResolve] = resolve3;
            this[kLastReject] = reject;
        }
    };
    [kLastPromise];
    [kLastReject] = null;
    [kLastResolve] = null;
    [kStream];
    [Symbol.asyncIterator] = AsyncIteratorPrototype[Symbol.asyncIterator];
    constructor(stream2){
        this[kEnded] = stream2.readableEnded || stream2._readableState.endEmitted;
        this[kStream] = stream2;
        initIteratorSymbols(this, [
            kEnded,
            kError,
            kHandlePromise,
            kLastPromise,
            kLastReject,
            kLastResolve,
            kStream, 
        ]);
    }
    get stream() {
        return this[kStream];
    }
    next() {
        const error2 = this[kError];
        if (error2 !== null) {
            return Promise.reject(error2);
        }
        if (this[kEnded]) {
            return Promise.resolve(createIterResult1(undefined, true));
        }
        if (this[kStream].destroyed) {
            return new Promise((resolve3, reject)=>{
                if (this[kError]) {
                    reject(this[kError]);
                } else if (this[kEnded]) {
                    resolve3(createIterResult1(undefined, true));
                } else {
                    eos(this[kStream], (err)=>{
                        if (err && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
                            reject(err);
                        } else {
                            resolve3(createIterResult1(undefined, true));
                        }
                    });
                }
            });
        }
        const lastPromise = this[kLastPromise];
        let promise;
        if (lastPromise) {
            promise = new Promise(wrapForNext(lastPromise, this));
        } else {
            const data = this[kStream].read();
            if (data !== null) {
                return Promise.resolve(createIterResult1(data, false));
            }
            promise = new Promise(this[kHandlePromise]);
        }
        this[kLastPromise] = promise;
        return promise;
    }
    return() {
        return finish2(this);
    }
    throw(err) {
        return finish2(this, err);
    }
}
const createReadableStreamAsyncIterator = (stream3)=>{
    if (typeof stream3.read !== "function") {
        const src = stream3;
        stream3 = new Readable({
            objectMode: true
        }).wrap(src);
        eos(stream3, (err)=>destroyer(src, err)
        );
    }
    const iterator = new ReadableStreamAsyncIterator(stream3);
    iterator[kLastPromise] = null;
    eos(stream3, {
        writable: false
    }, (err)=>{
        if (err && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
            const reject = iterator[kLastReject];
            if (reject !== null) {
                iterator[kLastPromise] = null;
                iterator[kLastResolve] = null;
                iterator[kLastReject] = null;
                reject(err);
            }
            iterator[kError] = err;
            return;
        }
        const resolve3 = iterator[kLastResolve];
        if (resolve3 !== null) {
            iterator[kLastPromise] = null;
            iterator[kLastResolve] = null;
            iterator[kLastReject] = null;
            resolve3(createIterResult1(undefined, true));
        }
        iterator[kEnded] = true;
    });
    stream3.on("readable", onReadable.bind(null, iterator));
    return iterator;
};
const kCallback = Symbol("kCallback");
class Transform extends Duplex {
    [kCallback];
    _flush;
    constructor(options5){
        super(options5);
        this._readableState.sync = false;
        this[kCallback] = null;
        if (options5) {
            if (typeof options5.transform === "function") {
                this._transform = options5.transform;
            }
            if (typeof options5.flush === "function") {
                this._flush = options5.flush;
            }
        }
        this.on("prefinish", function() {
            if (typeof this._flush === "function" && !this.destroyed) {
                this._flush((er, data)=>{
                    if (er) {
                        this.destroy(er);
                        return;
                    }
                    if (data != null) {
                        this.push(data);
                    }
                    this.push(null);
                });
            } else {
                this.push(null);
            }
        });
    }
    _read = ()=>{
        if (this[kCallback]) {
            const callback = this[kCallback];
            this[kCallback] = null;
            callback();
        }
    };
    _transform(_chunk, _encoding, _callback) {
        throw new ERR_METHOD_NOT_IMPLEMENTED("_transform()");
    }
    _write = (chunk, encoding7, callback)=>{
        const rState = this._readableState;
        const wState = this._writableState;
        const length = rState.length;
        this._transform(chunk, encoding7, (err, val)=>{
            if (err) {
                callback(err);
                return;
            }
            if (val != null) {
                this.push(val);
            }
            if (wState.ended || length === rState.length || rState.length < rState.highWaterMark || rState.length === 0) {
                callback();
            } else {
                this[kCallback] = callback;
            }
        });
    };
}
class PassThrough extends Transform {
    constructor(options6){
        super(options6);
    }
    _transform(chunk, _encoding, cb) {
        cb(null, chunk);
    }
}
function destroyer1(stream3, reading, writing, callback) {
    callback = once(callback);
    let finished = false;
    stream3.on("close", ()=>{
        finished = true;
    });
    eos(stream3, {
        readable: reading,
        writable: writing
    }, (err)=>{
        finished = !err;
        const rState = stream3?._readableState;
        if (err && err.code === "ERR_STREAM_PREMATURE_CLOSE" && reading && rState?.ended && !rState?.errored && !rState?.errorEmitted) {
            stream3.once("end", callback).once("error", callback);
        } else {
            callback(err);
        }
    });
    return (err)=>{
        if (finished) return;
        finished = true;
        destroyer(stream3, err);
        callback(err || new ERR_STREAM_DESTROYED("pipe"));
    };
}
function popCallback(streams) {
    if (typeof streams[streams.length - 1] !== "function") {
        throw new ERR_INVALID_CALLBACK(streams[streams.length - 1]);
    }
    return streams.pop();
}
function isReadable1(obj) {
    return !!(obj && typeof obj.pipe === "function");
}
function isWritable1(obj) {
    return !!(obj && typeof obj.write === "function");
}
function isStream(obj) {
    return isReadable1(obj) || isWritable1(obj);
}
function isIterable(obj, isAsync) {
    if (!obj) return false;
    if (isAsync === true) return typeof obj[Symbol.asyncIterator] === "function";
    if (isAsync === false) return typeof obj[Symbol.iterator] === "function";
    return typeof obj[Symbol.asyncIterator] === "function" || typeof obj[Symbol.iterator] === "function";
}
function makeAsyncIterable(val) {
    if (isIterable(val)) {
        return val;
    } else if (isReadable1(val)) {
        return fromReadable(val);
    }
    throw new ERR_INVALID_ARG_TYPE("val", [
        "Readable",
        "Iterable",
        "AsyncIterable"
    ], val);
}
async function* fromReadable(val) {
    yield* createReadableStreamAsyncIterator(val);
}
async function pump(iterable, writable, finish3) {
    let error2;
    try {
        for await (const chunk of iterable){
            if (!writable.write(chunk)) {
                if (writable.destroyed) return;
                await once1(writable, "drain");
            }
        }
        writable.end();
    } catch (err) {
        error2 = err;
    } finally{
        finish3(error2);
    }
}
function pipeline(...args2) {
    const callback = once(popCallback(args2));
    let streams;
    if (args2.length > 1) {
        streams = args2;
    } else {
        throw new ERR_MISSING_ARGS("streams");
    }
    let error2;
    let value7;
    const destroys = [];
    let finishCount = 0;
    function finish3(err) {
        const __final = (--finishCount) === 0;
        if (err && (!error2 || error2.code === "ERR_STREAM_PREMATURE_CLOSE")) {
            error2 = err;
        }
        if (!error2 && !__final) {
            return;
        }
        while(destroys.length){
            destroys.shift()(error2);
        }
        if (__final) {
            callback(error2, value7);
        }
    }
    let ret1;
    for(let i2 = 0; i2 < streams.length; i2++){
        const stream3 = streams[i2];
        const reading = i2 < streams.length - 1;
        const writing = i2 > 0;
        if (isStream(stream3)) {
            finishCount++;
            destroys.push(destroyer1(stream3, reading, writing, finish3));
        }
        if (i2 === 0) {
            if (typeof stream3 === "function") {
                ret1 = stream3();
                if (!isIterable(ret1)) {
                    throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or Stream", "source", ret1);
                }
            } else if (isIterable(stream3) || isReadable1(stream3)) {
                ret1 = stream3;
            } else {
                throw new ERR_INVALID_ARG_TYPE("source", [
                    "Stream",
                    "Iterable",
                    "AsyncIterable",
                    "Function"
                ], stream3);
            }
        } else if (typeof stream3 === "function") {
            ret1 = makeAsyncIterable(ret1);
            ret1 = stream3(ret1);
            if (reading) {
                if (!isIterable(ret1, true)) {
                    throw new ERR_INVALID_RETURN_VALUE("AsyncIterable", `transform[${i2 - 1}]`, ret1);
                }
            } else {
                const pt = new PassThrough({
                    objectMode: true
                });
                if (ret1 instanceof Promise) {
                    ret1.then((val)=>{
                        value7 = val;
                        pt.end(val);
                    }, (err)=>{
                        pt.destroy(err);
                    });
                } else if (isIterable(ret1, true)) {
                    finishCount++;
                    pump(ret1, pt, finish3);
                } else {
                    throw new ERR_INVALID_RETURN_VALUE("AsyncIterable or Promise", "destination", ret1);
                }
                ret1 = pt;
                finishCount++;
                destroys.push(destroyer1(ret1, false, true, finish3));
            }
        } else if (isStream(stream3)) {
            if (isReadable1(ret1)) {
                ret1.pipe(stream3);
            } else {
                ret1 = makeAsyncIterable(ret1);
                finishCount++;
                pump(ret1, stream3, finish3);
            }
            ret1 = stream3;
        } else {
            const name13 = reading ? `transform[${i2 - 1}]` : "destination";
            throw new ERR_INVALID_ARG_TYPE(name13, [
                "Stream",
                "Function"
            ], ret1);
        }
    }
    return ret1;
}
function pipeline1(...streams) {
    return new Promise((resolve3, reject)=>{
        pipeline(...streams, (err, value7)=>{
            if (err) {
                reject(err);
            } else {
                resolve3(value7);
            }
        });
    });
}
function finished(stream3, opts) {
    return new Promise((resolve3, reject)=>{
        eos(stream3, opts || null, (err)=>{
            if (err) {
                reject(err);
            } else {
                resolve3();
            }
        });
    });
}
const mod4 = function() {
    return {
        pipeline: pipeline1,
        finished: finished
    };
}();
Stream1.Readable = Readable;
Stream1.Writable = Writable;
Stream1.Duplex = Duplex;
Stream1.Transform = Transform;
Stream1.PassThrough = PassThrough;
Stream1.pipeline = pipeline;
Stream1.finished = eos;
Stream1.promises = mod4;
Stream1.Stream = Stream1;
class Hash1 extends Transform {
    hash;
    constructor(algorithm1, _opts){
        super({
            transform (chunk, _encoding, callback) {
                hash1.update(chunk);
                callback();
            },
            flush (callback) {
                this.push(hash1.digest());
                callback();
            }
        });
        const hash1 = this.hash = createHash(algorithm1);
    }
    update(data, _encoding) {
        if (typeof data === "string") {
            data = new TextEncoder().encode(data);
            this.hash.update(data);
        } else {
            this.hash.update(data);
        }
        return this;
    }
    digest(encoding) {
        const digest = this.hash.digest();
        if (encoding === undefined) {
            return Buffer1.from(digest);
        }
        switch(encoding){
            case "hex":
                {
                    return encodeToString(new Uint8Array(digest));
                }
            default:
                {
                    throw new Error(`The output encoding for hash digest is not impelemented: ${encoding}`);
                }
        }
    }
}
function createHash1(algorithm2, opts) {
    return new Hash1(algorithm2, opts);
}
function getHashes() {
    return supportedAlgorithms.slice();
}
const __default1 = {
    Hash: Hash1,
    createHash: createHash1,
    getHashes,
    pbkdf2,
    pbkdf2Sync,
    randomBytes
};
const base64abc1 = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "/"
];
function encode2(data) {
    const uint8 = typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    let result = "", i2;
    const l = uint8.length;
    for(i2 = 2; i2 < l; i2 += 3){
        result += base64abc1[uint8[i2 - 2] >> 2];
        result += base64abc1[(uint8[i2 - 2] & 3) << 4 | uint8[i2 - 1] >> 4];
        result += base64abc1[(uint8[i2 - 1] & 15) << 2 | uint8[i2] >> 6];
        result += base64abc1[uint8[i2] & 63];
    }
    if (i2 === l + 1) {
        result += base64abc1[uint8[i2 - 2] >> 2];
        result += base64abc1[(uint8[i2 - 2] & 3) << 4];
        result += "==";
    }
    if (i2 === l) {
        result += base64abc1[uint8[i2 - 2] >> 2];
        result += base64abc1[(uint8[i2 - 2] & 3) << 4 | uint8[i2 - 1] >> 4];
        result += base64abc1[(uint8[i2 - 1] & 15) << 2];
        result += "=";
    }
    return result;
}
function decode2(b64) {
    const binString = atob(b64);
    const size = binString.length;
    const bytes = new Uint8Array(size);
    for(let i2 = 0; i2 < size; i2++){
        bytes[i2] = binString.charCodeAt(i2);
    }
    return bytes;
}
function addPaddingToBase64url(base64url) {
    if (base64url.length % 4 === 2) return base64url + "==";
    if (base64url.length % 4 === 3) return base64url + "=";
    if (base64url.length % 4 === 1) {
        throw new TypeError("Illegal base64url string!");
    }
    return base64url;
}
function convertBase64urlToBase64(b64url) {
    return addPaddingToBase64url(b64url).replace(/\-/g, "+").replace(/_/g, "/");
}
function convertBase64ToBase64url(b64) {
    return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function encode3(uint8) {
    return convertBase64ToBase64url(encode2(uint8));
}
function decode3(b64url) {
    return decode2(convertBase64urlToBase64(b64url));
}
const mod5 = function() {
    return {
        addPaddingToBase64url: addPaddingToBase64url,
        encode: encode3,
        decode: decode3
    };
}();
function errInvalidByte1(__byte) {
    return new Error("encoding/hex: invalid byte: " + new TextDecoder().decode(new Uint8Array([
        __byte
    ])));
}
function errLength1() {
    return new Error("encoding/hex: odd length hex string");
}
function fromHexChar1(__byte) {
    if (48 <= __byte && __byte <= 57) return __byte - 48;
    if (97 <= __byte && __byte <= 102) return __byte - 97 + 10;
    if (65 <= __byte && __byte <= 70) return __byte - 65 + 10;
    throw errInvalidByte1(__byte);
}
function decode4(src) {
    const dst = new Uint8Array(decodedLen2(src.length));
    for(let i2 = 0; i2 < dst.length; i2++){
        const a = fromHexChar1(src[i2 * 2]);
        const b = fromHexChar1(src[i2 * 2 + 1]);
        dst[i2] = a << 4 | b;
    }
    if (src.length % 2 == 1) {
        fromHexChar1(src[dst.length * 2]);
        throw errLength1();
    }
    return dst;
}
function decodedLen2(x88) {
    return x88 >>> 1;
}
function decodeString1(s) {
    return decode4(new TextEncoder().encode(s));
}
const HEX_CHARS1 = "0123456789abcdef".split("");
const EXTRA1 = [
    -2147483648,
    8388608,
    32768,
    128
];
const SHIFT1 = [
    24,
    16,
    8,
    0
];
const K = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298, 
];
const blocks1 = [];
class Sha256 {
    #block;
    #blocks;
    #bytes;
    #finalized;
    #first;
    #h0;
    #h1;
    #h2;
    #h3;
    #h4;
    #h5;
    #h6;
    #h7;
    #hashed;
    #hBytes;
    #is224;
    #lastByteIndex = 0;
    #start;
    constructor(is2241 = false, sharedMemory3 = false){
        this.init(is2241, sharedMemory3);
    }
    init(is224, sharedMemory) {
        if (sharedMemory) {
            blocks1[0] = blocks1[16] = blocks1[1] = blocks1[2] = blocks1[3] = blocks1[4] = blocks1[5] = blocks1[6] = blocks1[7] = blocks1[8] = blocks1[9] = blocks1[10] = blocks1[11] = blocks1[12] = blocks1[13] = blocks1[14] = blocks1[15] = 0;
            this.#blocks = blocks1;
        } else {
            this.#blocks = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ];
        }
        if (is224) {
            this.#h0 = 3238371032;
            this.#h1 = 914150663;
            this.#h2 = 812702999;
            this.#h3 = 4144912697;
            this.#h4 = 4290775857;
            this.#h5 = 1750603025;
            this.#h6 = 1694076839;
            this.#h7 = 3204075428;
        } else {
            this.#h0 = 1779033703;
            this.#h1 = 3144134277;
            this.#h2 = 1013904242;
            this.#h3 = 2773480762;
            this.#h4 = 1359893119;
            this.#h5 = 2600822924;
            this.#h6 = 528734635;
            this.#h7 = 1541459225;
        }
        this.#block = this.#start = this.#bytes = this.#hBytes = 0;
        this.#finalized = this.#hashed = false;
        this.#first = true;
        this.#is224 = is224;
    }
    update(message) {
        if (this.#finalized) {
            return this;
        }
        let msg2;
        if (message instanceof ArrayBuffer) {
            msg2 = new Uint8Array(message);
        } else {
            msg2 = message;
        }
        let index = 0;
        const length = msg2.length;
        const blocks2 = this.#blocks;
        while(index < length){
            let i2;
            if (this.#hashed) {
                this.#hashed = false;
                blocks2[0] = this.#block;
                blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
            }
            if (typeof msg2 !== "string") {
                for(i2 = this.#start; index < length && i2 < 64; ++index){
                    blocks2[i2 >> 2] |= msg2[index] << SHIFT1[(i2++) & 3];
                }
            } else {
                for(i2 = this.#start; index < length && i2 < 64; ++index){
                    let code7 = msg2.charCodeAt(index);
                    if (code7 < 128) {
                        blocks2[i2 >> 2] |= code7 << SHIFT1[(i2++) & 3];
                    } else if (code7 < 2048) {
                        blocks2[i2 >> 2] |= (192 | code7 >> 6) << SHIFT1[(i2++) & 3];
                        blocks2[i2 >> 2] |= (128 | code7 & 63) << SHIFT1[(i2++) & 3];
                    } else if (code7 < 55296 || code7 >= 57344) {
                        blocks2[i2 >> 2] |= (224 | code7 >> 12) << SHIFT1[(i2++) & 3];
                        blocks2[i2 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT1[(i2++) & 3];
                        blocks2[i2 >> 2] |= (128 | code7 & 63) << SHIFT1[(i2++) & 3];
                    } else {
                        code7 = 65536 + ((code7 & 1023) << 10 | msg2.charCodeAt(++index) & 1023);
                        blocks2[i2 >> 2] |= (240 | code7 >> 18) << SHIFT1[(i2++) & 3];
                        blocks2[i2 >> 2] |= (128 | code7 >> 12 & 63) << SHIFT1[(i2++) & 3];
                        blocks2[i2 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT1[(i2++) & 3];
                        blocks2[i2 >> 2] |= (128 | code7 & 63) << SHIFT1[(i2++) & 3];
                    }
                }
            }
            this.#lastByteIndex = i2;
            this.#bytes += i2 - this.#start;
            if (i2 >= 64) {
                this.#block = blocks2[16];
                this.#start = i2 - 64;
                this.hash();
                this.#hashed = true;
            } else {
                this.#start = i2;
            }
        }
        if (this.#bytes > 4294967295) {
            this.#hBytes += this.#bytes / 4294967296 << 0;
            this.#bytes = this.#bytes % 4294967296;
        }
        return this;
    }
    finalize() {
        if (this.#finalized) {
            return;
        }
        this.#finalized = true;
        const blocks2 = this.#blocks;
        const i2 = this.#lastByteIndex;
        blocks2[16] = this.#block;
        blocks2[i2 >> 2] |= EXTRA1[i2 & 3];
        this.#block = blocks2[16];
        if (i2 >= 56) {
            if (!this.#hashed) {
                this.hash();
            }
            blocks2[0] = this.#block;
            blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
        }
        blocks2[14] = this.#hBytes << 3 | this.#bytes >>> 29;
        blocks2[15] = this.#bytes << 3;
        this.hash();
    }
    hash() {
        let a = this.#h0;
        let b = this.#h1;
        let c = this.#h2;
        let d = this.#h3;
        let e = this.#h4;
        let f = this.#h5;
        let g = this.#h6;
        let h = this.#h7;
        const blocks2 = this.#blocks;
        let s0;
        let s1;
        let maj;
        let t1;
        let t2;
        let ch;
        let ab1;
        let da;
        let cd;
        let bc;
        for(let j = 16; j < 64; ++j){
            t1 = blocks2[j - 15];
            s0 = (t1 >>> 7 | t1 << 25) ^ (t1 >>> 18 | t1 << 14) ^ t1 >>> 3;
            t1 = blocks2[j - 2];
            s1 = (t1 >>> 17 | t1 << 15) ^ (t1 >>> 19 | t1 << 13) ^ t1 >>> 10;
            blocks2[j] = blocks2[j - 16] + s0 + blocks2[j - 7] + s1 << 0;
        }
        bc = b & c;
        for(let j1 = 0; j1 < 64; j1 += 4){
            if (this.#first) {
                if (this.#is224) {
                    ab1 = 300032;
                    t1 = blocks2[0] - 1413257819;
                    h = t1 - 150054599 << 0;
                    d = t1 + 24177077 << 0;
                } else {
                    ab1 = 704751109;
                    t1 = blocks2[0] - 210244248;
                    h = t1 - 1521486534 << 0;
                    d = t1 + 143694565 << 0;
                }
                this.#first = false;
            } else {
                s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
                s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
                ab1 = a & b;
                maj = ab1 ^ a & c ^ bc;
                ch = e & f ^ ~e & g;
                t1 = h + s1 + ch + K[j1] + blocks2[j1];
                t2 = s0 + maj;
                h = d + t1 << 0;
                d = t1 + t2 << 0;
            }
            s0 = (d >>> 2 | d << 30) ^ (d >>> 13 | d << 19) ^ (d >>> 22 | d << 10);
            s1 = (h >>> 6 | h << 26) ^ (h >>> 11 | h << 21) ^ (h >>> 25 | h << 7);
            da = d & a;
            maj = da ^ d & b ^ ab1;
            ch = h & e ^ ~h & f;
            t1 = g + s1 + ch + K[j1 + 1] + blocks2[j1 + 1];
            t2 = s0 + maj;
            g = c + t1 << 0;
            c = t1 + t2 << 0;
            s0 = (c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10);
            s1 = (g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7);
            cd = c & d;
            maj = cd ^ c & a ^ da;
            ch = g & h ^ ~g & e;
            t1 = f + s1 + ch + K[j1 + 2] + blocks2[j1 + 2];
            t2 = s0 + maj;
            f = b + t1 << 0;
            b = t1 + t2 << 0;
            s0 = (b >>> 2 | b << 30) ^ (b >>> 13 | b << 19) ^ (b >>> 22 | b << 10);
            s1 = (f >>> 6 | f << 26) ^ (f >>> 11 | f << 21) ^ (f >>> 25 | f << 7);
            bc = b & c;
            maj = bc ^ b & d ^ cd;
            ch = f & g ^ ~f & h;
            t1 = e + s1 + ch + K[j1 + 3] + blocks2[j1 + 3];
            t2 = s0 + maj;
            e = a + t1 << 0;
            a = t1 + t2 << 0;
        }
        this.#h0 = this.#h0 + a << 0;
        this.#h1 = this.#h1 + b << 0;
        this.#h2 = this.#h2 + c << 0;
        this.#h3 = this.#h3 + d << 0;
        this.#h4 = this.#h4 + e << 0;
        this.#h5 = this.#h5 + f << 0;
        this.#h6 = this.#h6 + g << 0;
        this.#h7 = this.#h7 + h << 0;
    }
    hex() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        const h5 = this.#h5;
        const h6 = this.#h6;
        const h7 = this.#h7;
        let hex = HEX_CHARS1[h0 >> 28 & 15] + HEX_CHARS1[h0 >> 24 & 15] + HEX_CHARS1[h0 >> 20 & 15] + HEX_CHARS1[h0 >> 16 & 15] + HEX_CHARS1[h0 >> 12 & 15] + HEX_CHARS1[h0 >> 8 & 15] + HEX_CHARS1[h0 >> 4 & 15] + HEX_CHARS1[h0 & 15] + HEX_CHARS1[h1 >> 28 & 15] + HEX_CHARS1[h1 >> 24 & 15] + HEX_CHARS1[h1 >> 20 & 15] + HEX_CHARS1[h1 >> 16 & 15] + HEX_CHARS1[h1 >> 12 & 15] + HEX_CHARS1[h1 >> 8 & 15] + HEX_CHARS1[h1 >> 4 & 15] + HEX_CHARS1[h1 & 15] + HEX_CHARS1[h2 >> 28 & 15] + HEX_CHARS1[h2 >> 24 & 15] + HEX_CHARS1[h2 >> 20 & 15] + HEX_CHARS1[h2 >> 16 & 15] + HEX_CHARS1[h2 >> 12 & 15] + HEX_CHARS1[h2 >> 8 & 15] + HEX_CHARS1[h2 >> 4 & 15] + HEX_CHARS1[h2 & 15] + HEX_CHARS1[h3 >> 28 & 15] + HEX_CHARS1[h3 >> 24 & 15] + HEX_CHARS1[h3 >> 20 & 15] + HEX_CHARS1[h3 >> 16 & 15] + HEX_CHARS1[h3 >> 12 & 15] + HEX_CHARS1[h3 >> 8 & 15] + HEX_CHARS1[h3 >> 4 & 15] + HEX_CHARS1[h3 & 15] + HEX_CHARS1[h4 >> 28 & 15] + HEX_CHARS1[h4 >> 24 & 15] + HEX_CHARS1[h4 >> 20 & 15] + HEX_CHARS1[h4 >> 16 & 15] + HEX_CHARS1[h4 >> 12 & 15] + HEX_CHARS1[h4 >> 8 & 15] + HEX_CHARS1[h4 >> 4 & 15] + HEX_CHARS1[h4 & 15] + HEX_CHARS1[h5 >> 28 & 15] + HEX_CHARS1[h5 >> 24 & 15] + HEX_CHARS1[h5 >> 20 & 15] + HEX_CHARS1[h5 >> 16 & 15] + HEX_CHARS1[h5 >> 12 & 15] + HEX_CHARS1[h5 >> 8 & 15] + HEX_CHARS1[h5 >> 4 & 15] + HEX_CHARS1[h5 & 15] + HEX_CHARS1[h6 >> 28 & 15] + HEX_CHARS1[h6 >> 24 & 15] + HEX_CHARS1[h6 >> 20 & 15] + HEX_CHARS1[h6 >> 16 & 15] + HEX_CHARS1[h6 >> 12 & 15] + HEX_CHARS1[h6 >> 8 & 15] + HEX_CHARS1[h6 >> 4 & 15] + HEX_CHARS1[h6 & 15];
        if (!this.#is224) {
            hex += HEX_CHARS1[h7 >> 28 & 15] + HEX_CHARS1[h7 >> 24 & 15] + HEX_CHARS1[h7 >> 20 & 15] + HEX_CHARS1[h7 >> 16 & 15] + HEX_CHARS1[h7 >> 12 & 15] + HEX_CHARS1[h7 >> 8 & 15] + HEX_CHARS1[h7 >> 4 & 15] + HEX_CHARS1[h7 & 15];
        }
        return hex;
    }
    toString() {
        return this.hex();
    }
    digest() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        const h5 = this.#h5;
        const h6 = this.#h6;
        const h7 = this.#h7;
        const arr = [
            h0 >> 24 & 255,
            h0 >> 16 & 255,
            h0 >> 8 & 255,
            h0 & 255,
            h1 >> 24 & 255,
            h1 >> 16 & 255,
            h1 >> 8 & 255,
            h1 & 255,
            h2 >> 24 & 255,
            h2 >> 16 & 255,
            h2 >> 8 & 255,
            h2 & 255,
            h3 >> 24 & 255,
            h3 >> 16 & 255,
            h3 >> 8 & 255,
            h3 & 255,
            h4 >> 24 & 255,
            h4 >> 16 & 255,
            h4 >> 8 & 255,
            h4 & 255,
            h5 >> 24 & 255,
            h5 >> 16 & 255,
            h5 >> 8 & 255,
            h5 & 255,
            h6 >> 24 & 255,
            h6 >> 16 & 255,
            h6 >> 8 & 255,
            h6 & 255, 
        ];
        if (!this.#is224) {
            arr.push(h7 >> 24 & 255, h7 >> 16 & 255, h7 >> 8 & 255, h7 & 255);
        }
        return arr;
    }
    array() {
        return this.digest();
    }
    arrayBuffer() {
        this.finalize();
        const buffer = new ArrayBuffer(this.#is224 ? 28 : 32);
        const dataView = new DataView(buffer);
        dataView.setUint32(0, this.#h0);
        dataView.setUint32(4, this.#h1);
        dataView.setUint32(8, this.#h2);
        dataView.setUint32(12, this.#h3);
        dataView.setUint32(16, this.#h4);
        dataView.setUint32(20, this.#h5);
        dataView.setUint32(24, this.#h6);
        if (!this.#is224) {
            dataView.setUint32(28, this.#h7);
        }
        return buffer;
    }
}
class HmacSha256 extends Sha256 {
    #inner;
    #is224;
    #oKeyPad;
    #sharedMemory;
    constructor(secretKey1, is2242 = false, sharedMemory4 = false){
        super(is2242, sharedMemory4);
        let key2;
        if (typeof secretKey1 === "string") {
            const bytes = [];
            const length = secretKey1.length;
            let index = 0;
            for(let i2 = 0; i2 < length; ++i2){
                let code7 = secretKey1.charCodeAt(i2);
                if (code7 < 128) {
                    bytes[index++] = code7;
                } else if (code7 < 2048) {
                    bytes[index++] = 192 | code7 >> 6;
                    bytes[index++] = 128 | code7 & 63;
                } else if (code7 < 55296 || code7 >= 57344) {
                    bytes[index++] = 224 | code7 >> 12;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                } else {
                    code7 = 65536 + ((code7 & 1023) << 10 | secretKey1.charCodeAt(++i2) & 1023);
                    bytes[index++] = 240 | code7 >> 18;
                    bytes[index++] = 128 | code7 >> 12 & 63;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                }
            }
            key2 = bytes;
        } else {
            if (secretKey1 instanceof ArrayBuffer) {
                key2 = new Uint8Array(secretKey1);
            } else {
                key2 = secretKey1;
            }
        }
        if (key2.length > 64) {
            key2 = new Sha256(is2242, true).update(key2).array();
        }
        const oKeyPad1 = [];
        const iKeyPad1 = [];
        for(let i2 = 0; i2 < 64; ++i2){
            const b = key2[i2] || 0;
            oKeyPad1[i2] = 92 ^ b;
            iKeyPad1[i2] = 54 ^ b;
        }
        this.update(iKeyPad1);
        this.#oKeyPad = oKeyPad1;
        this.#inner = true;
        this.#is224 = is2242;
        this.#sharedMemory = sharedMemory4;
    }
    finalize() {
        super.finalize();
        if (this.#inner) {
            this.#inner = false;
            const innerHash = this.array();
            super.init(this.#is224, this.#sharedMemory);
            this.update(this.#oKeyPad);
            this.update(innerHash);
            super.finalize();
        }
    }
}
const HEX_CHARS2 = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f"
];
const EXTRA2 = [
    -2147483648,
    8388608,
    32768,
    128
];
const SHIFT2 = [
    24,
    16,
    8,
    0
];
const K1 = [
    1116352408,
    3609767458,
    1899447441,
    602891725,
    3049323471,
    3964484399,
    3921009573,
    2173295548,
    961987163,
    4081628472,
    1508970993,
    3053834265,
    2453635748,
    2937671579,
    2870763221,
    3664609560,
    3624381080,
    2734883394,
    310598401,
    1164996542,
    607225278,
    1323610764,
    1426881987,
    3590304994,
    1925078388,
    4068182383,
    2162078206,
    991336113,
    2614888103,
    633803317,
    3248222580,
    3479774868,
    3835390401,
    2666613458,
    4022224774,
    944711139,
    264347078,
    2341262773,
    604807628,
    2007800933,
    770255983,
    1495990901,
    1249150122,
    1856431235,
    1555081692,
    3175218132,
    1996064986,
    2198950837,
    2554220882,
    3999719339,
    2821834349,
    766784016,
    2952996808,
    2566594879,
    3210313671,
    3203337956,
    3336571891,
    1034457026,
    3584528711,
    2466948901,
    113926993,
    3758326383,
    338241895,
    168717936,
    666307205,
    1188179964,
    773529912,
    1546045734,
    1294757372,
    1522805485,
    1396182291,
    2643833823,
    1695183700,
    2343527390,
    1986661051,
    1014477480,
    2177026350,
    1206759142,
    2456956037,
    344077627,
    2730485921,
    1290863460,
    2820302411,
    3158454273,
    3259730800,
    3505952657,
    3345764771,
    106217008,
    3516065817,
    3606008344,
    3600352804,
    1432725776,
    4094571909,
    1467031594,
    275423344,
    851169720,
    430227734,
    3100823752,
    506948616,
    1363258195,
    659060556,
    3750685593,
    883997877,
    3785050280,
    958139571,
    3318307427,
    1322822218,
    3812723403,
    1537002063,
    2003034995,
    1747873779,
    3602036899,
    1955562222,
    1575990012,
    2024104815,
    1125592928,
    2227730452,
    2716904306,
    2361852424,
    442776044,
    2428436474,
    593698344,
    2756734187,
    3733110249,
    3204031479,
    2999351573,
    3329325298,
    3815920427,
    3391569614,
    3928383900,
    3515267271,
    566280711,
    3940187606,
    3454069534,
    4118630271,
    4000239992,
    116418474,
    1914138554,
    174292421,
    2731055270,
    289380356,
    3203993006,
    460393269,
    320620315,
    685471733,
    587496836,
    852142971,
    1086792851,
    1017036298,
    365543100,
    1126000580,
    2618297676,
    1288033470,
    3409855158,
    1501505948,
    4234509866,
    1607167915,
    987167468,
    1816402316,
    1246189591
];
const blocks2 = [];
class Sha512 {
    #blocks;
    #block;
    #bits;
    #start;
    #bytes;
    #hBytes;
    #lastByteIndex = 0;
    #finalized;
    #hashed;
    #h0h;
    #h0l;
    #h1h;
    #h1l;
    #h2h;
    #h2l;
    #h3h;
    #h3l;
    #h4h;
    #h4l;
    #h5h;
    #h5l;
    #h6h;
    #h6l;
    #h7h;
    #h7l;
    constructor(bits1 = 512, sharedMemory5 = false){
        this.init(bits1, sharedMemory5);
    }
    init(bits, sharedMemory) {
        if (sharedMemory) {
            blocks2[0] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = blocks2[16] = blocks2[17] = blocks2[18] = blocks2[19] = blocks2[20] = blocks2[21] = blocks2[22] = blocks2[23] = blocks2[24] = blocks2[25] = blocks2[26] = blocks2[27] = blocks2[28] = blocks2[29] = blocks2[30] = blocks2[31] = blocks2[32] = 0;
            this.#blocks = blocks2;
        } else {
            this.#blocks = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ];
        }
        if (bits === 224) {
            this.#h0h = 2352822216;
            this.#h0l = 424955298;
            this.#h1h = 1944164710;
            this.#h1l = 2312950998;
            this.#h2h = 502970286;
            this.#h2l = 855612546;
            this.#h3h = 1738396948;
            this.#h3l = 1479516111;
            this.#h4h = 258812777;
            this.#h4l = 2077511080;
            this.#h5h = 2011393907;
            this.#h5l = 79989058;
            this.#h6h = 1067287976;
            this.#h6l = 1780299464;
            this.#h7h = 286451373;
            this.#h7l = 2446758561;
        } else if (bits === 256) {
            this.#h0h = 573645204;
            this.#h0l = 4230739756;
            this.#h1h = 2673172387;
            this.#h1l = 3360449730;
            this.#h2h = 596883563;
            this.#h2l = 1867755857;
            this.#h3h = 2520282905;
            this.#h3l = 1497426621;
            this.#h4h = 2519219938;
            this.#h4l = 2827943907;
            this.#h5h = 3193839141;
            this.#h5l = 1401305490;
            this.#h6h = 721525244;
            this.#h6l = 746961066;
            this.#h7h = 246885852;
            this.#h7l = 2177182882;
        } else if (bits === 384) {
            this.#h0h = 3418070365;
            this.#h0l = 3238371032;
            this.#h1h = 1654270250;
            this.#h1l = 914150663;
            this.#h2h = 2438529370;
            this.#h2l = 812702999;
            this.#h3h = 355462360;
            this.#h3l = 4144912697;
            this.#h4h = 1731405415;
            this.#h4l = 4290775857;
            this.#h5h = 2394180231;
            this.#h5l = 1750603025;
            this.#h6h = 3675008525;
            this.#h6l = 1694076839;
            this.#h7h = 1203062813;
            this.#h7l = 3204075428;
        } else {
            this.#h0h = 1779033703;
            this.#h0l = 4089235720;
            this.#h1h = 3144134277;
            this.#h1l = 2227873595;
            this.#h2h = 1013904242;
            this.#h2l = 4271175723;
            this.#h3h = 2773480762;
            this.#h3l = 1595750129;
            this.#h4h = 1359893119;
            this.#h4l = 2917565137;
            this.#h5h = 2600822924;
            this.#h5l = 725511199;
            this.#h6h = 528734635;
            this.#h6l = 4215389547;
            this.#h7h = 1541459225;
            this.#h7l = 327033209;
        }
        this.#bits = bits;
        this.#block = this.#start = this.#bytes = this.#hBytes = 0;
        this.#finalized = this.#hashed = false;
    }
    update(message) {
        if (this.#finalized) {
            return this;
        }
        let msg2;
        if (message instanceof ArrayBuffer) {
            msg2 = new Uint8Array(message);
        } else {
            msg2 = message;
        }
        const length = msg2.length;
        const blocks3 = this.#blocks;
        let index = 0;
        while(index < length){
            let i3;
            if (this.#hashed) {
                this.#hashed = false;
                blocks3[0] = this.#block;
                blocks3[1] = blocks3[2] = blocks3[3] = blocks3[4] = blocks3[5] = blocks3[6] = blocks3[7] = blocks3[8] = blocks3[9] = blocks3[10] = blocks3[11] = blocks3[12] = blocks3[13] = blocks3[14] = blocks3[15] = blocks3[16] = blocks3[17] = blocks3[18] = blocks3[19] = blocks3[20] = blocks3[21] = blocks3[22] = blocks3[23] = blocks3[24] = blocks3[25] = blocks3[26] = blocks3[27] = blocks3[28] = blocks3[29] = blocks3[30] = blocks3[31] = blocks3[32] = 0;
            }
            if (typeof msg2 !== "string") {
                for(i3 = this.#start; index < length && i3 < 128; ++index){
                    blocks3[i3 >> 2] |= msg2[index] << SHIFT2[(i3++) & 3];
                }
            } else {
                for(i3 = this.#start; index < length && i3 < 128; ++index){
                    let code7 = msg2.charCodeAt(index);
                    if (code7 < 128) {
                        blocks3[i3 >> 2] |= code7 << SHIFT2[(i3++) & 3];
                    } else if (code7 < 2048) {
                        blocks3[i3 >> 2] |= (192 | code7 >> 6) << SHIFT2[(i3++) & 3];
                        blocks3[i3 >> 2] |= (128 | code7 & 63) << SHIFT2[(i3++) & 3];
                    } else if (code7 < 55296 || code7 >= 57344) {
                        blocks3[i3 >> 2] |= (224 | code7 >> 12) << SHIFT2[(i3++) & 3];
                        blocks3[i3 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT2[(i3++) & 3];
                        blocks3[i3 >> 2] |= (128 | code7 & 63) << SHIFT2[(i3++) & 3];
                    } else {
                        code7 = 65536 + ((code7 & 1023) << 10 | msg2.charCodeAt(++index) & 1023);
                        blocks3[i3 >> 2] |= (240 | code7 >> 18) << SHIFT2[(i3++) & 3];
                        blocks3[i3 >> 2] |= (128 | code7 >> 12 & 63) << SHIFT2[(i3++) & 3];
                        blocks3[i3 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT2[(i3++) & 3];
                        blocks3[i3 >> 2] |= (128 | code7 & 63) << SHIFT2[(i3++) & 3];
                    }
                }
            }
            this.#lastByteIndex = i3;
            this.#bytes += i3 - this.#start;
            if (i3 >= 128) {
                this.#block = blocks3[32];
                this.#start = i3 - 128;
                this.hash();
                this.#hashed = true;
            } else {
                this.#start = i3;
            }
        }
        if (this.#bytes > 4294967295) {
            this.#hBytes += this.#bytes / 4294967296 << 0;
            this.#bytes = this.#bytes % 4294967296;
        }
        return this;
    }
    finalize() {
        if (this.#finalized) {
            return;
        }
        this.#finalized = true;
        const blocks3 = this.#blocks;
        const i3 = this.#lastByteIndex;
        blocks3[32] = this.#block;
        blocks3[i3 >> 2] |= EXTRA2[i3 & 3];
        this.#block = blocks3[32];
        if (i3 >= 112) {
            if (!this.#hashed) {
                this.hash();
            }
            blocks3[0] = this.#block;
            blocks3[1] = blocks3[2] = blocks3[3] = blocks3[4] = blocks3[5] = blocks3[6] = blocks3[7] = blocks3[8] = blocks3[9] = blocks3[10] = blocks3[11] = blocks3[12] = blocks3[13] = blocks3[14] = blocks3[15] = blocks3[16] = blocks3[17] = blocks3[18] = blocks3[19] = blocks3[20] = blocks3[21] = blocks3[22] = blocks3[23] = blocks3[24] = blocks3[25] = blocks3[26] = blocks3[27] = blocks3[28] = blocks3[29] = blocks3[30] = blocks3[31] = blocks3[32] = 0;
        }
        blocks3[30] = this.#hBytes << 3 | this.#bytes >>> 29;
        blocks3[31] = this.#bytes << 3;
        this.hash();
    }
    hash() {
        const h0h = this.#h0h, h0l = this.#h0l, h1h = this.#h1h, h1l = this.#h1l, h2h = this.#h2h, h2l = this.#h2l, h3h = this.#h3h, h3l = this.#h3l, h4h = this.#h4h, h4l = this.#h4l, h5h = this.#h5h, h5l = this.#h5l, h6h = this.#h6h, h6l = this.#h6l, h7h = this.#h7h, h7l = this.#h7l;
        let s0h, s0l, s1h, s1l, c1, c2, c3, c4, abh, abl, dah, dal, cdh, cdl, bch, bcl, majh, majl, t1h, t1l, t2h, t2l, chh, chl;
        const blocks3 = this.#blocks;
        for(let j = 32; j < 160; j += 2){
            t1h = blocks3[j - 30];
            t1l = blocks3[j - 29];
            s0h = (t1h >>> 1 | t1l << 31) ^ (t1h >>> 8 | t1l << 24) ^ t1h >>> 7;
            s0l = (t1l >>> 1 | t1h << 31) ^ (t1l >>> 8 | t1h << 24) ^ (t1l >>> 7 | t1h << 25);
            t1h = blocks3[j - 4];
            t1l = blocks3[j - 3];
            s1h = (t1h >>> 19 | t1l << 13) ^ (t1l >>> 29 | t1h << 3) ^ t1h >>> 6;
            s1l = (t1l >>> 19 | t1h << 13) ^ (t1h >>> 29 | t1l << 3) ^ (t1l >>> 6 | t1h << 26);
            t1h = blocks3[j - 32];
            t1l = blocks3[j - 31];
            t2h = blocks3[j - 14];
            t2l = blocks3[j - 13];
            c1 = (t2l & 65535) + (t1l & 65535) + (s0l & 65535) + (s1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (s0l >>> 16) + (s1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (s0h & 65535) + (s1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (s0h >>> 16) + (s1h >>> 16) + (c3 >>> 16);
            blocks3[j] = c4 << 16 | c3 & 65535;
            blocks3[j + 1] = c2 << 16 | c1 & 65535;
        }
        let ah = h0h, al = h0l, bh = h1h, bl = h1l, ch = h2h, cl = h2l, dh = h3h, dl = h3l, eh = h4h, el = h4l, fh = h5h, fl = h5l, gh = h6h, gl = h6l, hh = h7h, hl = h7l;
        bch = bh & ch;
        bcl = bl & cl;
        for(let j1 = 0; j1 < 160; j1 += 8){
            s0h = (ah >>> 28 | al << 4) ^ (al >>> 2 | ah << 30) ^ (al >>> 7 | ah << 25);
            s0l = (al >>> 28 | ah << 4) ^ (ah >>> 2 | al << 30) ^ (ah >>> 7 | al << 25);
            s1h = (eh >>> 14 | el << 18) ^ (eh >>> 18 | el << 14) ^ (el >>> 9 | eh << 23);
            s1l = (el >>> 14 | eh << 18) ^ (el >>> 18 | eh << 14) ^ (eh >>> 9 | el << 23);
            abh = ah & bh;
            abl = al & bl;
            majh = abh ^ ah & ch ^ bch;
            majl = abl ^ al & cl ^ bcl;
            chh = eh & fh ^ ~eh & gh;
            chl = el & fl ^ ~el & gl;
            t1h = blocks3[j1];
            t1l = blocks3[j1 + 1];
            t2h = K1[j1];
            t2l = K1[j1 + 1];
            c1 = (t2l & 65535) + (t1l & 65535) + (chl & 65535) + (s1l & 65535) + (hl & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (hl >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (chh & 65535) + (s1h & 65535) + (hh & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (hh >>> 16) + (c3 >>> 16);
            t1h = c4 << 16 | c3 & 65535;
            t1l = c2 << 16 | c1 & 65535;
            c1 = (majl & 65535) + (s0l & 65535);
            c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
            c3 = (majh & 65535) + (s0h & 65535) + (c2 >>> 16);
            c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);
            t2h = c4 << 16 | c3 & 65535;
            t2l = c2 << 16 | c1 & 65535;
            c1 = (dl & 65535) + (t1l & 65535);
            c2 = (dl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (dh & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (dh >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            hh = c4 << 16 | c3 & 65535;
            hl = c2 << 16 | c1 & 65535;
            c1 = (t2l & 65535) + (t1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            dh = c4 << 16 | c3 & 65535;
            dl = c2 << 16 | c1 & 65535;
            s0h = (dh >>> 28 | dl << 4) ^ (dl >>> 2 | dh << 30) ^ (dl >>> 7 | dh << 25);
            s0l = (dl >>> 28 | dh << 4) ^ (dh >>> 2 | dl << 30) ^ (dh >>> 7 | dl << 25);
            s1h = (hh >>> 14 | hl << 18) ^ (hh >>> 18 | hl << 14) ^ (hl >>> 9 | hh << 23);
            s1l = (hl >>> 14 | hh << 18) ^ (hl >>> 18 | hh << 14) ^ (hh >>> 9 | hl << 23);
            dah = dh & ah;
            dal = dl & al;
            majh = dah ^ dh & bh ^ abh;
            majl = dal ^ dl & bl ^ abl;
            chh = hh & eh ^ ~hh & fh;
            chl = hl & el ^ ~hl & fl;
            t1h = blocks3[j1 + 2];
            t1l = blocks3[j1 + 3];
            t2h = K1[j1 + 2];
            t2l = K1[j1 + 3];
            c1 = (t2l & 65535) + (t1l & 65535) + (chl & 65535) + (s1l & 65535) + (gl & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (gl >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (chh & 65535) + (s1h & 65535) + (gh & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (gh >>> 16) + (c3 >>> 16);
            t1h = c4 << 16 | c3 & 65535;
            t1l = c2 << 16 | c1 & 65535;
            c1 = (majl & 65535) + (s0l & 65535);
            c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
            c3 = (majh & 65535) + (s0h & 65535) + (c2 >>> 16);
            c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);
            t2h = c4 << 16 | c3 & 65535;
            t2l = c2 << 16 | c1 & 65535;
            c1 = (cl & 65535) + (t1l & 65535);
            c2 = (cl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (ch & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (ch >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            gh = c4 << 16 | c3 & 65535;
            gl = c2 << 16 | c1 & 65535;
            c1 = (t2l & 65535) + (t1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            ch = c4 << 16 | c3 & 65535;
            cl = c2 << 16 | c1 & 65535;
            s0h = (ch >>> 28 | cl << 4) ^ (cl >>> 2 | ch << 30) ^ (cl >>> 7 | ch << 25);
            s0l = (cl >>> 28 | ch << 4) ^ (ch >>> 2 | cl << 30) ^ (ch >>> 7 | cl << 25);
            s1h = (gh >>> 14 | gl << 18) ^ (gh >>> 18 | gl << 14) ^ (gl >>> 9 | gh << 23);
            s1l = (gl >>> 14 | gh << 18) ^ (gl >>> 18 | gh << 14) ^ (gh >>> 9 | gl << 23);
            cdh = ch & dh;
            cdl = cl & dl;
            majh = cdh ^ ch & ah ^ dah;
            majl = cdl ^ cl & al ^ dal;
            chh = gh & hh ^ ~gh & eh;
            chl = gl & hl ^ ~gl & el;
            t1h = blocks3[j1 + 4];
            t1l = blocks3[j1 + 5];
            t2h = K1[j1 + 4];
            t2l = K1[j1 + 5];
            c1 = (t2l & 65535) + (t1l & 65535) + (chl & 65535) + (s1l & 65535) + (fl & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (fl >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (chh & 65535) + (s1h & 65535) + (fh & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (fh >>> 16) + (c3 >>> 16);
            t1h = c4 << 16 | c3 & 65535;
            t1l = c2 << 16 | c1 & 65535;
            c1 = (majl & 65535) + (s0l & 65535);
            c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
            c3 = (majh & 65535) + (s0h & 65535) + (c2 >>> 16);
            c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);
            t2h = c4 << 16 | c3 & 65535;
            t2l = c2 << 16 | c1 & 65535;
            c1 = (bl & 65535) + (t1l & 65535);
            c2 = (bl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (bh & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (bh >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            fh = c4 << 16 | c3 & 65535;
            fl = c2 << 16 | c1 & 65535;
            c1 = (t2l & 65535) + (t1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            bh = c4 << 16 | c3 & 65535;
            bl = c2 << 16 | c1 & 65535;
            s0h = (bh >>> 28 | bl << 4) ^ (bl >>> 2 | bh << 30) ^ (bl >>> 7 | bh << 25);
            s0l = (bl >>> 28 | bh << 4) ^ (bh >>> 2 | bl << 30) ^ (bh >>> 7 | bl << 25);
            s1h = (fh >>> 14 | fl << 18) ^ (fh >>> 18 | fl << 14) ^ (fl >>> 9 | fh << 23);
            s1l = (fl >>> 14 | fh << 18) ^ (fl >>> 18 | fh << 14) ^ (fh >>> 9 | fl << 23);
            bch = bh & ch;
            bcl = bl & cl;
            majh = bch ^ bh & dh ^ cdh;
            majl = bcl ^ bl & dl ^ cdl;
            chh = fh & gh ^ ~fh & hh;
            chl = fl & gl ^ ~fl & hl;
            t1h = blocks3[j1 + 6];
            t1l = blocks3[j1 + 7];
            t2h = K1[j1 + 6];
            t2l = K1[j1 + 7];
            c1 = (t2l & 65535) + (t1l & 65535) + (chl & 65535) + (s1l & 65535) + (el & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (el >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (chh & 65535) + (s1h & 65535) + (eh & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (eh >>> 16) + (c3 >>> 16);
            t1h = c4 << 16 | c3 & 65535;
            t1l = c2 << 16 | c1 & 65535;
            c1 = (majl & 65535) + (s0l & 65535);
            c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
            c3 = (majh & 65535) + (s0h & 65535) + (c2 >>> 16);
            c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);
            t2h = c4 << 16 | c3 & 65535;
            t2l = c2 << 16 | c1 & 65535;
            c1 = (al & 65535) + (t1l & 65535);
            c2 = (al >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (ah & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (ah >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            eh = c4 << 16 | c3 & 65535;
            el = c2 << 16 | c1 & 65535;
            c1 = (t2l & 65535) + (t1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            ah = c4 << 16 | c3 & 65535;
            al = c2 << 16 | c1 & 65535;
        }
        c1 = (h0l & 65535) + (al & 65535);
        c2 = (h0l >>> 16) + (al >>> 16) + (c1 >>> 16);
        c3 = (h0h & 65535) + (ah & 65535) + (c2 >>> 16);
        c4 = (h0h >>> 16) + (ah >>> 16) + (c3 >>> 16);
        this.#h0h = c4 << 16 | c3 & 65535;
        this.#h0l = c2 << 16 | c1 & 65535;
        c1 = (h1l & 65535) + (bl & 65535);
        c2 = (h1l >>> 16) + (bl >>> 16) + (c1 >>> 16);
        c3 = (h1h & 65535) + (bh & 65535) + (c2 >>> 16);
        c4 = (h1h >>> 16) + (bh >>> 16) + (c3 >>> 16);
        this.#h1h = c4 << 16 | c3 & 65535;
        this.#h1l = c2 << 16 | c1 & 65535;
        c1 = (h2l & 65535) + (cl & 65535);
        c2 = (h2l >>> 16) + (cl >>> 16) + (c1 >>> 16);
        c3 = (h2h & 65535) + (ch & 65535) + (c2 >>> 16);
        c4 = (h2h >>> 16) + (ch >>> 16) + (c3 >>> 16);
        this.#h2h = c4 << 16 | c3 & 65535;
        this.#h2l = c2 << 16 | c1 & 65535;
        c1 = (h3l & 65535) + (dl & 65535);
        c2 = (h3l >>> 16) + (dl >>> 16) + (c1 >>> 16);
        c3 = (h3h & 65535) + (dh & 65535) + (c2 >>> 16);
        c4 = (h3h >>> 16) + (dh >>> 16) + (c3 >>> 16);
        this.#h3h = c4 << 16 | c3 & 65535;
        this.#h3l = c2 << 16 | c1 & 65535;
        c1 = (h4l & 65535) + (el & 65535);
        c2 = (h4l >>> 16) + (el >>> 16) + (c1 >>> 16);
        c3 = (h4h & 65535) + (eh & 65535) + (c2 >>> 16);
        c4 = (h4h >>> 16) + (eh >>> 16) + (c3 >>> 16);
        this.#h4h = c4 << 16 | c3 & 65535;
        this.#h4l = c2 << 16 | c1 & 65535;
        c1 = (h5l & 65535) + (fl & 65535);
        c2 = (h5l >>> 16) + (fl >>> 16) + (c1 >>> 16);
        c3 = (h5h & 65535) + (fh & 65535) + (c2 >>> 16);
        c4 = (h5h >>> 16) + (fh >>> 16) + (c3 >>> 16);
        this.#h5h = c4 << 16 | c3 & 65535;
        this.#h5l = c2 << 16 | c1 & 65535;
        c1 = (h6l & 65535) + (gl & 65535);
        c2 = (h6l >>> 16) + (gl >>> 16) + (c1 >>> 16);
        c3 = (h6h & 65535) + (gh & 65535) + (c2 >>> 16);
        c4 = (h6h >>> 16) + (gh >>> 16) + (c3 >>> 16);
        this.#h6h = c4 << 16 | c3 & 65535;
        this.#h6l = c2 << 16 | c1 & 65535;
        c1 = (h7l & 65535) + (hl & 65535);
        c2 = (h7l >>> 16) + (hl >>> 16) + (c1 >>> 16);
        c3 = (h7h & 65535) + (hh & 65535) + (c2 >>> 16);
        c4 = (h7h >>> 16) + (hh >>> 16) + (c3 >>> 16);
        this.#h7h = c4 << 16 | c3 & 65535;
        this.#h7l = c2 << 16 | c1 & 65535;
    }
    hex() {
        this.finalize();
        const h0h = this.#h0h, h0l = this.#h0l, h1h = this.#h1h, h1l = this.#h1l, h2h = this.#h2h, h2l = this.#h2l, h3h = this.#h3h, h3l = this.#h3l, h4h = this.#h4h, h4l = this.#h4l, h5h = this.#h5h, h5l = this.#h5l, h6h = this.#h6h, h6l = this.#h6l, h7h = this.#h7h, h7l = this.#h7l, bits2 = this.#bits;
        let hex = HEX_CHARS2[h0h >> 28 & 15] + HEX_CHARS2[h0h >> 24 & 15] + HEX_CHARS2[h0h >> 20 & 15] + HEX_CHARS2[h0h >> 16 & 15] + HEX_CHARS2[h0h >> 12 & 15] + HEX_CHARS2[h0h >> 8 & 15] + HEX_CHARS2[h0h >> 4 & 15] + HEX_CHARS2[h0h & 15] + HEX_CHARS2[h0l >> 28 & 15] + HEX_CHARS2[h0l >> 24 & 15] + HEX_CHARS2[h0l >> 20 & 15] + HEX_CHARS2[h0l >> 16 & 15] + HEX_CHARS2[h0l >> 12 & 15] + HEX_CHARS2[h0l >> 8 & 15] + HEX_CHARS2[h0l >> 4 & 15] + HEX_CHARS2[h0l & 15] + HEX_CHARS2[h1h >> 28 & 15] + HEX_CHARS2[h1h >> 24 & 15] + HEX_CHARS2[h1h >> 20 & 15] + HEX_CHARS2[h1h >> 16 & 15] + HEX_CHARS2[h1h >> 12 & 15] + HEX_CHARS2[h1h >> 8 & 15] + HEX_CHARS2[h1h >> 4 & 15] + HEX_CHARS2[h1h & 15] + HEX_CHARS2[h1l >> 28 & 15] + HEX_CHARS2[h1l >> 24 & 15] + HEX_CHARS2[h1l >> 20 & 15] + HEX_CHARS2[h1l >> 16 & 15] + HEX_CHARS2[h1l >> 12 & 15] + HEX_CHARS2[h1l >> 8 & 15] + HEX_CHARS2[h1l >> 4 & 15] + HEX_CHARS2[h1l & 15] + HEX_CHARS2[h2h >> 28 & 15] + HEX_CHARS2[h2h >> 24 & 15] + HEX_CHARS2[h2h >> 20 & 15] + HEX_CHARS2[h2h >> 16 & 15] + HEX_CHARS2[h2h >> 12 & 15] + HEX_CHARS2[h2h >> 8 & 15] + HEX_CHARS2[h2h >> 4 & 15] + HEX_CHARS2[h2h & 15] + HEX_CHARS2[h2l >> 28 & 15] + HEX_CHARS2[h2l >> 24 & 15] + HEX_CHARS2[h2l >> 20 & 15] + HEX_CHARS2[h2l >> 16 & 15] + HEX_CHARS2[h2l >> 12 & 15] + HEX_CHARS2[h2l >> 8 & 15] + HEX_CHARS2[h2l >> 4 & 15] + HEX_CHARS2[h2l & 15] + HEX_CHARS2[h3h >> 28 & 15] + HEX_CHARS2[h3h >> 24 & 15] + HEX_CHARS2[h3h >> 20 & 15] + HEX_CHARS2[h3h >> 16 & 15] + HEX_CHARS2[h3h >> 12 & 15] + HEX_CHARS2[h3h >> 8 & 15] + HEX_CHARS2[h3h >> 4 & 15] + HEX_CHARS2[h3h & 15];
        if (bits2 >= 256) {
            hex += HEX_CHARS2[h3l >> 28 & 15] + HEX_CHARS2[h3l >> 24 & 15] + HEX_CHARS2[h3l >> 20 & 15] + HEX_CHARS2[h3l >> 16 & 15] + HEX_CHARS2[h3l >> 12 & 15] + HEX_CHARS2[h3l >> 8 & 15] + HEX_CHARS2[h3l >> 4 & 15] + HEX_CHARS2[h3l & 15];
        }
        if (bits2 >= 384) {
            hex += HEX_CHARS2[h4h >> 28 & 15] + HEX_CHARS2[h4h >> 24 & 15] + HEX_CHARS2[h4h >> 20 & 15] + HEX_CHARS2[h4h >> 16 & 15] + HEX_CHARS2[h4h >> 12 & 15] + HEX_CHARS2[h4h >> 8 & 15] + HEX_CHARS2[h4h >> 4 & 15] + HEX_CHARS2[h4h & 15] + HEX_CHARS2[h4l >> 28 & 15] + HEX_CHARS2[h4l >> 24 & 15] + HEX_CHARS2[h4l >> 20 & 15] + HEX_CHARS2[h4l >> 16 & 15] + HEX_CHARS2[h4l >> 12 & 15] + HEX_CHARS2[h4l >> 8 & 15] + HEX_CHARS2[h4l >> 4 & 15] + HEX_CHARS2[h4l & 15] + HEX_CHARS2[h5h >> 28 & 15] + HEX_CHARS2[h5h >> 24 & 15] + HEX_CHARS2[h5h >> 20 & 15] + HEX_CHARS2[h5h >> 16 & 15] + HEX_CHARS2[h5h >> 12 & 15] + HEX_CHARS2[h5h >> 8 & 15] + HEX_CHARS2[h5h >> 4 & 15] + HEX_CHARS2[h5h & 15] + HEX_CHARS2[h5l >> 28 & 15] + HEX_CHARS2[h5l >> 24 & 15] + HEX_CHARS2[h5l >> 20 & 15] + HEX_CHARS2[h5l >> 16 & 15] + HEX_CHARS2[h5l >> 12 & 15] + HEX_CHARS2[h5l >> 8 & 15] + HEX_CHARS2[h5l >> 4 & 15] + HEX_CHARS2[h5l & 15];
        }
        if (bits2 === 512) {
            hex += HEX_CHARS2[h6h >> 28 & 15] + HEX_CHARS2[h6h >> 24 & 15] + HEX_CHARS2[h6h >> 20 & 15] + HEX_CHARS2[h6h >> 16 & 15] + HEX_CHARS2[h6h >> 12 & 15] + HEX_CHARS2[h6h >> 8 & 15] + HEX_CHARS2[h6h >> 4 & 15] + HEX_CHARS2[h6h & 15] + HEX_CHARS2[h6l >> 28 & 15] + HEX_CHARS2[h6l >> 24 & 15] + HEX_CHARS2[h6l >> 20 & 15] + HEX_CHARS2[h6l >> 16 & 15] + HEX_CHARS2[h6l >> 12 & 15] + HEX_CHARS2[h6l >> 8 & 15] + HEX_CHARS2[h6l >> 4 & 15] + HEX_CHARS2[h6l & 15] + HEX_CHARS2[h7h >> 28 & 15] + HEX_CHARS2[h7h >> 24 & 15] + HEX_CHARS2[h7h >> 20 & 15] + HEX_CHARS2[h7h >> 16 & 15] + HEX_CHARS2[h7h >> 12 & 15] + HEX_CHARS2[h7h >> 8 & 15] + HEX_CHARS2[h7h >> 4 & 15] + HEX_CHARS2[h7h & 15] + HEX_CHARS2[h7l >> 28 & 15] + HEX_CHARS2[h7l >> 24 & 15] + HEX_CHARS2[h7l >> 20 & 15] + HEX_CHARS2[h7l >> 16 & 15] + HEX_CHARS2[h7l >> 12 & 15] + HEX_CHARS2[h7l >> 8 & 15] + HEX_CHARS2[h7l >> 4 & 15] + HEX_CHARS2[h7l & 15];
        }
        return hex;
    }
    toString() {
        return this.hex();
    }
    digest() {
        this.finalize();
        const h0h = this.#h0h, h0l = this.#h0l, h1h = this.#h1h, h1l = this.#h1l, h2h = this.#h2h, h2l = this.#h2l, h3h = this.#h3h, h3l = this.#h3l, h4h = this.#h4h, h4l = this.#h4l, h5h = this.#h5h, h5l = this.#h5l, h6h = this.#h6h, h6l = this.#h6l, h7h = this.#h7h, h7l = this.#h7l, bits2 = this.#bits;
        const arr = [
            h0h >> 24 & 255,
            h0h >> 16 & 255,
            h0h >> 8 & 255,
            h0h & 255,
            h0l >> 24 & 255,
            h0l >> 16 & 255,
            h0l >> 8 & 255,
            h0l & 255,
            h1h >> 24 & 255,
            h1h >> 16 & 255,
            h1h >> 8 & 255,
            h1h & 255,
            h1l >> 24 & 255,
            h1l >> 16 & 255,
            h1l >> 8 & 255,
            h1l & 255,
            h2h >> 24 & 255,
            h2h >> 16 & 255,
            h2h >> 8 & 255,
            h2h & 255,
            h2l >> 24 & 255,
            h2l >> 16 & 255,
            h2l >> 8 & 255,
            h2l & 255,
            h3h >> 24 & 255,
            h3h >> 16 & 255,
            h3h >> 8 & 255,
            h3h & 255
        ];
        if (bits2 >= 256) {
            arr.push(h3l >> 24 & 255, h3l >> 16 & 255, h3l >> 8 & 255, h3l & 255);
        }
        if (bits2 >= 384) {
            arr.push(h4h >> 24 & 255, h4h >> 16 & 255, h4h >> 8 & 255, h4h & 255, h4l >> 24 & 255, h4l >> 16 & 255, h4l >> 8 & 255, h4l & 255, h5h >> 24 & 255, h5h >> 16 & 255, h5h >> 8 & 255, h5h & 255, h5l >> 24 & 255, h5l >> 16 & 255, h5l >> 8 & 255, h5l & 255);
        }
        if (bits2 === 512) {
            arr.push(h6h >> 24 & 255, h6h >> 16 & 255, h6h >> 8 & 255, h6h & 255, h6l >> 24 & 255, h6l >> 16 & 255, h6l >> 8 & 255, h6l & 255, h7h >> 24 & 255, h7h >> 16 & 255, h7h >> 8 & 255, h7h & 255, h7l >> 24 & 255, h7l >> 16 & 255, h7l >> 8 & 255, h7l & 255);
        }
        return arr;
    }
    array() {
        return this.digest();
    }
    arrayBuffer() {
        this.finalize();
        const bits2 = this.#bits;
        const buffer = new ArrayBuffer(bits2 / 8);
        const dataView = new DataView(buffer);
        dataView.setUint32(0, this.#h0h);
        dataView.setUint32(4, this.#h0l);
        dataView.setUint32(8, this.#h1h);
        dataView.setUint32(12, this.#h1l);
        dataView.setUint32(16, this.#h2h);
        dataView.setUint32(20, this.#h2l);
        dataView.setUint32(24, this.#h3h);
        if (bits2 >= 256) {
            dataView.setUint32(28, this.#h3l);
        }
        if (bits2 >= 384) {
            dataView.setUint32(32, this.#h4h);
            dataView.setUint32(36, this.#h4l);
            dataView.setUint32(40, this.#h5h);
            dataView.setUint32(44, this.#h5l);
        }
        if (bits2 === 512) {
            dataView.setUint32(48, this.#h6h);
            dataView.setUint32(52, this.#h6l);
            dataView.setUint32(56, this.#h7h);
            dataView.setUint32(60, this.#h7l);
        }
        return buffer;
    }
}
class HmacSha512 extends Sha512 {
    #inner;
    #bits;
    #oKeyPad;
    #sharedMemory;
    constructor(secretKey2, bits2 = 512, sharedMemory6 = false){
        super(bits2, sharedMemory6);
        let key3;
        if (secretKey2 instanceof ArrayBuffer) {
            key3 = new Uint8Array(secretKey2);
        } else if (typeof secretKey2 === "string") {
            const bytes = [];
            const length = secretKey2.length;
            let index = 0;
            let code7;
            for(let i3 = 0; i3 < length; ++i3){
                code7 = secretKey2.charCodeAt(i3);
                if (code7 < 128) {
                    bytes[index++] = code7;
                } else if (code7 < 2048) {
                    bytes[index++] = 192 | code7 >> 6;
                    bytes[index++] = 128 | code7 & 63;
                } else if (code7 < 55296 || code7 >= 57344) {
                    bytes[index++] = 224 | code7 >> 12;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                } else {
                    code7 = 65536 + ((code7 & 1023) << 10 | secretKey2.charCodeAt(++i3) & 1023);
                    bytes[index++] = 240 | code7 >> 18;
                    bytes[index++] = 128 | code7 >> 12 & 63;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                }
            }
            key3 = bytes;
        } else {
            key3 = secretKey2;
        }
        if (key3.length > 128) {
            key3 = new Sha512(bits2, true).update(key3).array();
        }
        const oKeyPad2 = [];
        const iKeyPad2 = [];
        for(let i3 = 0; i3 < 128; ++i3){
            const b = key3[i3] || 0;
            oKeyPad2[i3] = 92 ^ b;
            iKeyPad2[i3] = 54 ^ b;
        }
        this.update(iKeyPad2);
        this.#inner = true;
        this.#bits = bits2;
        this.#oKeyPad = oKeyPad2;
        this.#sharedMemory = sharedMemory6;
    }
    finalize() {
        super.finalize();
        if (this.#inner) {
            this.#inner = false;
            const innerHash = this.array();
            super.init(this.#bits, this.#sharedMemory);
            this.update(this.#oKeyPad);
            this.update(innerHash);
            super.finalize();
        }
    }
}
function big_base64(m) {
    if (m === undefined) return undefined;
    const bytes = [];
    while(m > 0n){
        bytes.push(Number(m & 255n));
        m = m >> 8n;
    }
    bytes.reverse();
    let a = btoa(String.fromCharCode.apply(null, bytes)).replace(/=/g, "");
    a = a.replace(/\+/g, "-");
    a = a.replace(/\//g, "_");
    return a;
}
function getHashFunctionName(hash1) {
    if (hash1 === "sha1") return "SHA-1";
    if (hash1 === "sha256") return "SHA-256";
    return "";
}
async function createWebCryptoKey(key4, usage, options7) {
    let jwk = {
        kty: "RSA",
        n: big_base64(key4.n),
        ext: true
    };
    if (usage === "encrypt") {
        jwk = {
            ...jwk,
            e: big_base64(key4.e)
        };
    } else if (usage === "decrypt") {
        jwk = {
            ...jwk,
            d: big_base64(key4.d),
            e: big_base64(key4.e),
            p: big_base64(key4.p),
            q: big_base64(key4.q),
            dp: big_base64(key4.dp),
            dq: big_base64(key4.dq),
            qi: big_base64(key4.qi)
        };
    }
    return await crypto.subtle.importKey("jwk", jwk, {
        name: "RSA-OAEP",
        hash: {
            name: getHashFunctionName(options7.hash)
        }
    }, false, [
        usage
    ]);
}
class WebCryptoRSA {
    key;
    options;
    encryptedKey = null;
    decryptedKey = null;
    constructor(key5, options8){
        this.key = key5;
        this.options = options8;
    }
    static isSupported(options) {
        if (!crypto.subtle) return false;
        if (options.padding !== "oaep") return false;
        return true;
    }
    static async encrypt(key, m, options) {
        return await crypto.subtle.encrypt({
            name: "RSA-OAEP"
        }, await createWebCryptoKey(key, "encrypt", options), m);
    }
    static async decrypt(key, m, options) {
        return await crypto.subtle.decrypt({
            name: "RSA-OAEP"
        }, await createWebCryptoKey(key, "decrypt", options), m);
    }
}
function power_mod(n, p, m) {
    if (p === 1n) return n;
    if (p % 2n === 0n) {
        const t = power_mod(n, p >> 1n, m);
        return t * t % m;
    } else {
        const t = power_mod(n, p >> 1n, m);
        return t * t * n % m;
    }
}
const HEX_CHARS3 = "0123456789abcdef".split("");
const EXTRA3 = [
    -2147483648,
    8388608,
    32768,
    128
];
const SHIFT3 = [
    24,
    16,
    8,
    0
];
const blocks3 = [];
class Sha11 {
    #blocks;
    #block;
    #start;
    #bytes;
    #hBytes;
    #finalized;
    #hashed;
    #h0 = 1732584193;
    #h1 = 4023233417;
    #h2 = 2562383102;
    #h3 = 271733878;
    #h4 = 3285377520;
    #lastByteIndex = 0;
    constructor(sharedMemory7 = false){
        this.init(sharedMemory7);
    }
    init(sharedMemory) {
        if (sharedMemory) {
            blocks3[0] = blocks3[16] = blocks3[1] = blocks3[2] = blocks3[3] = blocks3[4] = blocks3[5] = blocks3[6] = blocks3[7] = blocks3[8] = blocks3[9] = blocks3[10] = blocks3[11] = blocks3[12] = blocks3[13] = blocks3[14] = blocks3[15] = 0;
            this.#blocks = blocks3;
        } else {
            this.#blocks = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ];
        }
        this.#h0 = 1732584193;
        this.#h1 = 4023233417;
        this.#h2 = 2562383102;
        this.#h3 = 271733878;
        this.#h4 = 3285377520;
        this.#block = this.#start = this.#bytes = this.#hBytes = 0;
        this.#finalized = this.#hashed = false;
    }
    update(message) {
        if (this.#finalized) {
            return this;
        }
        let msg2;
        if (message instanceof ArrayBuffer) {
            msg2 = new Uint8Array(message);
        } else {
            msg2 = message;
        }
        let index = 0;
        const length = msg2.length;
        const blocks4 = this.#blocks;
        while(index < length){
            let i4;
            if (this.#hashed) {
                this.#hashed = false;
                blocks4[0] = this.#block;
                blocks4[16] = blocks4[1] = blocks4[2] = blocks4[3] = blocks4[4] = blocks4[5] = blocks4[6] = blocks4[7] = blocks4[8] = blocks4[9] = blocks4[10] = blocks4[11] = blocks4[12] = blocks4[13] = blocks4[14] = blocks4[15] = 0;
            }
            if (typeof msg2 !== "string") {
                for(i4 = this.#start; index < length && i4 < 64; ++index){
                    blocks4[i4 >> 2] |= msg2[index] << SHIFT3[(i4++) & 3];
                }
            } else {
                for(i4 = this.#start; index < length && i4 < 64; ++index){
                    let code7 = msg2.charCodeAt(index);
                    if (code7 < 128) {
                        blocks4[i4 >> 2] |= code7 << SHIFT3[(i4++) & 3];
                    } else if (code7 < 2048) {
                        blocks4[i4 >> 2] |= (192 | code7 >> 6) << SHIFT3[(i4++) & 3];
                        blocks4[i4 >> 2] |= (128 | code7 & 63) << SHIFT3[(i4++) & 3];
                    } else if (code7 < 55296 || code7 >= 57344) {
                        blocks4[i4 >> 2] |= (224 | code7 >> 12) << SHIFT3[(i4++) & 3];
                        blocks4[i4 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT3[(i4++) & 3];
                        blocks4[i4 >> 2] |= (128 | code7 & 63) << SHIFT3[(i4++) & 3];
                    } else {
                        code7 = 65536 + ((code7 & 1023) << 10 | msg2.charCodeAt(++index) & 1023);
                        blocks4[i4 >> 2] |= (240 | code7 >> 18) << SHIFT3[(i4++) & 3];
                        blocks4[i4 >> 2] |= (128 | code7 >> 12 & 63) << SHIFT3[(i4++) & 3];
                        blocks4[i4 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT3[(i4++) & 3];
                        blocks4[i4 >> 2] |= (128 | code7 & 63) << SHIFT3[(i4++) & 3];
                    }
                }
            }
            this.#lastByteIndex = i4;
            this.#bytes += i4 - this.#start;
            if (i4 >= 64) {
                this.#block = blocks4[16];
                this.#start = i4 - 64;
                this.hash();
                this.#hashed = true;
            } else {
                this.#start = i4;
            }
        }
        if (this.#bytes > 4294967295) {
            this.#hBytes += this.#bytes / 4294967296 >>> 0;
            this.#bytes = this.#bytes >>> 0;
        }
        return this;
    }
    finalize() {
        if (this.#finalized) {
            return;
        }
        this.#finalized = true;
        const blocks4 = this.#blocks;
        const i4 = this.#lastByteIndex;
        blocks4[16] = this.#block;
        blocks4[i4 >> 2] |= EXTRA3[i4 & 3];
        this.#block = blocks4[16];
        if (i4 >= 56) {
            if (!this.#hashed) {
                this.hash();
            }
            blocks4[0] = this.#block;
            blocks4[16] = blocks4[1] = blocks4[2] = blocks4[3] = blocks4[4] = blocks4[5] = blocks4[6] = blocks4[7] = blocks4[8] = blocks4[9] = blocks4[10] = blocks4[11] = blocks4[12] = blocks4[13] = blocks4[14] = blocks4[15] = 0;
        }
        blocks4[14] = this.#hBytes << 3 | this.#bytes >>> 29;
        blocks4[15] = this.#bytes << 3;
        this.hash();
    }
    hash() {
        let a = this.#h0;
        let b = this.#h1;
        let c = this.#h2;
        let d = this.#h3;
        let e = this.#h4;
        let f;
        let j;
        let t;
        const blocks4 = this.#blocks;
        for(j = 16; j < 80; ++j){
            t = blocks4[j - 3] ^ blocks4[j - 8] ^ blocks4[j - 14] ^ blocks4[j - 16];
            blocks4[j] = t << 1 | t >>> 31;
        }
        for(j = 0; j < 20; j += 5){
            f = b & c | ~b & d;
            t = a << 5 | a >>> 27;
            e = t + f + e + 1518500249 + blocks4[j] >>> 0;
            b = b << 30 | b >>> 2;
            f = a & b | ~a & c;
            t = e << 5 | e >>> 27;
            d = t + f + d + 1518500249 + blocks4[j + 1] >>> 0;
            a = a << 30 | a >>> 2;
            f = e & a | ~e & b;
            t = d << 5 | d >>> 27;
            c = t + f + c + 1518500249 + blocks4[j + 2] >>> 0;
            e = e << 30 | e >>> 2;
            f = d & e | ~d & a;
            t = c << 5 | c >>> 27;
            b = t + f + b + 1518500249 + blocks4[j + 3] >>> 0;
            d = d << 30 | d >>> 2;
            f = c & d | ~c & e;
            t = b << 5 | b >>> 27;
            a = t + f + a + 1518500249 + blocks4[j + 4] >>> 0;
            c = c << 30 | c >>> 2;
        }
        for(; j < 40; j += 5){
            f = b ^ c ^ d;
            t = a << 5 | a >>> 27;
            e = t + f + e + 1859775393 + blocks4[j] >>> 0;
            b = b << 30 | b >>> 2;
            f = a ^ b ^ c;
            t = e << 5 | e >>> 27;
            d = t + f + d + 1859775393 + blocks4[j + 1] >>> 0;
            a = a << 30 | a >>> 2;
            f = e ^ a ^ b;
            t = d << 5 | d >>> 27;
            c = t + f + c + 1859775393 + blocks4[j + 2] >>> 0;
            e = e << 30 | e >>> 2;
            f = d ^ e ^ a;
            t = c << 5 | c >>> 27;
            b = t + f + b + 1859775393 + blocks4[j + 3] >>> 0;
            d = d << 30 | d >>> 2;
            f = c ^ d ^ e;
            t = b << 5 | b >>> 27;
            a = t + f + a + 1859775393 + blocks4[j + 4] >>> 0;
            c = c << 30 | c >>> 2;
        }
        for(; j < 60; j += 5){
            f = b & c | b & d | c & d;
            t = a << 5 | a >>> 27;
            e = t + f + e - 1894007588 + blocks4[j] >>> 0;
            b = b << 30 | b >>> 2;
            f = a & b | a & c | b & c;
            t = e << 5 | e >>> 27;
            d = t + f + d - 1894007588 + blocks4[j + 1] >>> 0;
            a = a << 30 | a >>> 2;
            f = e & a | e & b | a & b;
            t = d << 5 | d >>> 27;
            c = t + f + c - 1894007588 + blocks4[j + 2] >>> 0;
            e = e << 30 | e >>> 2;
            f = d & e | d & a | e & a;
            t = c << 5 | c >>> 27;
            b = t + f + b - 1894007588 + blocks4[j + 3] >>> 0;
            d = d << 30 | d >>> 2;
            f = c & d | c & e | d & e;
            t = b << 5 | b >>> 27;
            a = t + f + a - 1894007588 + blocks4[j + 4] >>> 0;
            c = c << 30 | c >>> 2;
        }
        for(; j < 80; j += 5){
            f = b ^ c ^ d;
            t = a << 5 | a >>> 27;
            e = t + f + e - 899497514 + blocks4[j] >>> 0;
            b = b << 30 | b >>> 2;
            f = a ^ b ^ c;
            t = e << 5 | e >>> 27;
            d = t + f + d - 899497514 + blocks4[j + 1] >>> 0;
            a = a << 30 | a >>> 2;
            f = e ^ a ^ b;
            t = d << 5 | d >>> 27;
            c = t + f + c - 899497514 + blocks4[j + 2] >>> 0;
            e = e << 30 | e >>> 2;
            f = d ^ e ^ a;
            t = c << 5 | c >>> 27;
            b = t + f + b - 899497514 + blocks4[j + 3] >>> 0;
            d = d << 30 | d >>> 2;
            f = c ^ d ^ e;
            t = b << 5 | b >>> 27;
            a = t + f + a - 899497514 + blocks4[j + 4] >>> 0;
            c = c << 30 | c >>> 2;
        }
        this.#h0 = this.#h0 + a >>> 0;
        this.#h1 = this.#h1 + b >>> 0;
        this.#h2 = this.#h2 + c >>> 0;
        this.#h3 = this.#h3 + d >>> 0;
        this.#h4 = this.#h4 + e >>> 0;
    }
    hex() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        return HEX_CHARS3[h0 >> 28 & 15] + HEX_CHARS3[h0 >> 24 & 15] + HEX_CHARS3[h0 >> 20 & 15] + HEX_CHARS3[h0 >> 16 & 15] + HEX_CHARS3[h0 >> 12 & 15] + HEX_CHARS3[h0 >> 8 & 15] + HEX_CHARS3[h0 >> 4 & 15] + HEX_CHARS3[h0 & 15] + HEX_CHARS3[h1 >> 28 & 15] + HEX_CHARS3[h1 >> 24 & 15] + HEX_CHARS3[h1 >> 20 & 15] + HEX_CHARS3[h1 >> 16 & 15] + HEX_CHARS3[h1 >> 12 & 15] + HEX_CHARS3[h1 >> 8 & 15] + HEX_CHARS3[h1 >> 4 & 15] + HEX_CHARS3[h1 & 15] + HEX_CHARS3[h2 >> 28 & 15] + HEX_CHARS3[h2 >> 24 & 15] + HEX_CHARS3[h2 >> 20 & 15] + HEX_CHARS3[h2 >> 16 & 15] + HEX_CHARS3[h2 >> 12 & 15] + HEX_CHARS3[h2 >> 8 & 15] + HEX_CHARS3[h2 >> 4 & 15] + HEX_CHARS3[h2 & 15] + HEX_CHARS3[h3 >> 28 & 15] + HEX_CHARS3[h3 >> 24 & 15] + HEX_CHARS3[h3 >> 20 & 15] + HEX_CHARS3[h3 >> 16 & 15] + HEX_CHARS3[h3 >> 12 & 15] + HEX_CHARS3[h3 >> 8 & 15] + HEX_CHARS3[h3 >> 4 & 15] + HEX_CHARS3[h3 & 15] + HEX_CHARS3[h4 >> 28 & 15] + HEX_CHARS3[h4 >> 24 & 15] + HEX_CHARS3[h4 >> 20 & 15] + HEX_CHARS3[h4 >> 16 & 15] + HEX_CHARS3[h4 >> 12 & 15] + HEX_CHARS3[h4 >> 8 & 15] + HEX_CHARS3[h4 >> 4 & 15] + HEX_CHARS3[h4 & 15];
    }
    toString() {
        return this.hex();
    }
    digest() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        return [
            h0 >> 24 & 255,
            h0 >> 16 & 255,
            h0 >> 8 & 255,
            h0 & 255,
            h1 >> 24 & 255,
            h1 >> 16 & 255,
            h1 >> 8 & 255,
            h1 & 255,
            h2 >> 24 & 255,
            h2 >> 16 & 255,
            h2 >> 8 & 255,
            h2 & 255,
            h3 >> 24 & 255,
            h3 >> 16 & 255,
            h3 >> 8 & 255,
            h3 & 255,
            h4 >> 24 & 255,
            h4 >> 16 & 255,
            h4 >> 8 & 255,
            h4 & 255, 
        ];
    }
    array() {
        return this.digest();
    }
    arrayBuffer() {
        this.finalize();
        const buffer = new ArrayBuffer(20);
        const dataView = new DataView(buffer);
        dataView.setUint32(0, this.#h0);
        dataView.setUint32(4, this.#h1);
        dataView.setUint32(8, this.#h2);
        dataView.setUint32(12, this.#h3);
        dataView.setUint32(16, this.#h4);
        return buffer;
    }
}
class HmacSha11 extends Sha11 {
    #sharedMemory;
    #inner;
    #oKeyPad;
    constructor(secretKey3, sharedMemory8 = false){
        super(sharedMemory8);
        let key6;
        if (typeof secretKey3 === "string") {
            const bytes = [];
            const length = secretKey3.length;
            let index = 0;
            for(let i4 = 0; i4 < length; i4++){
                let code7 = secretKey3.charCodeAt(i4);
                if (code7 < 128) {
                    bytes[index++] = code7;
                } else if (code7 < 2048) {
                    bytes[index++] = 192 | code7 >> 6;
                    bytes[index++] = 128 | code7 & 63;
                } else if (code7 < 55296 || code7 >= 57344) {
                    bytes[index++] = 224 | code7 >> 12;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                } else {
                    code7 = 65536 + ((code7 & 1023) << 10 | secretKey3.charCodeAt(++i4) & 1023);
                    bytes[index++] = 240 | code7 >> 18;
                    bytes[index++] = 128 | code7 >> 12 & 63;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                }
            }
            key6 = bytes;
        } else {
            if (secretKey3 instanceof ArrayBuffer) {
                key6 = new Uint8Array(secretKey3);
            } else {
                key6 = secretKey3;
            }
        }
        if (key6.length > 64) {
            key6 = new Sha11(true).update(key6).array();
        }
        const oKeyPad3 = [];
        const iKeyPad3 = [];
        for(let i4 = 0; i4 < 64; i4++){
            const b = key6[i4] || 0;
            oKeyPad3[i4] = 92 ^ b;
            iKeyPad3[i4] = 54 ^ b;
        }
        this.update(iKeyPad3);
        this.#oKeyPad = oKeyPad3;
        this.#inner = true;
        this.#sharedMemory = sharedMemory8;
    }
    finalize() {
        super.finalize();
        if (this.#inner) {
            this.#inner = false;
            const innerHash = this.array();
            super.init(this.#sharedMemory);
            this.update(this.#oKeyPad);
            this.update(innerHash);
            super.finalize();
        }
    }
}
const HEX_CHARS4 = "0123456789abcdef".split("");
const EXTRA4 = [
    -2147483648,
    8388608,
    32768,
    128
];
const SHIFT4 = [
    24,
    16,
    8,
    0
];
const K2 = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298, 
];
const blocks4 = [];
class Sha2561 {
    #block;
    #blocks;
    #bytes;
    #finalized;
    #first;
    #h0;
    #h1;
    #h2;
    #h3;
    #h4;
    #h5;
    #h6;
    #h7;
    #hashed;
    #hBytes;
    #is224;
    #lastByteIndex = 0;
    #start;
    constructor(is2243 = false, sharedMemory9 = false){
        this.init(is2243, sharedMemory9);
    }
    init(is224, sharedMemory) {
        if (sharedMemory) {
            blocks4[0] = blocks4[16] = blocks4[1] = blocks4[2] = blocks4[3] = blocks4[4] = blocks4[5] = blocks4[6] = blocks4[7] = blocks4[8] = blocks4[9] = blocks4[10] = blocks4[11] = blocks4[12] = blocks4[13] = blocks4[14] = blocks4[15] = 0;
            this.#blocks = blocks4;
        } else {
            this.#blocks = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ];
        }
        if (is224) {
            this.#h0 = 3238371032;
            this.#h1 = 914150663;
            this.#h2 = 812702999;
            this.#h3 = 4144912697;
            this.#h4 = 4290775857;
            this.#h5 = 1750603025;
            this.#h6 = 1694076839;
            this.#h7 = 3204075428;
        } else {
            this.#h0 = 1779033703;
            this.#h1 = 3144134277;
            this.#h2 = 1013904242;
            this.#h3 = 2773480762;
            this.#h4 = 1359893119;
            this.#h5 = 2600822924;
            this.#h6 = 528734635;
            this.#h7 = 1541459225;
        }
        this.#block = this.#start = this.#bytes = this.#hBytes = 0;
        this.#finalized = this.#hashed = false;
        this.#first = true;
        this.#is224 = is224;
    }
    update(message) {
        if (this.#finalized) {
            return this;
        }
        let msg2;
        if (message instanceof ArrayBuffer) {
            msg2 = new Uint8Array(message);
        } else {
            msg2 = message;
        }
        let index = 0;
        const length = msg2.length;
        const blocks5 = this.#blocks;
        while(index < length){
            let i5;
            if (this.#hashed) {
                this.#hashed = false;
                blocks5[0] = this.#block;
                blocks5[16] = blocks5[1] = blocks5[2] = blocks5[3] = blocks5[4] = blocks5[5] = blocks5[6] = blocks5[7] = blocks5[8] = blocks5[9] = blocks5[10] = blocks5[11] = blocks5[12] = blocks5[13] = blocks5[14] = blocks5[15] = 0;
            }
            if (typeof msg2 !== "string") {
                for(i5 = this.#start; index < length && i5 < 64; ++index){
                    blocks5[i5 >> 2] |= msg2[index] << SHIFT4[(i5++) & 3];
                }
            } else {
                for(i5 = this.#start; index < length && i5 < 64; ++index){
                    let code7 = msg2.charCodeAt(index);
                    if (code7 < 128) {
                        blocks5[i5 >> 2] |= code7 << SHIFT4[(i5++) & 3];
                    } else if (code7 < 2048) {
                        blocks5[i5 >> 2] |= (192 | code7 >> 6) << SHIFT4[(i5++) & 3];
                        blocks5[i5 >> 2] |= (128 | code7 & 63) << SHIFT4[(i5++) & 3];
                    } else if (code7 < 55296 || code7 >= 57344) {
                        blocks5[i5 >> 2] |= (224 | code7 >> 12) << SHIFT4[(i5++) & 3];
                        blocks5[i5 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT4[(i5++) & 3];
                        blocks5[i5 >> 2] |= (128 | code7 & 63) << SHIFT4[(i5++) & 3];
                    } else {
                        code7 = 65536 + ((code7 & 1023) << 10 | msg2.charCodeAt(++index) & 1023);
                        blocks5[i5 >> 2] |= (240 | code7 >> 18) << SHIFT4[(i5++) & 3];
                        blocks5[i5 >> 2] |= (128 | code7 >> 12 & 63) << SHIFT4[(i5++) & 3];
                        blocks5[i5 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT4[(i5++) & 3];
                        blocks5[i5 >> 2] |= (128 | code7 & 63) << SHIFT4[(i5++) & 3];
                    }
                }
            }
            this.#lastByteIndex = i5;
            this.#bytes += i5 - this.#start;
            if (i5 >= 64) {
                this.#block = blocks5[16];
                this.#start = i5 - 64;
                this.hash();
                this.#hashed = true;
            } else {
                this.#start = i5;
            }
        }
        if (this.#bytes > 4294967295) {
            this.#hBytes += this.#bytes / 4294967296 << 0;
            this.#bytes = this.#bytes % 4294967296;
        }
        return this;
    }
    finalize() {
        if (this.#finalized) {
            return;
        }
        this.#finalized = true;
        const blocks5 = this.#blocks;
        const i5 = this.#lastByteIndex;
        blocks5[16] = this.#block;
        blocks5[i5 >> 2] |= EXTRA4[i5 & 3];
        this.#block = blocks5[16];
        if (i5 >= 56) {
            if (!this.#hashed) {
                this.hash();
            }
            blocks5[0] = this.#block;
            blocks5[16] = blocks5[1] = blocks5[2] = blocks5[3] = blocks5[4] = blocks5[5] = blocks5[6] = blocks5[7] = blocks5[8] = blocks5[9] = blocks5[10] = blocks5[11] = blocks5[12] = blocks5[13] = blocks5[14] = blocks5[15] = 0;
        }
        blocks5[14] = this.#hBytes << 3 | this.#bytes >>> 29;
        blocks5[15] = this.#bytes << 3;
        this.hash();
    }
    hash() {
        let a = this.#h0;
        let b = this.#h1;
        let c = this.#h2;
        let d = this.#h3;
        let e = this.#h4;
        let f = this.#h5;
        let g = this.#h6;
        let h = this.#h7;
        const blocks5 = this.#blocks;
        let s0;
        let s1;
        let maj;
        let t1;
        let t2;
        let ch;
        let ab1;
        let da;
        let cd;
        let bc;
        for(let j = 16; j < 64; ++j){
            t1 = blocks5[j - 15];
            s0 = (t1 >>> 7 | t1 << 25) ^ (t1 >>> 18 | t1 << 14) ^ t1 >>> 3;
            t1 = blocks5[j - 2];
            s1 = (t1 >>> 17 | t1 << 15) ^ (t1 >>> 19 | t1 << 13) ^ t1 >>> 10;
            blocks5[j] = blocks5[j - 16] + s0 + blocks5[j - 7] + s1 << 0;
        }
        bc = b & c;
        for(let j1 = 0; j1 < 64; j1 += 4){
            if (this.#first) {
                if (this.#is224) {
                    ab1 = 300032;
                    t1 = blocks5[0] - 1413257819;
                    h = t1 - 150054599 << 0;
                    d = t1 + 24177077 << 0;
                } else {
                    ab1 = 704751109;
                    t1 = blocks5[0] - 210244248;
                    h = t1 - 1521486534 << 0;
                    d = t1 + 143694565 << 0;
                }
                this.#first = false;
            } else {
                s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
                s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
                ab1 = a & b;
                maj = ab1 ^ a & c ^ bc;
                ch = e & f ^ ~e & g;
                t1 = h + s1 + ch + K2[j1] + blocks5[j1];
                t2 = s0 + maj;
                h = d + t1 << 0;
                d = t1 + t2 << 0;
            }
            s0 = (d >>> 2 | d << 30) ^ (d >>> 13 | d << 19) ^ (d >>> 22 | d << 10);
            s1 = (h >>> 6 | h << 26) ^ (h >>> 11 | h << 21) ^ (h >>> 25 | h << 7);
            da = d & a;
            maj = da ^ d & b ^ ab1;
            ch = h & e ^ ~h & f;
            t1 = g + s1 + ch + K2[j1 + 1] + blocks5[j1 + 1];
            t2 = s0 + maj;
            g = c + t1 << 0;
            c = t1 + t2 << 0;
            s0 = (c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10);
            s1 = (g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7);
            cd = c & d;
            maj = cd ^ c & a ^ da;
            ch = g & h ^ ~g & e;
            t1 = f + s1 + ch + K2[j1 + 2] + blocks5[j1 + 2];
            t2 = s0 + maj;
            f = b + t1 << 0;
            b = t1 + t2 << 0;
            s0 = (b >>> 2 | b << 30) ^ (b >>> 13 | b << 19) ^ (b >>> 22 | b << 10);
            s1 = (f >>> 6 | f << 26) ^ (f >>> 11 | f << 21) ^ (f >>> 25 | f << 7);
            bc = b & c;
            maj = bc ^ b & d ^ cd;
            ch = f & g ^ ~f & h;
            t1 = e + s1 + ch + K2[j1 + 3] + blocks5[j1 + 3];
            t2 = s0 + maj;
            e = a + t1 << 0;
            a = t1 + t2 << 0;
        }
        this.#h0 = this.#h0 + a << 0;
        this.#h1 = this.#h1 + b << 0;
        this.#h2 = this.#h2 + c << 0;
        this.#h3 = this.#h3 + d << 0;
        this.#h4 = this.#h4 + e << 0;
        this.#h5 = this.#h5 + f << 0;
        this.#h6 = this.#h6 + g << 0;
        this.#h7 = this.#h7 + h << 0;
    }
    hex() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        const h5 = this.#h5;
        const h6 = this.#h6;
        const h7 = this.#h7;
        let hex = HEX_CHARS4[h0 >> 28 & 15] + HEX_CHARS4[h0 >> 24 & 15] + HEX_CHARS4[h0 >> 20 & 15] + HEX_CHARS4[h0 >> 16 & 15] + HEX_CHARS4[h0 >> 12 & 15] + HEX_CHARS4[h0 >> 8 & 15] + HEX_CHARS4[h0 >> 4 & 15] + HEX_CHARS4[h0 & 15] + HEX_CHARS4[h1 >> 28 & 15] + HEX_CHARS4[h1 >> 24 & 15] + HEX_CHARS4[h1 >> 20 & 15] + HEX_CHARS4[h1 >> 16 & 15] + HEX_CHARS4[h1 >> 12 & 15] + HEX_CHARS4[h1 >> 8 & 15] + HEX_CHARS4[h1 >> 4 & 15] + HEX_CHARS4[h1 & 15] + HEX_CHARS4[h2 >> 28 & 15] + HEX_CHARS4[h2 >> 24 & 15] + HEX_CHARS4[h2 >> 20 & 15] + HEX_CHARS4[h2 >> 16 & 15] + HEX_CHARS4[h2 >> 12 & 15] + HEX_CHARS4[h2 >> 8 & 15] + HEX_CHARS4[h2 >> 4 & 15] + HEX_CHARS4[h2 & 15] + HEX_CHARS4[h3 >> 28 & 15] + HEX_CHARS4[h3 >> 24 & 15] + HEX_CHARS4[h3 >> 20 & 15] + HEX_CHARS4[h3 >> 16 & 15] + HEX_CHARS4[h3 >> 12 & 15] + HEX_CHARS4[h3 >> 8 & 15] + HEX_CHARS4[h3 >> 4 & 15] + HEX_CHARS4[h3 & 15] + HEX_CHARS4[h4 >> 28 & 15] + HEX_CHARS4[h4 >> 24 & 15] + HEX_CHARS4[h4 >> 20 & 15] + HEX_CHARS4[h4 >> 16 & 15] + HEX_CHARS4[h4 >> 12 & 15] + HEX_CHARS4[h4 >> 8 & 15] + HEX_CHARS4[h4 >> 4 & 15] + HEX_CHARS4[h4 & 15] + HEX_CHARS4[h5 >> 28 & 15] + HEX_CHARS4[h5 >> 24 & 15] + HEX_CHARS4[h5 >> 20 & 15] + HEX_CHARS4[h5 >> 16 & 15] + HEX_CHARS4[h5 >> 12 & 15] + HEX_CHARS4[h5 >> 8 & 15] + HEX_CHARS4[h5 >> 4 & 15] + HEX_CHARS4[h5 & 15] + HEX_CHARS4[h6 >> 28 & 15] + HEX_CHARS4[h6 >> 24 & 15] + HEX_CHARS4[h6 >> 20 & 15] + HEX_CHARS4[h6 >> 16 & 15] + HEX_CHARS4[h6 >> 12 & 15] + HEX_CHARS4[h6 >> 8 & 15] + HEX_CHARS4[h6 >> 4 & 15] + HEX_CHARS4[h6 & 15];
        if (!this.#is224) {
            hex += HEX_CHARS4[h7 >> 28 & 15] + HEX_CHARS4[h7 >> 24 & 15] + HEX_CHARS4[h7 >> 20 & 15] + HEX_CHARS4[h7 >> 16 & 15] + HEX_CHARS4[h7 >> 12 & 15] + HEX_CHARS4[h7 >> 8 & 15] + HEX_CHARS4[h7 >> 4 & 15] + HEX_CHARS4[h7 & 15];
        }
        return hex;
    }
    toString() {
        return this.hex();
    }
    digest() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        const h5 = this.#h5;
        const h6 = this.#h6;
        const h7 = this.#h7;
        const arr = [
            h0 >> 24 & 255,
            h0 >> 16 & 255,
            h0 >> 8 & 255,
            h0 & 255,
            h1 >> 24 & 255,
            h1 >> 16 & 255,
            h1 >> 8 & 255,
            h1 & 255,
            h2 >> 24 & 255,
            h2 >> 16 & 255,
            h2 >> 8 & 255,
            h2 & 255,
            h3 >> 24 & 255,
            h3 >> 16 & 255,
            h3 >> 8 & 255,
            h3 & 255,
            h4 >> 24 & 255,
            h4 >> 16 & 255,
            h4 >> 8 & 255,
            h4 & 255,
            h5 >> 24 & 255,
            h5 >> 16 & 255,
            h5 >> 8 & 255,
            h5 & 255,
            h6 >> 24 & 255,
            h6 >> 16 & 255,
            h6 >> 8 & 255,
            h6 & 255, 
        ];
        if (!this.#is224) {
            arr.push(h7 >> 24 & 255, h7 >> 16 & 255, h7 >> 8 & 255, h7 & 255);
        }
        return arr;
    }
    array() {
        return this.digest();
    }
    arrayBuffer() {
        this.finalize();
        const buffer = new ArrayBuffer(this.#is224 ? 28 : 32);
        const dataView = new DataView(buffer);
        dataView.setUint32(0, this.#h0);
        dataView.setUint32(4, this.#h1);
        dataView.setUint32(8, this.#h2);
        dataView.setUint32(12, this.#h3);
        dataView.setUint32(16, this.#h4);
        dataView.setUint32(20, this.#h5);
        dataView.setUint32(24, this.#h6);
        if (!this.#is224) {
            dataView.setUint32(28, this.#h7);
        }
        return buffer;
    }
}
class HmacSha2561 extends Sha2561 {
    #inner;
    #is224;
    #oKeyPad;
    #sharedMemory;
    constructor(secretKey4, is2244 = false, sharedMemory10 = false){
        super(is2244, sharedMemory10);
        let key7;
        if (typeof secretKey4 === "string") {
            const bytes = [];
            const length = secretKey4.length;
            let index = 0;
            for(let i5 = 0; i5 < length; ++i5){
                let code7 = secretKey4.charCodeAt(i5);
                if (code7 < 128) {
                    bytes[index++] = code7;
                } else if (code7 < 2048) {
                    bytes[index++] = 192 | code7 >> 6;
                    bytes[index++] = 128 | code7 & 63;
                } else if (code7 < 55296 || code7 >= 57344) {
                    bytes[index++] = 224 | code7 >> 12;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                } else {
                    code7 = 65536 + ((code7 & 1023) << 10 | secretKey4.charCodeAt(++i5) & 1023);
                    bytes[index++] = 240 | code7 >> 18;
                    bytes[index++] = 128 | code7 >> 12 & 63;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                }
            }
            key7 = bytes;
        } else {
            if (secretKey4 instanceof ArrayBuffer) {
                key7 = new Uint8Array(secretKey4);
            } else {
                key7 = secretKey4;
            }
        }
        if (key7.length > 64) {
            key7 = new Sha2561(is2244, true).update(key7).array();
        }
        const oKeyPad4 = [];
        const iKeyPad4 = [];
        for(let i5 = 0; i5 < 64; ++i5){
            const b = key7[i5] || 0;
            oKeyPad4[i5] = 92 ^ b;
            iKeyPad4[i5] = 54 ^ b;
        }
        this.update(iKeyPad4);
        this.#oKeyPad = oKeyPad4;
        this.#inner = true;
        this.#is224 = is2244;
        this.#sharedMemory = sharedMemory10;
    }
    finalize() {
        super.finalize();
        if (this.#inner) {
            this.#inner = false;
            const innerHash = this.array();
            super.init(this.#is224, this.#sharedMemory);
            this.update(this.#oKeyPad);
            this.update(innerHash);
            super.finalize();
        }
    }
}
const HEX_CHARS5 = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f"
];
const EXTRA5 = [
    -2147483648,
    8388608,
    32768,
    128
];
const SHIFT5 = [
    24,
    16,
    8,
    0
];
const K3 = [
    1116352408,
    3609767458,
    1899447441,
    602891725,
    3049323471,
    3964484399,
    3921009573,
    2173295548,
    961987163,
    4081628472,
    1508970993,
    3053834265,
    2453635748,
    2937671579,
    2870763221,
    3664609560,
    3624381080,
    2734883394,
    310598401,
    1164996542,
    607225278,
    1323610764,
    1426881987,
    3590304994,
    1925078388,
    4068182383,
    2162078206,
    991336113,
    2614888103,
    633803317,
    3248222580,
    3479774868,
    3835390401,
    2666613458,
    4022224774,
    944711139,
    264347078,
    2341262773,
    604807628,
    2007800933,
    770255983,
    1495990901,
    1249150122,
    1856431235,
    1555081692,
    3175218132,
    1996064986,
    2198950837,
    2554220882,
    3999719339,
    2821834349,
    766784016,
    2952996808,
    2566594879,
    3210313671,
    3203337956,
    3336571891,
    1034457026,
    3584528711,
    2466948901,
    113926993,
    3758326383,
    338241895,
    168717936,
    666307205,
    1188179964,
    773529912,
    1546045734,
    1294757372,
    1522805485,
    1396182291,
    2643833823,
    1695183700,
    2343527390,
    1986661051,
    1014477480,
    2177026350,
    1206759142,
    2456956037,
    344077627,
    2730485921,
    1290863460,
    2820302411,
    3158454273,
    3259730800,
    3505952657,
    3345764771,
    106217008,
    3516065817,
    3606008344,
    3600352804,
    1432725776,
    4094571909,
    1467031594,
    275423344,
    851169720,
    430227734,
    3100823752,
    506948616,
    1363258195,
    659060556,
    3750685593,
    883997877,
    3785050280,
    958139571,
    3318307427,
    1322822218,
    3812723403,
    1537002063,
    2003034995,
    1747873779,
    3602036899,
    1955562222,
    1575990012,
    2024104815,
    1125592928,
    2227730452,
    2716904306,
    2361852424,
    442776044,
    2428436474,
    593698344,
    2756734187,
    3733110249,
    3204031479,
    2999351573,
    3329325298,
    3815920427,
    3391569614,
    3928383900,
    3515267271,
    566280711,
    3940187606,
    3454069534,
    4118630271,
    4000239992,
    116418474,
    1914138554,
    174292421,
    2731055270,
    289380356,
    3203993006,
    460393269,
    320620315,
    685471733,
    587496836,
    852142971,
    1086792851,
    1017036298,
    365543100,
    1126000580,
    2618297676,
    1288033470,
    3409855158,
    1501505948,
    4234509866,
    1607167915,
    987167468,
    1816402316,
    1246189591
];
const blocks5 = [];
class Sha5121 {
    #blocks;
    #block;
    #bits;
    #start;
    #bytes;
    #hBytes;
    #lastByteIndex = 0;
    #finalized;
    #hashed;
    #h0h;
    #h0l;
    #h1h;
    #h1l;
    #h2h;
    #h2l;
    #h3h;
    #h3l;
    #h4h;
    #h4l;
    #h5h;
    #h5l;
    #h6h;
    #h6l;
    #h7h;
    #h7l;
    constructor(bits3 = 512, sharedMemory11 = false){
        this.init(bits3, sharedMemory11);
    }
    init(bits, sharedMemory) {
        if (sharedMemory) {
            blocks5[0] = blocks5[1] = blocks5[2] = blocks5[3] = blocks5[4] = blocks5[5] = blocks5[6] = blocks5[7] = blocks5[8] = blocks5[9] = blocks5[10] = blocks5[11] = blocks5[12] = blocks5[13] = blocks5[14] = blocks5[15] = blocks5[16] = blocks5[17] = blocks5[18] = blocks5[19] = blocks5[20] = blocks5[21] = blocks5[22] = blocks5[23] = blocks5[24] = blocks5[25] = blocks5[26] = blocks5[27] = blocks5[28] = blocks5[29] = blocks5[30] = blocks5[31] = blocks5[32] = 0;
            this.#blocks = blocks5;
        } else {
            this.#blocks = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ];
        }
        if (bits === 224) {
            this.#h0h = 2352822216;
            this.#h0l = 424955298;
            this.#h1h = 1944164710;
            this.#h1l = 2312950998;
            this.#h2h = 502970286;
            this.#h2l = 855612546;
            this.#h3h = 1738396948;
            this.#h3l = 1479516111;
            this.#h4h = 258812777;
            this.#h4l = 2077511080;
            this.#h5h = 2011393907;
            this.#h5l = 79989058;
            this.#h6h = 1067287976;
            this.#h6l = 1780299464;
            this.#h7h = 286451373;
            this.#h7l = 2446758561;
        } else if (bits === 256) {
            this.#h0h = 573645204;
            this.#h0l = 4230739756;
            this.#h1h = 2673172387;
            this.#h1l = 3360449730;
            this.#h2h = 596883563;
            this.#h2l = 1867755857;
            this.#h3h = 2520282905;
            this.#h3l = 1497426621;
            this.#h4h = 2519219938;
            this.#h4l = 2827943907;
            this.#h5h = 3193839141;
            this.#h5l = 1401305490;
            this.#h6h = 721525244;
            this.#h6l = 746961066;
            this.#h7h = 246885852;
            this.#h7l = 2177182882;
        } else if (bits === 384) {
            this.#h0h = 3418070365;
            this.#h0l = 3238371032;
            this.#h1h = 1654270250;
            this.#h1l = 914150663;
            this.#h2h = 2438529370;
            this.#h2l = 812702999;
            this.#h3h = 355462360;
            this.#h3l = 4144912697;
            this.#h4h = 1731405415;
            this.#h4l = 4290775857;
            this.#h5h = 2394180231;
            this.#h5l = 1750603025;
            this.#h6h = 3675008525;
            this.#h6l = 1694076839;
            this.#h7h = 1203062813;
            this.#h7l = 3204075428;
        } else {
            this.#h0h = 1779033703;
            this.#h0l = 4089235720;
            this.#h1h = 3144134277;
            this.#h1l = 2227873595;
            this.#h2h = 1013904242;
            this.#h2l = 4271175723;
            this.#h3h = 2773480762;
            this.#h3l = 1595750129;
            this.#h4h = 1359893119;
            this.#h4l = 2917565137;
            this.#h5h = 2600822924;
            this.#h5l = 725511199;
            this.#h6h = 528734635;
            this.#h6l = 4215389547;
            this.#h7h = 1541459225;
            this.#h7l = 327033209;
        }
        this.#bits = bits;
        this.#block = this.#start = this.#bytes = this.#hBytes = 0;
        this.#finalized = this.#hashed = false;
    }
    update(message) {
        if (this.#finalized) {
            return this;
        }
        let msg2;
        if (message instanceof ArrayBuffer) {
            msg2 = new Uint8Array(message);
        } else {
            msg2 = message;
        }
        const length = msg2.length;
        const blocks6 = this.#blocks;
        let index = 0;
        while(index < length){
            let i6;
            if (this.#hashed) {
                this.#hashed = false;
                blocks6[0] = this.#block;
                blocks6[1] = blocks6[2] = blocks6[3] = blocks6[4] = blocks6[5] = blocks6[6] = blocks6[7] = blocks6[8] = blocks6[9] = blocks6[10] = blocks6[11] = blocks6[12] = blocks6[13] = blocks6[14] = blocks6[15] = blocks6[16] = blocks6[17] = blocks6[18] = blocks6[19] = blocks6[20] = blocks6[21] = blocks6[22] = blocks6[23] = blocks6[24] = blocks6[25] = blocks6[26] = blocks6[27] = blocks6[28] = blocks6[29] = blocks6[30] = blocks6[31] = blocks6[32] = 0;
            }
            if (typeof msg2 !== "string") {
                for(i6 = this.#start; index < length && i6 < 128; ++index){
                    blocks6[i6 >> 2] |= msg2[index] << SHIFT5[(i6++) & 3];
                }
            } else {
                for(i6 = this.#start; index < length && i6 < 128; ++index){
                    let code7 = msg2.charCodeAt(index);
                    if (code7 < 128) {
                        blocks6[i6 >> 2] |= code7 << SHIFT5[(i6++) & 3];
                    } else if (code7 < 2048) {
                        blocks6[i6 >> 2] |= (192 | code7 >> 6) << SHIFT5[(i6++) & 3];
                        blocks6[i6 >> 2] |= (128 | code7 & 63) << SHIFT5[(i6++) & 3];
                    } else if (code7 < 55296 || code7 >= 57344) {
                        blocks6[i6 >> 2] |= (224 | code7 >> 12) << SHIFT5[(i6++) & 3];
                        blocks6[i6 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT5[(i6++) & 3];
                        blocks6[i6 >> 2] |= (128 | code7 & 63) << SHIFT5[(i6++) & 3];
                    } else {
                        code7 = 65536 + ((code7 & 1023) << 10 | msg2.charCodeAt(++index) & 1023);
                        blocks6[i6 >> 2] |= (240 | code7 >> 18) << SHIFT5[(i6++) & 3];
                        blocks6[i6 >> 2] |= (128 | code7 >> 12 & 63) << SHIFT5[(i6++) & 3];
                        blocks6[i6 >> 2] |= (128 | code7 >> 6 & 63) << SHIFT5[(i6++) & 3];
                        blocks6[i6 >> 2] |= (128 | code7 & 63) << SHIFT5[(i6++) & 3];
                    }
                }
            }
            this.#lastByteIndex = i6;
            this.#bytes += i6 - this.#start;
            if (i6 >= 128) {
                this.#block = blocks6[32];
                this.#start = i6 - 128;
                this.hash();
                this.#hashed = true;
            } else {
                this.#start = i6;
            }
        }
        if (this.#bytes > 4294967295) {
            this.#hBytes += this.#bytes / 4294967296 << 0;
            this.#bytes = this.#bytes % 4294967296;
        }
        return this;
    }
    finalize() {
        if (this.#finalized) {
            return;
        }
        this.#finalized = true;
        const blocks6 = this.#blocks;
        const i6 = this.#lastByteIndex;
        blocks6[32] = this.#block;
        blocks6[i6 >> 2] |= EXTRA5[i6 & 3];
        this.#block = blocks6[32];
        if (i6 >= 112) {
            if (!this.#hashed) {
                this.hash();
            }
            blocks6[0] = this.#block;
            blocks6[1] = blocks6[2] = blocks6[3] = blocks6[4] = blocks6[5] = blocks6[6] = blocks6[7] = blocks6[8] = blocks6[9] = blocks6[10] = blocks6[11] = blocks6[12] = blocks6[13] = blocks6[14] = blocks6[15] = blocks6[16] = blocks6[17] = blocks6[18] = blocks6[19] = blocks6[20] = blocks6[21] = blocks6[22] = blocks6[23] = blocks6[24] = blocks6[25] = blocks6[26] = blocks6[27] = blocks6[28] = blocks6[29] = blocks6[30] = blocks6[31] = blocks6[32] = 0;
        }
        blocks6[30] = this.#hBytes << 3 | this.#bytes >>> 29;
        blocks6[31] = this.#bytes << 3;
        this.hash();
    }
    hash() {
        const h0h = this.#h0h, h0l = this.#h0l, h1h = this.#h1h, h1l = this.#h1l, h2h = this.#h2h, h2l = this.#h2l, h3h = this.#h3h, h3l = this.#h3l, h4h = this.#h4h, h4l = this.#h4l, h5h = this.#h5h, h5l = this.#h5l, h6h = this.#h6h, h6l = this.#h6l, h7h = this.#h7h, h7l = this.#h7l;
        let s0h, s0l, s1h, s1l, c1, c2, c3, c4, abh, abl, dah, dal, cdh, cdl, bch, bcl, majh, majl, t1h, t1l, t2h, t2l, chh, chl;
        const blocks6 = this.#blocks;
        for(let j = 32; j < 160; j += 2){
            t1h = blocks6[j - 30];
            t1l = blocks6[j - 29];
            s0h = (t1h >>> 1 | t1l << 31) ^ (t1h >>> 8 | t1l << 24) ^ t1h >>> 7;
            s0l = (t1l >>> 1 | t1h << 31) ^ (t1l >>> 8 | t1h << 24) ^ (t1l >>> 7 | t1h << 25);
            t1h = blocks6[j - 4];
            t1l = blocks6[j - 3];
            s1h = (t1h >>> 19 | t1l << 13) ^ (t1l >>> 29 | t1h << 3) ^ t1h >>> 6;
            s1l = (t1l >>> 19 | t1h << 13) ^ (t1h >>> 29 | t1l << 3) ^ (t1l >>> 6 | t1h << 26);
            t1h = blocks6[j - 32];
            t1l = blocks6[j - 31];
            t2h = blocks6[j - 14];
            t2l = blocks6[j - 13];
            c1 = (t2l & 65535) + (t1l & 65535) + (s0l & 65535) + (s1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (s0l >>> 16) + (s1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (s0h & 65535) + (s1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (s0h >>> 16) + (s1h >>> 16) + (c3 >>> 16);
            blocks6[j] = c4 << 16 | c3 & 65535;
            blocks6[j + 1] = c2 << 16 | c1 & 65535;
        }
        let ah = h0h, al = h0l, bh = h1h, bl = h1l, ch = h2h, cl = h2l, dh = h3h, dl = h3l, eh = h4h, el = h4l, fh = h5h, fl = h5l, gh = h6h, gl = h6l, hh = h7h, hl = h7l;
        bch = bh & ch;
        bcl = bl & cl;
        for(let j1 = 0; j1 < 160; j1 += 8){
            s0h = (ah >>> 28 | al << 4) ^ (al >>> 2 | ah << 30) ^ (al >>> 7 | ah << 25);
            s0l = (al >>> 28 | ah << 4) ^ (ah >>> 2 | al << 30) ^ (ah >>> 7 | al << 25);
            s1h = (eh >>> 14 | el << 18) ^ (eh >>> 18 | el << 14) ^ (el >>> 9 | eh << 23);
            s1l = (el >>> 14 | eh << 18) ^ (el >>> 18 | eh << 14) ^ (eh >>> 9 | el << 23);
            abh = ah & bh;
            abl = al & bl;
            majh = abh ^ ah & ch ^ bch;
            majl = abl ^ al & cl ^ bcl;
            chh = eh & fh ^ ~eh & gh;
            chl = el & fl ^ ~el & gl;
            t1h = blocks6[j1];
            t1l = blocks6[j1 + 1];
            t2h = K3[j1];
            t2l = K3[j1 + 1];
            c1 = (t2l & 65535) + (t1l & 65535) + (chl & 65535) + (s1l & 65535) + (hl & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (hl >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (chh & 65535) + (s1h & 65535) + (hh & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (hh >>> 16) + (c3 >>> 16);
            t1h = c4 << 16 | c3 & 65535;
            t1l = c2 << 16 | c1 & 65535;
            c1 = (majl & 65535) + (s0l & 65535);
            c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
            c3 = (majh & 65535) + (s0h & 65535) + (c2 >>> 16);
            c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);
            t2h = c4 << 16 | c3 & 65535;
            t2l = c2 << 16 | c1 & 65535;
            c1 = (dl & 65535) + (t1l & 65535);
            c2 = (dl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (dh & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (dh >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            hh = c4 << 16 | c3 & 65535;
            hl = c2 << 16 | c1 & 65535;
            c1 = (t2l & 65535) + (t1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            dh = c4 << 16 | c3 & 65535;
            dl = c2 << 16 | c1 & 65535;
            s0h = (dh >>> 28 | dl << 4) ^ (dl >>> 2 | dh << 30) ^ (dl >>> 7 | dh << 25);
            s0l = (dl >>> 28 | dh << 4) ^ (dh >>> 2 | dl << 30) ^ (dh >>> 7 | dl << 25);
            s1h = (hh >>> 14 | hl << 18) ^ (hh >>> 18 | hl << 14) ^ (hl >>> 9 | hh << 23);
            s1l = (hl >>> 14 | hh << 18) ^ (hl >>> 18 | hh << 14) ^ (hh >>> 9 | hl << 23);
            dah = dh & ah;
            dal = dl & al;
            majh = dah ^ dh & bh ^ abh;
            majl = dal ^ dl & bl ^ abl;
            chh = hh & eh ^ ~hh & fh;
            chl = hl & el ^ ~hl & fl;
            t1h = blocks6[j1 + 2];
            t1l = blocks6[j1 + 3];
            t2h = K3[j1 + 2];
            t2l = K3[j1 + 3];
            c1 = (t2l & 65535) + (t1l & 65535) + (chl & 65535) + (s1l & 65535) + (gl & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (gl >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (chh & 65535) + (s1h & 65535) + (gh & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (gh >>> 16) + (c3 >>> 16);
            t1h = c4 << 16 | c3 & 65535;
            t1l = c2 << 16 | c1 & 65535;
            c1 = (majl & 65535) + (s0l & 65535);
            c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
            c3 = (majh & 65535) + (s0h & 65535) + (c2 >>> 16);
            c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);
            t2h = c4 << 16 | c3 & 65535;
            t2l = c2 << 16 | c1 & 65535;
            c1 = (cl & 65535) + (t1l & 65535);
            c2 = (cl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (ch & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (ch >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            gh = c4 << 16 | c3 & 65535;
            gl = c2 << 16 | c1 & 65535;
            c1 = (t2l & 65535) + (t1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            ch = c4 << 16 | c3 & 65535;
            cl = c2 << 16 | c1 & 65535;
            s0h = (ch >>> 28 | cl << 4) ^ (cl >>> 2 | ch << 30) ^ (cl >>> 7 | ch << 25);
            s0l = (cl >>> 28 | ch << 4) ^ (ch >>> 2 | cl << 30) ^ (ch >>> 7 | cl << 25);
            s1h = (gh >>> 14 | gl << 18) ^ (gh >>> 18 | gl << 14) ^ (gl >>> 9 | gh << 23);
            s1l = (gl >>> 14 | gh << 18) ^ (gl >>> 18 | gh << 14) ^ (gh >>> 9 | gl << 23);
            cdh = ch & dh;
            cdl = cl & dl;
            majh = cdh ^ ch & ah ^ dah;
            majl = cdl ^ cl & al ^ dal;
            chh = gh & hh ^ ~gh & eh;
            chl = gl & hl ^ ~gl & el;
            t1h = blocks6[j1 + 4];
            t1l = blocks6[j1 + 5];
            t2h = K3[j1 + 4];
            t2l = K3[j1 + 5];
            c1 = (t2l & 65535) + (t1l & 65535) + (chl & 65535) + (s1l & 65535) + (fl & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (fl >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (chh & 65535) + (s1h & 65535) + (fh & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (fh >>> 16) + (c3 >>> 16);
            t1h = c4 << 16 | c3 & 65535;
            t1l = c2 << 16 | c1 & 65535;
            c1 = (majl & 65535) + (s0l & 65535);
            c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
            c3 = (majh & 65535) + (s0h & 65535) + (c2 >>> 16);
            c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);
            t2h = c4 << 16 | c3 & 65535;
            t2l = c2 << 16 | c1 & 65535;
            c1 = (bl & 65535) + (t1l & 65535);
            c2 = (bl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (bh & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (bh >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            fh = c4 << 16 | c3 & 65535;
            fl = c2 << 16 | c1 & 65535;
            c1 = (t2l & 65535) + (t1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            bh = c4 << 16 | c3 & 65535;
            bl = c2 << 16 | c1 & 65535;
            s0h = (bh >>> 28 | bl << 4) ^ (bl >>> 2 | bh << 30) ^ (bl >>> 7 | bh << 25);
            s0l = (bl >>> 28 | bh << 4) ^ (bh >>> 2 | bl << 30) ^ (bh >>> 7 | bl << 25);
            s1h = (fh >>> 14 | fl << 18) ^ (fh >>> 18 | fl << 14) ^ (fl >>> 9 | fh << 23);
            s1l = (fl >>> 14 | fh << 18) ^ (fl >>> 18 | fh << 14) ^ (fh >>> 9 | fl << 23);
            bch = bh & ch;
            bcl = bl & cl;
            majh = bch ^ bh & dh ^ cdh;
            majl = bcl ^ bl & dl ^ cdl;
            chh = fh & gh ^ ~fh & hh;
            chl = fl & gl ^ ~fl & hl;
            t1h = blocks6[j1 + 6];
            t1l = blocks6[j1 + 7];
            t2h = K3[j1 + 6];
            t2l = K3[j1 + 7];
            c1 = (t2l & 65535) + (t1l & 65535) + (chl & 65535) + (s1l & 65535) + (el & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (el >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (chh & 65535) + (s1h & 65535) + (eh & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (eh >>> 16) + (c3 >>> 16);
            t1h = c4 << 16 | c3 & 65535;
            t1l = c2 << 16 | c1 & 65535;
            c1 = (majl & 65535) + (s0l & 65535);
            c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
            c3 = (majh & 65535) + (s0h & 65535) + (c2 >>> 16);
            c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);
            t2h = c4 << 16 | c3 & 65535;
            t2l = c2 << 16 | c1 & 65535;
            c1 = (al & 65535) + (t1l & 65535);
            c2 = (al >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (ah & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (ah >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            eh = c4 << 16 | c3 & 65535;
            el = c2 << 16 | c1 & 65535;
            c1 = (t2l & 65535) + (t1l & 65535);
            c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
            c3 = (t2h & 65535) + (t1h & 65535) + (c2 >>> 16);
            c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);
            ah = c4 << 16 | c3 & 65535;
            al = c2 << 16 | c1 & 65535;
        }
        c1 = (h0l & 65535) + (al & 65535);
        c2 = (h0l >>> 16) + (al >>> 16) + (c1 >>> 16);
        c3 = (h0h & 65535) + (ah & 65535) + (c2 >>> 16);
        c4 = (h0h >>> 16) + (ah >>> 16) + (c3 >>> 16);
        this.#h0h = c4 << 16 | c3 & 65535;
        this.#h0l = c2 << 16 | c1 & 65535;
        c1 = (h1l & 65535) + (bl & 65535);
        c2 = (h1l >>> 16) + (bl >>> 16) + (c1 >>> 16);
        c3 = (h1h & 65535) + (bh & 65535) + (c2 >>> 16);
        c4 = (h1h >>> 16) + (bh >>> 16) + (c3 >>> 16);
        this.#h1h = c4 << 16 | c3 & 65535;
        this.#h1l = c2 << 16 | c1 & 65535;
        c1 = (h2l & 65535) + (cl & 65535);
        c2 = (h2l >>> 16) + (cl >>> 16) + (c1 >>> 16);
        c3 = (h2h & 65535) + (ch & 65535) + (c2 >>> 16);
        c4 = (h2h >>> 16) + (ch >>> 16) + (c3 >>> 16);
        this.#h2h = c4 << 16 | c3 & 65535;
        this.#h2l = c2 << 16 | c1 & 65535;
        c1 = (h3l & 65535) + (dl & 65535);
        c2 = (h3l >>> 16) + (dl >>> 16) + (c1 >>> 16);
        c3 = (h3h & 65535) + (dh & 65535) + (c2 >>> 16);
        c4 = (h3h >>> 16) + (dh >>> 16) + (c3 >>> 16);
        this.#h3h = c4 << 16 | c3 & 65535;
        this.#h3l = c2 << 16 | c1 & 65535;
        c1 = (h4l & 65535) + (el & 65535);
        c2 = (h4l >>> 16) + (el >>> 16) + (c1 >>> 16);
        c3 = (h4h & 65535) + (eh & 65535) + (c2 >>> 16);
        c4 = (h4h >>> 16) + (eh >>> 16) + (c3 >>> 16);
        this.#h4h = c4 << 16 | c3 & 65535;
        this.#h4l = c2 << 16 | c1 & 65535;
        c1 = (h5l & 65535) + (fl & 65535);
        c2 = (h5l >>> 16) + (fl >>> 16) + (c1 >>> 16);
        c3 = (h5h & 65535) + (fh & 65535) + (c2 >>> 16);
        c4 = (h5h >>> 16) + (fh >>> 16) + (c3 >>> 16);
        this.#h5h = c4 << 16 | c3 & 65535;
        this.#h5l = c2 << 16 | c1 & 65535;
        c1 = (h6l & 65535) + (gl & 65535);
        c2 = (h6l >>> 16) + (gl >>> 16) + (c1 >>> 16);
        c3 = (h6h & 65535) + (gh & 65535) + (c2 >>> 16);
        c4 = (h6h >>> 16) + (gh >>> 16) + (c3 >>> 16);
        this.#h6h = c4 << 16 | c3 & 65535;
        this.#h6l = c2 << 16 | c1 & 65535;
        c1 = (h7l & 65535) + (hl & 65535);
        c2 = (h7l >>> 16) + (hl >>> 16) + (c1 >>> 16);
        c3 = (h7h & 65535) + (hh & 65535) + (c2 >>> 16);
        c4 = (h7h >>> 16) + (hh >>> 16) + (c3 >>> 16);
        this.#h7h = c4 << 16 | c3 & 65535;
        this.#h7l = c2 << 16 | c1 & 65535;
    }
    hex() {
        this.finalize();
        const h0h = this.#h0h, h0l = this.#h0l, h1h = this.#h1h, h1l = this.#h1l, h2h = this.#h2h, h2l = this.#h2l, h3h = this.#h3h, h3l = this.#h3l, h4h = this.#h4h, h4l = this.#h4l, h5h = this.#h5h, h5l = this.#h5l, h6h = this.#h6h, h6l = this.#h6l, h7h = this.#h7h, h7l = this.#h7l, bits4 = this.#bits;
        let hex = HEX_CHARS5[h0h >> 28 & 15] + HEX_CHARS5[h0h >> 24 & 15] + HEX_CHARS5[h0h >> 20 & 15] + HEX_CHARS5[h0h >> 16 & 15] + HEX_CHARS5[h0h >> 12 & 15] + HEX_CHARS5[h0h >> 8 & 15] + HEX_CHARS5[h0h >> 4 & 15] + HEX_CHARS5[h0h & 15] + HEX_CHARS5[h0l >> 28 & 15] + HEX_CHARS5[h0l >> 24 & 15] + HEX_CHARS5[h0l >> 20 & 15] + HEX_CHARS5[h0l >> 16 & 15] + HEX_CHARS5[h0l >> 12 & 15] + HEX_CHARS5[h0l >> 8 & 15] + HEX_CHARS5[h0l >> 4 & 15] + HEX_CHARS5[h0l & 15] + HEX_CHARS5[h1h >> 28 & 15] + HEX_CHARS5[h1h >> 24 & 15] + HEX_CHARS5[h1h >> 20 & 15] + HEX_CHARS5[h1h >> 16 & 15] + HEX_CHARS5[h1h >> 12 & 15] + HEX_CHARS5[h1h >> 8 & 15] + HEX_CHARS5[h1h >> 4 & 15] + HEX_CHARS5[h1h & 15] + HEX_CHARS5[h1l >> 28 & 15] + HEX_CHARS5[h1l >> 24 & 15] + HEX_CHARS5[h1l >> 20 & 15] + HEX_CHARS5[h1l >> 16 & 15] + HEX_CHARS5[h1l >> 12 & 15] + HEX_CHARS5[h1l >> 8 & 15] + HEX_CHARS5[h1l >> 4 & 15] + HEX_CHARS5[h1l & 15] + HEX_CHARS5[h2h >> 28 & 15] + HEX_CHARS5[h2h >> 24 & 15] + HEX_CHARS5[h2h >> 20 & 15] + HEX_CHARS5[h2h >> 16 & 15] + HEX_CHARS5[h2h >> 12 & 15] + HEX_CHARS5[h2h >> 8 & 15] + HEX_CHARS5[h2h >> 4 & 15] + HEX_CHARS5[h2h & 15] + HEX_CHARS5[h2l >> 28 & 15] + HEX_CHARS5[h2l >> 24 & 15] + HEX_CHARS5[h2l >> 20 & 15] + HEX_CHARS5[h2l >> 16 & 15] + HEX_CHARS5[h2l >> 12 & 15] + HEX_CHARS5[h2l >> 8 & 15] + HEX_CHARS5[h2l >> 4 & 15] + HEX_CHARS5[h2l & 15] + HEX_CHARS5[h3h >> 28 & 15] + HEX_CHARS5[h3h >> 24 & 15] + HEX_CHARS5[h3h >> 20 & 15] + HEX_CHARS5[h3h >> 16 & 15] + HEX_CHARS5[h3h >> 12 & 15] + HEX_CHARS5[h3h >> 8 & 15] + HEX_CHARS5[h3h >> 4 & 15] + HEX_CHARS5[h3h & 15];
        if (bits4 >= 256) {
            hex += HEX_CHARS5[h3l >> 28 & 15] + HEX_CHARS5[h3l >> 24 & 15] + HEX_CHARS5[h3l >> 20 & 15] + HEX_CHARS5[h3l >> 16 & 15] + HEX_CHARS5[h3l >> 12 & 15] + HEX_CHARS5[h3l >> 8 & 15] + HEX_CHARS5[h3l >> 4 & 15] + HEX_CHARS5[h3l & 15];
        }
        if (bits4 >= 384) {
            hex += HEX_CHARS5[h4h >> 28 & 15] + HEX_CHARS5[h4h >> 24 & 15] + HEX_CHARS5[h4h >> 20 & 15] + HEX_CHARS5[h4h >> 16 & 15] + HEX_CHARS5[h4h >> 12 & 15] + HEX_CHARS5[h4h >> 8 & 15] + HEX_CHARS5[h4h >> 4 & 15] + HEX_CHARS5[h4h & 15] + HEX_CHARS5[h4l >> 28 & 15] + HEX_CHARS5[h4l >> 24 & 15] + HEX_CHARS5[h4l >> 20 & 15] + HEX_CHARS5[h4l >> 16 & 15] + HEX_CHARS5[h4l >> 12 & 15] + HEX_CHARS5[h4l >> 8 & 15] + HEX_CHARS5[h4l >> 4 & 15] + HEX_CHARS5[h4l & 15] + HEX_CHARS5[h5h >> 28 & 15] + HEX_CHARS5[h5h >> 24 & 15] + HEX_CHARS5[h5h >> 20 & 15] + HEX_CHARS5[h5h >> 16 & 15] + HEX_CHARS5[h5h >> 12 & 15] + HEX_CHARS5[h5h >> 8 & 15] + HEX_CHARS5[h5h >> 4 & 15] + HEX_CHARS5[h5h & 15] + HEX_CHARS5[h5l >> 28 & 15] + HEX_CHARS5[h5l >> 24 & 15] + HEX_CHARS5[h5l >> 20 & 15] + HEX_CHARS5[h5l >> 16 & 15] + HEX_CHARS5[h5l >> 12 & 15] + HEX_CHARS5[h5l >> 8 & 15] + HEX_CHARS5[h5l >> 4 & 15] + HEX_CHARS5[h5l & 15];
        }
        if (bits4 === 512) {
            hex += HEX_CHARS5[h6h >> 28 & 15] + HEX_CHARS5[h6h >> 24 & 15] + HEX_CHARS5[h6h >> 20 & 15] + HEX_CHARS5[h6h >> 16 & 15] + HEX_CHARS5[h6h >> 12 & 15] + HEX_CHARS5[h6h >> 8 & 15] + HEX_CHARS5[h6h >> 4 & 15] + HEX_CHARS5[h6h & 15] + HEX_CHARS5[h6l >> 28 & 15] + HEX_CHARS5[h6l >> 24 & 15] + HEX_CHARS5[h6l >> 20 & 15] + HEX_CHARS5[h6l >> 16 & 15] + HEX_CHARS5[h6l >> 12 & 15] + HEX_CHARS5[h6l >> 8 & 15] + HEX_CHARS5[h6l >> 4 & 15] + HEX_CHARS5[h6l & 15] + HEX_CHARS5[h7h >> 28 & 15] + HEX_CHARS5[h7h >> 24 & 15] + HEX_CHARS5[h7h >> 20 & 15] + HEX_CHARS5[h7h >> 16 & 15] + HEX_CHARS5[h7h >> 12 & 15] + HEX_CHARS5[h7h >> 8 & 15] + HEX_CHARS5[h7h >> 4 & 15] + HEX_CHARS5[h7h & 15] + HEX_CHARS5[h7l >> 28 & 15] + HEX_CHARS5[h7l >> 24 & 15] + HEX_CHARS5[h7l >> 20 & 15] + HEX_CHARS5[h7l >> 16 & 15] + HEX_CHARS5[h7l >> 12 & 15] + HEX_CHARS5[h7l >> 8 & 15] + HEX_CHARS5[h7l >> 4 & 15] + HEX_CHARS5[h7l & 15];
        }
        return hex;
    }
    toString() {
        return this.hex();
    }
    digest() {
        this.finalize();
        const h0h = this.#h0h, h0l = this.#h0l, h1h = this.#h1h, h1l = this.#h1l, h2h = this.#h2h, h2l = this.#h2l, h3h = this.#h3h, h3l = this.#h3l, h4h = this.#h4h, h4l = this.#h4l, h5h = this.#h5h, h5l = this.#h5l, h6h = this.#h6h, h6l = this.#h6l, h7h = this.#h7h, h7l = this.#h7l, bits4 = this.#bits;
        const arr = [
            h0h >> 24 & 255,
            h0h >> 16 & 255,
            h0h >> 8 & 255,
            h0h & 255,
            h0l >> 24 & 255,
            h0l >> 16 & 255,
            h0l >> 8 & 255,
            h0l & 255,
            h1h >> 24 & 255,
            h1h >> 16 & 255,
            h1h >> 8 & 255,
            h1h & 255,
            h1l >> 24 & 255,
            h1l >> 16 & 255,
            h1l >> 8 & 255,
            h1l & 255,
            h2h >> 24 & 255,
            h2h >> 16 & 255,
            h2h >> 8 & 255,
            h2h & 255,
            h2l >> 24 & 255,
            h2l >> 16 & 255,
            h2l >> 8 & 255,
            h2l & 255,
            h3h >> 24 & 255,
            h3h >> 16 & 255,
            h3h >> 8 & 255,
            h3h & 255
        ];
        if (bits4 >= 256) {
            arr.push(h3l >> 24 & 255, h3l >> 16 & 255, h3l >> 8 & 255, h3l & 255);
        }
        if (bits4 >= 384) {
            arr.push(h4h >> 24 & 255, h4h >> 16 & 255, h4h >> 8 & 255, h4h & 255, h4l >> 24 & 255, h4l >> 16 & 255, h4l >> 8 & 255, h4l & 255, h5h >> 24 & 255, h5h >> 16 & 255, h5h >> 8 & 255, h5h & 255, h5l >> 24 & 255, h5l >> 16 & 255, h5l >> 8 & 255, h5l & 255);
        }
        if (bits4 === 512) {
            arr.push(h6h >> 24 & 255, h6h >> 16 & 255, h6h >> 8 & 255, h6h & 255, h6l >> 24 & 255, h6l >> 16 & 255, h6l >> 8 & 255, h6l & 255, h7h >> 24 & 255, h7h >> 16 & 255, h7h >> 8 & 255, h7h & 255, h7l >> 24 & 255, h7l >> 16 & 255, h7l >> 8 & 255, h7l & 255);
        }
        return arr;
    }
    array() {
        return this.digest();
    }
    arrayBuffer() {
        this.finalize();
        const bits4 = this.#bits;
        const buffer = new ArrayBuffer(bits4 / 8);
        const dataView = new DataView(buffer);
        dataView.setUint32(0, this.#h0h);
        dataView.setUint32(4, this.#h0l);
        dataView.setUint32(8, this.#h1h);
        dataView.setUint32(12, this.#h1l);
        dataView.setUint32(16, this.#h2h);
        dataView.setUint32(20, this.#h2l);
        dataView.setUint32(24, this.#h3h);
        if (bits4 >= 256) {
            dataView.setUint32(28, this.#h3l);
        }
        if (bits4 >= 384) {
            dataView.setUint32(32, this.#h4h);
            dataView.setUint32(36, this.#h4l);
            dataView.setUint32(40, this.#h5h);
            dataView.setUint32(44, this.#h5l);
        }
        if (bits4 === 512) {
            dataView.setUint32(48, this.#h6h);
            dataView.setUint32(52, this.#h6l);
            dataView.setUint32(56, this.#h7h);
            dataView.setUint32(60, this.#h7l);
        }
        return buffer;
    }
}
class HmacSha5121 extends Sha5121 {
    #inner;
    #bits;
    #oKeyPad;
    #sharedMemory;
    constructor(secretKey5, bits4 = 512, sharedMemory12 = false){
        super(bits4, sharedMemory12);
        let key8;
        if (secretKey5 instanceof ArrayBuffer) {
            key8 = new Uint8Array(secretKey5);
        } else if (typeof secretKey5 === "string") {
            const bytes = [];
            const length = secretKey5.length;
            let index = 0;
            let code7;
            for(let i6 = 0; i6 < length; ++i6){
                code7 = secretKey5.charCodeAt(i6);
                if (code7 < 128) {
                    bytes[index++] = code7;
                } else if (code7 < 2048) {
                    bytes[index++] = 192 | code7 >> 6;
                    bytes[index++] = 128 | code7 & 63;
                } else if (code7 < 55296 || code7 >= 57344) {
                    bytes[index++] = 224 | code7 >> 12;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                } else {
                    code7 = 65536 + ((code7 & 1023) << 10 | secretKey5.charCodeAt(++i6) & 1023);
                    bytes[index++] = 240 | code7 >> 18;
                    bytes[index++] = 128 | code7 >> 12 & 63;
                    bytes[index++] = 128 | code7 >> 6 & 63;
                    bytes[index++] = 128 | code7 & 63;
                }
            }
            key8 = bytes;
        } else {
            key8 = secretKey5;
        }
        if (key8.length > 128) {
            key8 = new Sha5121(bits4, true).update(key8).array();
        }
        const oKeyPad5 = [];
        const iKeyPad5 = [];
        for(let i6 = 0; i6 < 128; ++i6){
            const b = key8[i6] || 0;
            oKeyPad5[i6] = 92 ^ b;
            iKeyPad5[i6] = 54 ^ b;
        }
        this.update(iKeyPad5);
        this.#inner = true;
        this.#bits = bits4;
        this.#oKeyPad = oKeyPad5;
        this.#sharedMemory = sharedMemory12;
    }
    finalize() {
        super.finalize();
        if (this.#inner) {
            this.#inner = false;
            const innerHash = this.array();
            super.init(this.#bits, this.#sharedMemory);
            this.update(this.#oKeyPad);
            this.update(innerHash);
            super.finalize();
        }
    }
}
function digest(algorithm2, m) {
    if (algorithm2 === "sha1") {
        return new Uint8Array(new Sha11().update(m).arrayBuffer());
    } else if (algorithm2 === "sha256") {
        return new Uint8Array(new Sha2561().update(m).arrayBuffer());
    } else if (algorithm2 === "sha512") {
        return new Uint8Array(new Sha5121().update(m).arrayBuffer());
    }
    throw "Unsupport hash algorithm";
}
function digestLength(algorithm2) {
    if (algorithm2 === "sha512") return 64;
    if (algorithm2 === "sha256") return 32;
    return 20;
}
function i2osp(x88, length) {
    const t = new Uint8Array(length);
    for(let i7 = length - 1; i7 >= 0; i7--){
        if (x88 === 0n) break;
        t[i7] = Number(x88 & 255n);
        x88 = x88 >> 8n;
    }
    return t;
}
function os2ip(m) {
    let n = 0n;
    for (const c of m)n = (n << 8n) + BigInt(c);
    return n;
}
function mgf1(seed, length, hash1) {
    let counter = 0n;
    let output = [];
    while(output.length < length){
        const c = i2osp(counter, 4);
        const h = new Uint8Array(digest(hash1, new Uint8Array([
            ...seed,
            ...c
        ])));
        output = [
            ...output,
            ...h
        ];
        counter++;
    }
    return new Uint8Array(output.slice(0, length));
}
function xor(a, b) {
    const c = new Uint8Array(a.length);
    for(let i7 = 0; i7 < c.length; i7++){
        c[i7] = a[i7] ^ b[i7 % b.length];
    }
    return c;
}
function concat(...arg) {
    const length = arg.reduce((a, b)=>a + b.length
    , 0);
    const c = new Uint8Array(length);
    let ptr = 0;
    for(let i7 = 0; i7 < arg.length; i7++){
        c.set(arg[i7], ptr);
        ptr += arg[i7].length;
    }
    return c;
}
function random_bytes(length) {
    const n = new Uint8Array(length);
    for(let i7 = 0; i7 < length; i7++)n[i7] = (Math.random() * 254 | 0) + 1;
    return n;
}
function get_key_size(n) {
    const size_list = [
        64n,
        128n,
        256n,
        512n,
        1024n
    ];
    for (const size of size_list){
        if (n < 1n << size * 8n) return Number(size);
    }
    return 2048;
}
function base64_to_binary(b) {
    let binaryString = window.atob(b);
    let len = binaryString.length;
    let bytes = new Uint8Array(len);
    for(var i7 = 0; i7 < len; i7++){
        bytes[i7] = binaryString.charCodeAt(i7);
    }
    return bytes;
}
function eme_oaep_encode(label, m, k, algorithm2) {
    const labelHash = new Uint8Array(digest(algorithm2, label));
    const ps = new Uint8Array(k - labelHash.length * 2 - 2 - m.length);
    const db = concat(labelHash, ps, [
        1
    ], m);
    const seed = random_bytes(labelHash.length);
    const dbMask = mgf1(seed, k - labelHash.length - 1, algorithm2);
    const maskedDb = xor(db, dbMask);
    const seedMask = mgf1(maskedDb, labelHash.length, algorithm2);
    const maskedSeed = xor(seed, seedMask);
    return concat([
        0
    ], maskedSeed, maskedDb);
}
function eme_oaep_decode(label, c, k, algorithm2) {
    const labelHash = new Uint8Array(digest(algorithm2, label));
    const maskedSeed = c.slice(1, 1 + labelHash.length);
    const maskedDb = c.slice(1 + labelHash.length);
    const seedMask = mgf1(maskedDb, labelHash.length, algorithm2);
    const seed = xor(maskedSeed, seedMask);
    const dbMask = mgf1(seed, k - labelHash.length - 1, algorithm2);
    const db = xor(maskedDb, dbMask);
    let ptr = labelHash.length;
    while(ptr < db.length && db[ptr] === 0)ptr++;
    return db.slice(ptr + 1);
}
function ber_decode(bytes, from1, to) {
    return ber_next(bytes);
}
function ber_sequence(bytes, from1, length) {
    const end = from1 + length;
    let res = [];
    let ptr = from1;
    while(ptr < end){
        const next = ber_next(bytes, ptr);
        res.push(next);
        ptr += next.totalLength;
    }
    return res;
}
function ber_integer(bytes, from1, length) {
    let n = 0n;
    for (const b of bytes.slice(from1, from1 + length)){
        n = (n << 8n) + BigInt(b);
    }
    return n;
}
function ber_oid(bytes, from1, length) {
    const id = [
        bytes[from1] / 40 | 0,
        bytes[from1] % 40
    ];
    let value7 = 0;
    for (const b of bytes.slice(from1 + 1, from1 + length)){
        if (b > 128) value7 += value7 * 127 + (b - 128);
        else {
            value7 = value7 * 128 + b;
            id.push(value7);
            value7 = 0;
        }
    }
    return id.join(".");
}
function ber_unknown(bytes, from1, length) {
    return bytes.slice(from1, from1 + length);
}
function ber_simple(n) {
    if (Array.isArray(n.value)) return n.value.map((x88)=>ber_simple(x88)
    );
    return n.value;
}
function ber_next(bytes, from1, to) {
    if (!from1) from1 = 0;
    if (!to) to = bytes.length;
    let ptr = from1;
    const type1 = bytes[ptr++];
    let size = bytes[ptr++];
    if ((size & 128) > 0) {
        let ext = size - 128;
        size = 0;
        while((--ext) >= 0){
            size = (size << 8) + bytes[ptr++];
        }
    }
    let value7 = null;
    if (type1 === 48) {
        value7 = ber_sequence(bytes, ptr, size);
    } else if (type1 === 2) {
        value7 = ber_integer(bytes, ptr, size);
    } else if (type1 === 3) {
        value7 = ber_sequence(bytes, ptr + 1, size - 1);
    } else if (type1 === 5) {
        value7 = null;
    } else if (type1 === 6) {
        value7 = ber_oid(bytes, ptr, size);
    } else {
        value7 = ber_unknown(bytes, ptr, size);
    }
    return {
        totalLength: ptr - from1 + size,
        type: type1,
        length: size,
        value: value7
    };
}
class RawBinary extends Uint8Array {
    hex() {
        return [
            ...this
        ].map((x88)=>x88.toString(16).padStart(2, "0")
        ).join("");
    }
    binary() {
        return this;
    }
    base64() {
        return btoa(String.fromCharCode.apply(null, [
            ...this
        ]));
    }
    base64url() {
        let a = btoa(String.fromCharCode.apply(null, [
            ...this
        ])).replace(/=/g, "");
        a = a.replace(/\+/g, "-");
        a = a.replace(/\//g, "_");
        return a;
    }
    base32() {
        const lookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        const trim = [
            0,
            1,
            3,
            7,
            15,
            31,
            63,
            127,
            255
        ];
        let output = "";
        let bits5 = 0;
        let current = 0;
        for(let i7 = 0; i7 < this.length; i7++){
            current = (current << 8) + this[i7];
            bits5 += 8;
            while(bits5 >= 5){
                bits5 -= 5;
                output += lookup[current >> bits5];
                current = current & trim[bits5];
            }
        }
        if (bits5 > 0) {
            output += lookup[current << 5 - bits5];
        }
        return output;
    }
    toString() {
        return new TextDecoder().decode(this);
    }
}
function rsaep(n, e, m) {
    return power_mod(m, e, n);
}
function rsadp(key9, c) {
    if (!key9.d) throw "Invalid RSA key";
    if (key9.dp && key9.dq && key9.qi && key9.q && key9.p) {
        const m1 = power_mod(c % key9.p, key9.dp, key9.p);
        const m2 = power_mod(c % key9.q, key9.dq, key9.q);
        let h = 0n;
        if (m1 >= m2) {
            h = key9.qi * (m1 - m2) % key9.p;
        } else {
            h = key9.qi * (m1 - m2 + key9.p * (key9.p / key9.q)) % key9.p;
        }
        return (m2 + h * key9.q) % (key9.q * key9.p);
    } else {
        return power_mod(c, key9.d, key9.n);
    }
}
function rsa_oaep_encrypt(bytes, n, e, m, algorithm2) {
    const em = eme_oaep_encode(new Uint8Array(0), m, bytes, algorithm2);
    const msg2 = os2ip(em);
    const c = rsaep(n, e, msg2);
    return i2osp(c, bytes);
}
function rsa_oaep_decrypt(key9, c, algorithm2) {
    const em = rsadp(key9, os2ip(c));
    const m = eme_oaep_decode(new Uint8Array(0), i2osp(em, key9.length), key9.length, algorithm2);
    return m;
}
function rsa_pkcs1_encrypt(bytes, n, e, m) {
    const p = concat([
        0,
        2
    ], random_bytes(bytes - m.length - 3), [
        0
    ], m);
    const msg2 = os2ip(p);
    const c = rsaep(n, e, msg2);
    return i2osp(c, bytes);
}
function rsa_pkcs1_decrypt(key9, c) {
    const em = i2osp(rsadp(key9, os2ip(c)), key9.length);
    if (em[0] !== 0) throw "Decryption error";
    if (em[1] !== 2) throw "Decryption error";
    let psCursor = 2;
    for(; psCursor < em.length; psCursor++){
        if (em[psCursor] === 0) break;
    }
    if (psCursor < 10) throw "Decryption error";
    return em.slice(psCursor + 1);
}
function rsa_pkcs1_verify(key9, s, m) {
    if (!key9.e) throw "Invalid RSA key";
    let em = i2osp(rsaep(key9.n, key9.e, os2ip(s)), key9.length);
    if (em[0] !== 0) throw "Decryption error";
    if (em[1] !== 1) throw "Decryption error";
    let psCursor = 2;
    for(; psCursor < em.length; psCursor++){
        if (em[psCursor] === 0) break;
    }
    if (psCursor < 10) throw "Decryption error";
    em = em.slice(psCursor + 1);
    const ber = ber_simple(ber_decode(em));
    const decryptedMessage = ber[1];
    if (decryptedMessage.length !== m.length) return false;
    for(let i7 = 0; i7 < decryptedMessage.length; i7++){
        if (decryptedMessage[i7] !== m[i7]) return false;
    }
    return true;
}
function rsa_pkcs1_sign(bytes, n, d, message9, algorithm2) {
    const oid = [
        48,
        13,
        6,
        9,
        96,
        134,
        72,
        1,
        101,
        3,
        4,
        2,
        algorithm2 === "sha512" ? 3 : 1,
        5,
        0, 
    ];
    const der = [
        48,
        message9.length + 2 + oid.length,
        ...oid,
        4,
        message9.length,
        ...message9, 
    ];
    const ps = new Array(bytes - 3 - der.length).fill(255);
    const em = new Uint8Array([
        0,
        1,
        ...ps,
        0,
        ...der
    ]);
    const msg2 = os2ip(em);
    const c = rsaep(n, d, msg2);
    return new RawBinary(i2osp(c, bytes));
}
function emsa_pss_encode(m, emBits, sLen, algorithm2) {
    const mHash = digest(algorithm2, m);
    const hLen = mHash.length;
    const emLen = Math.ceil(emBits / 8);
    if (emLen < hLen + sLen + 2) throw "Encoding Error";
    const salt = new Uint8Array(sLen);
    crypto.getRandomValues(salt);
    const m1 = new Uint8Array([
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ...mHash,
        ...salt
    ]);
    const h = digest(algorithm2, m1);
    const ps = new Uint8Array(emLen - sLen - hLen - 2);
    const db = new Uint8Array([
        ...ps,
        1,
        ...salt
    ]);
    const dbMask = mgf1(h, emLen - hLen - 1, algorithm2);
    const maskedDB = xor(db, dbMask);
    const leftMost = 8 * emLen - emBits;
    maskedDB[0] = maskedDB[0] & 255 >> leftMost;
    return new Uint8Array([
        ...maskedDB,
        ...h,
        188
    ]);
}
function emsa_pss_verify(m, em, emBits, sLen, algorithm2) {
    const mHash = digest(algorithm2, m);
    const hLen = mHash.length;
    const emLen = Math.ceil(emBits / 8);
    if (emLen < hLen + sLen + 2) return false;
    if (em[em.length - 1] !== 188) return false;
    const maskedDB = em.slice(0, emLen - hLen - 1);
    const h = em.slice(emLen - hLen - 1, emLen - 1);
    const leftMost = 8 * emLen - emBits;
    if (maskedDB[0] >> 8 - leftMost != 0) return false;
    const dbMask = mgf1(h, emLen - hLen - 1, algorithm2);
    const db = xor(maskedDB, dbMask);
    db[0] = db[0] & 255 >> leftMost;
    for(let i7 = 1; i7 < emLen - hLen - sLen - 2; i7++){
        if (db[i7] !== 0) return false;
    }
    if (db[emLen - hLen - sLen - 2] !== 1) return false;
    const salt = db.slice(emLen - hLen - sLen - 1);
    const m1 = new Uint8Array([
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ...mHash,
        ...salt
    ]);
    const h1 = digest(algorithm2, m1);
    for(let i8 = 0; i8 < hLen; i8++){
        if (h1[i8] !== h[i8]) return false;
    }
    return true;
}
function rsassa_pss_sign(key9, m, algorithm2) {
    if (!key9.d) throw "Invalid RSA Key";
    const hLen = digestLength(algorithm2);
    let em = emsa_pss_encode(m, key9.length * 8 - 1, hLen, algorithm2);
    return new RawBinary(i2osp(rsaep(key9.n, key9.d, os2ip(em)), key9.length));
}
function rsassa_pss_verify(key9, m, signature, algorithm2) {
    if (!key9.e) throw "Invalid RSA Key";
    const hLen = digestLength(algorithm2);
    const em = i2osp(rsaep(key9.n, key9.e, os2ip(signature)), key9.length);
    return emsa_pss_verify(m, em, key9.length * 8 - 1, hLen, algorithm2);
}
class PureRSA {
    static async encrypt(key, message, options) {
        if (!key.e) throw "Invalid RSA key";
        if (options.padding === "oaep") {
            return new RawBinary(rsa_oaep_encrypt(key.length, key.n, key.e, message, options.hash));
        } else if (options.padding === "pkcs1") {
            return new RawBinary(rsa_pkcs1_encrypt(key.length, key.n, key.e, message));
        }
        throw "Invalid parameters";
    }
    static async decrypt(key, ciper, options) {
        if (!key.d) throw "Invalid RSA key";
        if (options.padding === "oaep") {
            return new RawBinary(rsa_oaep_decrypt(key, ciper, options.hash));
        } else if (options.padding === "pkcs1") {
            return new RawBinary(rsa_pkcs1_decrypt(key, ciper));
        }
        throw "Invalid parameters";
    }
    static async verify(key, signature, message, options) {
        if (!key.e) throw "Invalid RSA key";
        if (options.algorithm === "rsassa-pkcs1-v1_5") {
            return rsa_pkcs1_verify(key, signature, digest(options.hash, message));
        } else {
            return rsassa_pss_verify(key, message, signature, options.hash);
        }
    }
    static async sign(key, message, options) {
        if (!key.d) throw "You need private key to sign the message";
        if (options.algorithm === "rsassa-pkcs1-v1_5") {
            return rsa_pkcs1_sign(key.length, key.n, key.d, digest(options.hash, message), options.hash);
        } else {
            return rsassa_pss_sign(key, message, options.hash);
        }
    }
}
class encode4 {
    static hex(data) {
        if (data.length % 2 !== 0) throw "Invalid hex format";
        const output = new RawBinary(data.length >> 1);
        let ptr = 0;
        for(let i7 = 0; i7 < data.length; i7 += 2){
            output[ptr++] = parseInt(data.substr(i7, 2), 16);
        }
        return output;
    }
    static bigint(n) {
        const bytes = [];
        while(n > 0){
            bytes.push(Number(n & 255n));
            n = n >> 8n;
        }
        bytes.reverse();
        return new RawBinary(bytes);
    }
    static string(data) {
        return new RawBinary(new TextEncoder().encode(data));
    }
    static base64(data) {
        return new RawBinary(Uint8Array.from(atob(data), (c)=>c.charCodeAt(0)
        ));
    }
    static base64url(data) {
        let input5 = data.replace(/-/g, "+").replace(/_/g, "/");
        const pad = input5.length % 4;
        if (pad) {
            if (pad === 1) throw "Invalid length";
            input5 += new Array(5 - pad).join("=");
        }
        return encode4.base64(input5);
    }
    static binary(data) {
        return new RawBinary(data);
    }
    static base32(data) {
        data = data.toUpperCase();
        data = data.replace(/=+$/g, "");
        const lookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        const size = data.length * 5 >> 3;
        const output = new RawBinary(size);
        let ptr = 0;
        let bits5 = 0;
        let current = 0;
        for(let i7 = 0; i7 < data.length; i7++){
            const value7 = lookup.indexOf(data[i7]);
            if (value7 < 0) throw "Invalid base32 format";
            current = (current << 5) + value7;
            bits5 += 5;
            if (bits5 >= 8) {
                bits5 -= 8;
                const t = current >> bits5;
                current -= t << bits5;
                output[ptr++] = t;
            }
        }
        return output;
    }
}
function detect_format(key9) {
    if (typeof key9 === "object") {
        if (key9.kty === "RSA") return "jwk";
    } else if (typeof key9 === "string") {
        if (key9.substr(0, "-----".length) === "-----") return "pem";
    }
    throw new TypeError("Unsupported key format");
}
function rsa_import_jwk(key9) {
    if (typeof key9 !== "object") throw new TypeError("Invalid JWK format");
    if (!key9.n) throw new TypeError("RSA key requires n");
    const n = os2ip(encode4.base64url(key9.n));
    return {
        e: key9.e ? os2ip(encode4.base64url(key9.e)) : undefined,
        n: os2ip(encode4.base64url(key9.n)),
        d: key9.d ? os2ip(encode4.base64url(key9.d)) : undefined,
        p: key9.p ? os2ip(encode4.base64url(key9.p)) : undefined,
        q: key9.q ? os2ip(encode4.base64url(key9.q)) : undefined,
        dp: key9.dp ? os2ip(encode4.base64url(key9.dp)) : undefined,
        dq: key9.dq ? os2ip(encode4.base64url(key9.dq)) : undefined,
        qi: key9.qi ? os2ip(encode4.base64url(key9.qi)) : undefined,
        length: get_key_size(n)
    };
}
function rsa_import_pem_cert(key9) {
    const trimmedKey = key9.substr(27, key9.length - 53);
    const parseKey = ber_simple(ber_decode(base64_to_binary(trimmedKey)));
    return {
        length: get_key_size(parseKey[0][5][1][0][0]),
        n: parseKey[0][5][1][0][0],
        e: parseKey[0][5][1][0][1]
    };
}
function rsa_import_pem_private(key9) {
    const trimmedKey = key9.substr(31, key9.length - 61);
    const parseKey = ber_simple(ber_decode(base64_to_binary(trimmedKey)));
    return {
        n: parseKey[1],
        d: parseKey[3],
        e: parseKey[2],
        p: parseKey[4],
        q: parseKey[5],
        dp: parseKey[6],
        dq: parseKey[7],
        qi: parseKey[8],
        length: get_key_size(parseKey[1])
    };
}
function rsa_import_pem_private_pkcs8(key9) {
    const trimmedKey = key9.substr(27, key9.length - 57);
    const parseWrappedKey = ber_simple(ber_decode(base64_to_binary(trimmedKey)));
    const parseKey = ber_simple(ber_decode(parseWrappedKey[2]));
    return {
        n: parseKey[1],
        d: parseKey[3],
        e: parseKey[2],
        p: parseKey[4],
        q: parseKey[5],
        dp: parseKey[6],
        dq: parseKey[7],
        qi: parseKey[8],
        length: get_key_size(parseKey[1])
    };
}
function rsa_import_pem_public(key9) {
    const trimmedKey = key9.substr(26, key9.length - 51);
    const parseKey = ber_simple(ber_decode(base64_to_binary(trimmedKey)));
    return {
        length: get_key_size(parseKey[1][0][0]),
        n: parseKey[1][0][0],
        e: parseKey[1][0][1]
    };
}
function rsa_import_pem(key9) {
    if (typeof key9 !== "string") throw new TypeError("PEM key must be string");
    const trimmedKey = key9.trim();
    const maps = [
        [
            "-----BEGIN RSA PRIVATE KEY-----",
            rsa_import_pem_private
        ],
        [
            "-----BEGIN PRIVATE KEY-----",
            rsa_import_pem_private_pkcs8
        ],
        [
            "-----BEGIN PUBLIC KEY-----",
            rsa_import_pem_public
        ],
        [
            "-----BEGIN CERTIFICATE-----",
            rsa_import_pem_cert
        ], 
    ];
    for (const [prefix, func] of maps){
        if (trimmedKey.indexOf(prefix) === 0) return func(trimmedKey);
    }
    throw new TypeError("Unsupported key format");
}
function rsa_import_key(key9, format4) {
    const finalFormat = format4 === "auto" ? detect_format(key9) : format4;
    if (finalFormat === "jwk") return rsa_import_jwk(key9);
    if (finalFormat === "pem") return rsa_import_pem(key9);
    throw new TypeError("Unsupported key format");
}
function createSizeBuffer(size) {
    if (size <= 127) return new Uint8Array([
        size
    ]);
    const bytes = [];
    while(size > 0){
        bytes.push(size & 255);
        size = size >> 8;
    }
    bytes.reverse();
    return new Uint8Array([
        128 + bytes.length,
        ...bytes
    ]);
}
class BER {
    static createSequence(children) {
        const size = children.reduce((accumlatedSize, child)=>accumlatedSize + child.length
        , 0);
        return new Uint8Array([
            48,
            ...createSizeBuffer(size),
            ...children.reduce((buffer, child)=>[
                    ...buffer,
                    ...child
                ]
            , []), 
        ]);
    }
    static createNull() {
        return new Uint8Array([
            5,
            0
        ]);
    }
    static createBoolean(value) {
        return new Uint8Array([
            1,
            1,
            value ? 1 : 0
        ]);
    }
    static createInteger(value) {
        if (typeof value === "number") return BER.createBigInteger(BigInt(value));
        return BER.createBigInteger(value);
    }
    static createBigInteger(value) {
        if (value === 0n) return new Uint8Array([
            2,
            1,
            0
        ]);
        const isNegative = value < 0;
        const content = [];
        let n = isNegative ? -value : value;
        while(n > 0n){
            content.push(Number(n & 255n));
            n = n >> 8n;
        }
        if (!isNegative) {
            if (content[content.length - 1] & 128) content.push(0);
        } else {
            for(let i7 = 0; i7 < content.length; i7++)content[i7] = 256 - content[i7];
            if (!(content[content.length - 1] & 128)) content.push(255);
        }
        content.reverse();
        return new Uint8Array([
            2,
            ...createSizeBuffer(content.length),
            ...content, 
        ]);
    }
    static createBitString(value) {
        return new Uint8Array([
            3,
            ...createSizeBuffer(value.length + 1),
            0,
            ...value, 
        ]);
    }
}
function add_line_break(base64_str) {
    const lines = [];
    for(let i7 = 0; i7 < base64_str.length; i7 += 64){
        lines.push(base64_str.substr(i7, 64));
    }
    return lines.join("\n");
}
function rsa_export_pkcs8_public(key9) {
    const content = BER.createSequence([
        BER.createSequence([
            new Uint8Array([
                6,
                9,
                42,
                134,
                72,
                134,
                247,
                13,
                1,
                1,
                1, 
            ]),
            BER.createNull(), 
        ]),
        BER.createBitString(BER.createSequence([
            BER.createInteger(key9.n),
            BER.createInteger(key9.e || 0n), 
        ])), 
    ]);
    return "-----BEGIN PUBLIC KEY-----\n" + add_line_break(encode4.binary(content).base64()) + "\n-----END PUBLIC KEY-----\n";
}
function rsa_export_pkcs8_private(key9) {
    const content = BER.createSequence([
        BER.createInteger(0),
        BER.createInteger(key9.n),
        BER.createInteger(key9.e || 0n),
        BER.createInteger(key9.d || 0n),
        BER.createInteger(key9.p || 0n),
        BER.createInteger(key9.q || 0n),
        BER.createInteger(key9.dp || 0n),
        BER.createInteger(key9.dq || 0n),
        BER.createInteger(key9.qi || 0n), 
    ]);
    const ber = encode4.binary(content).base64();
    return "-----BEGIN RSA PRIVATE KEY-----\n" + add_line_break(ber) + "\n-----END RSA PRIVATE KEY-----\n";
}
class RSAKey {
    n;
    e;
    d;
    p;
    q;
    dp;
    dq;
    qi;
    length;
    constructor(params){
        this.n = params.n;
        this.e = params.e;
        this.d = params.d;
        this.p = params.p;
        this.q = params.q;
        this.dp = params.dp;
        this.dq = params.dq;
        this.qi = params.qi;
        this.length = params.length;
    }
    pem() {
        if (this.d) {
            return rsa_export_pkcs8_private(this);
        } else {
            return rsa_export_pkcs8_public(this);
        }
    }
    jwk() {
        let jwk = {
            kty: "RSA",
            n: encode4.bigint(this.n).base64url()
        };
        if (this.d) jwk = {
            ...jwk,
            d: encode4.bigint(this.d).base64url()
        };
        if (this.e) jwk = {
            ...jwk,
            e: encode4.bigint(this.e).base64url()
        };
        if (this.p) jwk = {
            ...jwk,
            p: encode4.bigint(this.p).base64url()
        };
        if (this.q) jwk = {
            ...jwk,
            q: encode4.bigint(this.q).base64url()
        };
        if (this.dp) jwk = {
            ...jwk,
            dp: encode4.bigint(this.dp).base64url()
        };
        if (this.dq) jwk = {
            ...jwk,
            dq: encode4.bigint(this.dq).base64url()
        };
        if (this.qi) jwk = {
            ...jwk,
            qi: encode4.bigint(this.qi).base64url()
        };
        return jwk;
    }
}
function computeMessage(m) {
    return typeof m === "string" ? new TextEncoder().encode(m) : m;
}
function computeOption(options9) {
    return {
        hash: "sha1",
        padding: "oaep",
        ...options9
    };
}
class RSA {
    key;
    constructor(key9){
        this.key = key9;
    }
    async encrypt(m, options) {
        const computedOption = computeOption(options);
        const func = WebCryptoRSA.isSupported(computedOption) ? WebCryptoRSA.encrypt : PureRSA.encrypt;
        return new RawBinary(await func(this.key, computeMessage(m), computedOption));
    }
    async decrypt(m, options) {
        const computedOption = computeOption(options);
        const func = WebCryptoRSA.isSupported(computedOption) ? WebCryptoRSA.decrypt : PureRSA.decrypt;
        return new RawBinary(await func(this.key, m, computedOption));
    }
    async verify(signature, message, options) {
        const computedOption = {
            algorithm: "rsassa-pkcs1-v1_5",
            hash: "sha256",
            ...options
        };
        return await PureRSA.verify(this.key, signature, computeMessage(message), computedOption);
    }
    async sign(message, options) {
        const computedOption = {
            algorithm: "rsassa-pkcs1-v1_5",
            hash: "sha256",
            ...options
        };
        return await PureRSA.sign(this.key, computeMessage(message), computedOption);
    }
    static parseKey(key, format = "auto") {
        return this.importKey(key, format);
    }
    static importKey(key, format = "auto") {
        return new RSAKey(rsa_import_key(key, format));
    }
}
function assertNever(alg1, message9) {
    throw new RangeError(message9);
}
function convertHexToBase64url(input5) {
    return mod5.encode(decodeString1(input5));
}
async function encrypt(algorithm2, key10, message9) {
    switch(algorithm2){
        case "none":
            return "";
        case "HS256":
            return new HmacSha256(key10).update(message9).toString();
        case "HS512":
            return new HmacSha512(key10).update(message9).toString();
        case "RS256":
            return (await new RSA(RSA.parseKey(key10)).sign(message9, {
                algorithm: "rsassa-pkcs1-v1_5",
                hash: "sha256"
            })).hex();
        case "RS512":
            return (await new RSA(RSA.parseKey(key10)).sign(message9, {
                algorithm: "rsassa-pkcs1-v1_5",
                hash: "sha512"
            })).hex();
        case "PS256":
            return (await new RSA(RSA.parseKey(key10)).sign(message9, {
                algorithm: "rsassa-pss",
                hash: "sha256"
            })).hex();
        case "PS512":
            return (await new RSA(RSA.parseKey(key10)).sign(message9, {
                algorithm: "rsassa-pss",
                hash: "sha512"
            })).hex();
        default:
            assertNever(algorithm2, "no matching crypto algorithm in the header: " + algorithm2);
    }
}
async function create(algorithm2, key10, input5) {
    return convertHexToBase64url(await encrypt(algorithm2, key10, input5));
}
const encoder = new TextEncoder();
const decoder2 = new TextDecoder();
function createSigningInput(header, payload) {
    return `${mod5.encode(encoder.encode(JSON.stringify(header)))}.${mod5.encode(encoder.encode(JSON.stringify(payload)))}`;
}
async function create1(header, payload, key10) {
    const signingInput = createSigningInput(header, payload);
    const signature = await create(header.alg, key10, signingInput);
    return `${signingInput}.${signature}`;
}
const sign = (payload, key10, { header  })=>create1(header, payload, key10)
;
function _defineProperty$1(obj, key10, value7) {
    if (key10 in obj) {
        Object.defineProperty(obj, key10, {
            value: value7,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key10] = value7;
    }
    return obj;
}
var HttpMethod;
(function(HttpMethod1) {
    HttpMethod1["GET"] = "get";
    HttpMethod1["POST"] = "post";
})(HttpMethod || (HttpMethod = {
}));
const REGION_ENVIRONMENT_VARIABLE = "REGION_NAME";
const Hash2 = {
    SHA256: "sha256"
};
const CharSet = {
    CV_CHARSET: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
};
const Constants$1 = {
    MSAL_SKU: "msal.js.node",
    JWT_BEARER_ASSERTION_TYPE: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
};
var ApiId;
(function(ApiId1) {
    ApiId1[ApiId1["acquireTokenSilent"] = 62] = "acquireTokenSilent";
    ApiId1[ApiId1["acquireTokenByUsernamePassword"] = 371] = "acquireTokenByUsernamePassword";
    ApiId1[ApiId1["acquireTokenByDeviceCode"] = 671] = "acquireTokenByDeviceCode";
    ApiId1[ApiId1["acquireTokenByClientCredential"] = 771] = "acquireTokenByClientCredential";
    ApiId1[ApiId1["acquireTokenByCode"] = 871] = "acquireTokenByCode";
    ApiId1[ApiId1["acquireTokenByRefreshToken"] = 872] = "acquireTokenByRefreshToken";
})(ApiId || (ApiId = {
}));
const JwtConstants = {
    ALGORITHM: "alg",
    RSA_256: "RS256",
    X5T: "x5t",
    X5C: "x5c",
    AUDIENCE: "aud",
    EXPIRATION_TIME: "exp",
    ISSUER: "iss",
    SUBJECT: "sub",
    NOT_BEFORE: "nbf",
    JWT_ID: "jti"
};
function _defineProperty(obj, key10, value7) {
    if (key10 in obj) {
        Object.defineProperty(obj, key10, {
            value: value7,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key10] = value7;
    }
    return obj;
}
const Constants = {
    LIBRARY_NAME: "MSAL.JS",
    SKU: "msal.js.common",
    CACHE_PREFIX: "msal",
    DEFAULT_AUTHORITY: "https://login.microsoftonline.com/common/",
    DEFAULT_AUTHORITY_HOST: "login.microsoftonline.com",
    ADFS: "adfs",
    AAD_INSTANCE_DISCOVERY_ENDPT: "https://login.microsoftonline.com/common/discovery/instance?api-version=1.1&authorization_endpoint=",
    RESOURCE_DELIM: "|",
    NO_ACCOUNT: "NO_ACCOUNT",
    CLAIMS: "claims",
    CONSUMER_UTID: "9188040d-6c67-4c5b-b112-36a304b66dad",
    OPENID_SCOPE: "openid",
    PROFILE_SCOPE: "profile",
    OFFLINE_ACCESS_SCOPE: "offline_access",
    EMAIL_SCOPE: "email",
    CODE_RESPONSE_TYPE: "code",
    CODE_GRANT_TYPE: "authorization_code",
    RT_GRANT_TYPE: "refresh_token",
    FRAGMENT_RESPONSE_MODE: "fragment",
    S256_CODE_CHALLENGE_METHOD: "S256",
    URL_FORM_CONTENT_TYPE: "application/x-www-form-urlencoded;charset=utf-8",
    AUTHORIZATION_PENDING: "authorization_pending",
    NOT_DEFINED: "not_defined",
    EMPTY_STRING: "",
    FORWARD_SLASH: "/",
    IMDS_ENDPOINT: "http://169.254.169.254/metadata/instance/compute/location",
    IMDS_VERSION: "2020-06-01",
    IMDS_TIMEOUT: 2000,
    AZURE_REGION_AUTO_DISCOVER_FLAG: "AUTO_DISCOVER",
    REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX: "login.microsoft.com",
    KNOWN_PUBLIC_CLOUDS: [
        "login.microsoftonline.com",
        "login.windows.net",
        "login.microsoft.com",
        "sts.windows.net"
    ]
};
const OIDC_DEFAULT_SCOPES = [
    Constants.OPENID_SCOPE,
    Constants.PROFILE_SCOPE,
    Constants.OFFLINE_ACCESS_SCOPE
];
const OIDC_SCOPES = [
    ...OIDC_DEFAULT_SCOPES,
    Constants.EMAIL_SCOPE
];
var HeaderNames;
(function(HeaderNames1) {
    HeaderNames1["CONTENT_TYPE"] = "Content-Type";
    HeaderNames1["RETRY_AFTER"] = "Retry-After";
})(HeaderNames || (HeaderNames = {
}));
var PersistentCacheKeys;
(function(PersistentCacheKeys1) {
    PersistentCacheKeys1["ID_TOKEN"] = "idtoken";
    PersistentCacheKeys1["CLIENT_INFO"] = "client.info";
    PersistentCacheKeys1["ADAL_ID_TOKEN"] = "adal.idtoken";
    PersistentCacheKeys1["ERROR"] = "error";
    PersistentCacheKeys1["ERROR_DESC"] = "error.description";
})(PersistentCacheKeys || (PersistentCacheKeys = {
}));
var AADAuthorityConstants;
(function(AADAuthorityConstants1) {
    AADAuthorityConstants1["COMMON"] = "common";
    AADAuthorityConstants1["ORGANIZATIONS"] = "organizations";
    AADAuthorityConstants1["CONSUMERS"] = "consumers";
})(AADAuthorityConstants || (AADAuthorityConstants = {
}));
var AADServerParamKeys;
(function(AADServerParamKeys1) {
    AADServerParamKeys1["CLIENT_ID"] = "client_id";
    AADServerParamKeys1["REDIRECT_URI"] = "redirect_uri";
    AADServerParamKeys1["RESPONSE_TYPE"] = "response_type";
    AADServerParamKeys1["RESPONSE_MODE"] = "response_mode";
    AADServerParamKeys1["GRANT_TYPE"] = "grant_type";
    AADServerParamKeys1["CLAIMS"] = "claims";
    AADServerParamKeys1["SCOPE"] = "scope";
    AADServerParamKeys1["ERROR"] = "error";
    AADServerParamKeys1["ERROR_DESCRIPTION"] = "error_description";
    AADServerParamKeys1["ACCESS_TOKEN"] = "access_token";
    AADServerParamKeys1["ID_TOKEN"] = "id_token";
    AADServerParamKeys1["REFRESH_TOKEN"] = "refresh_token";
    AADServerParamKeys1["EXPIRES_IN"] = "expires_in";
    AADServerParamKeys1["STATE"] = "state";
    AADServerParamKeys1["NONCE"] = "nonce";
    AADServerParamKeys1["PROMPT"] = "prompt";
    AADServerParamKeys1["SESSION_STATE"] = "session_state";
    AADServerParamKeys1["CLIENT_INFO"] = "client_info";
    AADServerParamKeys1["CODE"] = "code";
    AADServerParamKeys1["CODE_CHALLENGE"] = "code_challenge";
    AADServerParamKeys1["CODE_CHALLENGE_METHOD"] = "code_challenge_method";
    AADServerParamKeys1["CODE_VERIFIER"] = "code_verifier";
    AADServerParamKeys1["CLIENT_REQUEST_ID"] = "client-request-id";
    AADServerParamKeys1["X_CLIENT_SKU"] = "x-client-SKU";
    AADServerParamKeys1["X_CLIENT_VER"] = "x-client-VER";
    AADServerParamKeys1["X_CLIENT_OS"] = "x-client-OS";
    AADServerParamKeys1["X_CLIENT_CPU"] = "x-client-CPU";
    AADServerParamKeys1["X_CLIENT_CURR_TELEM"] = "x-client-current-telemetry";
    AADServerParamKeys1["X_CLIENT_LAST_TELEM"] = "x-client-last-telemetry";
    AADServerParamKeys1["X_MS_LIB_CAPABILITY"] = "x-ms-lib-capability";
    AADServerParamKeys1["POST_LOGOUT_URI"] = "post_logout_redirect_uri";
    AADServerParamKeys1["ID_TOKEN_HINT"] = "id_token_hint";
    AADServerParamKeys1["DEVICE_CODE"] = "device_code";
    AADServerParamKeys1["CLIENT_SECRET"] = "client_secret";
    AADServerParamKeys1["CLIENT_ASSERTION"] = "client_assertion";
    AADServerParamKeys1["CLIENT_ASSERTION_TYPE"] = "client_assertion_type";
    AADServerParamKeys1["TOKEN_TYPE"] = "token_type";
    AADServerParamKeys1["REQ_CNF"] = "req_cnf";
    AADServerParamKeys1["OBO_ASSERTION"] = "assertion";
    AADServerParamKeys1["REQUESTED_TOKEN_USE"] = "requested_token_use";
    AADServerParamKeys1["ON_BEHALF_OF"] = "on_behalf_of";
    AADServerParamKeys1["FOCI"] = "foci";
})(AADServerParamKeys || (AADServerParamKeys = {
}));
var ClaimsRequestKeys;
(function(ClaimsRequestKeys1) {
    ClaimsRequestKeys1["ACCESS_TOKEN"] = "access_token";
    ClaimsRequestKeys1["XMS_CC"] = "xms_cc";
})(ClaimsRequestKeys || (ClaimsRequestKeys = {
}));
const PromptValue1 = {
    LOGIN: "login",
    SELECT_ACCOUNT: "select_account",
    CONSENT: "consent",
    NONE: "none"
};
var SSOTypes;
(function(SSOTypes1) {
    SSOTypes1["ACCOUNT"] = "account";
    SSOTypes1["SID"] = "sid";
    SSOTypes1["LOGIN_HINT"] = "login_hint";
    SSOTypes1["ID_TOKEN"] = "id_token";
    SSOTypes1["DOMAIN_HINT"] = "domain_hint";
    SSOTypes1["ORGANIZATIONS"] = "organizations";
    SSOTypes1["CONSUMERS"] = "consumers";
    SSOTypes1["ACCOUNT_ID"] = "accountIdentifier";
    SSOTypes1["HOMEACCOUNT_ID"] = "homeAccountIdentifier";
})(SSOTypes || (SSOTypes = {
}));
[
    SSOTypes.SID,
    SSOTypes.LOGIN_HINT
];
const CodeChallengeMethodValues = {
    PLAIN: "plain",
    S256: "S256"
};
var ResponseMode1;
(function(ResponseMode1) {
    ResponseMode1["QUERY"] = "query";
    ResponseMode1["FRAGMENT"] = "fragment";
    ResponseMode1["FORM_POST"] = "form_post";
})(ResponseMode1 || (ResponseMode1 = {
}));
var GrantType;
(function(GrantType1) {
    GrantType1["IMPLICIT_GRANT"] = "implicit";
    GrantType1["AUTHORIZATION_CODE_GRANT"] = "authorization_code";
    GrantType1["CLIENT_CREDENTIALS_GRANT"] = "client_credentials";
    GrantType1["RESOURCE_OWNER_PASSWORD_GRANT"] = "password";
    GrantType1["REFRESH_TOKEN_GRANT"] = "refresh_token";
    GrantType1["DEVICE_CODE_GRANT"] = "device_code";
    GrantType1["JWT_BEARER"] = "urn:ietf:params:oauth:grant-type:jwt-bearer";
})(GrantType || (GrantType = {
}));
var CacheAccountType;
(function(CacheAccountType1) {
    CacheAccountType1["MSSTS_ACCOUNT_TYPE"] = "MSSTS";
    CacheAccountType1["ADFS_ACCOUNT_TYPE"] = "ADFS";
    CacheAccountType1["MSAV1_ACCOUNT_TYPE"] = "MSA";
    CacheAccountType1["GENERIC_ACCOUNT_TYPE"] = "Generic";
})(CacheAccountType || (CacheAccountType = {
}));
var Separators;
(function(Separators1) {
    Separators1["CACHE_KEY_SEPARATOR"] = "-";
    Separators1["CLIENT_INFO_SEPARATOR"] = ".";
})(Separators || (Separators = {
}));
var CredentialType;
(function(CredentialType1) {
    CredentialType1["ID_TOKEN"] = "IdToken";
    CredentialType1["ACCESS_TOKEN"] = "AccessToken";
    CredentialType1["ACCESS_TOKEN_WITH_AUTH_SCHEME"] = "AccessToken_With_AuthScheme";
    CredentialType1["REFRESH_TOKEN"] = "RefreshToken";
})(CredentialType || (CredentialType = {
}));
var CacheSchemaType;
(function(CacheSchemaType1) {
    CacheSchemaType1["ACCOUNT"] = "Account";
    CacheSchemaType1["CREDENTIAL"] = "Credential";
    CacheSchemaType1["ID_TOKEN"] = "IdToken";
    CacheSchemaType1["ACCESS_TOKEN"] = "AccessToken";
    CacheSchemaType1["REFRESH_TOKEN"] = "RefreshToken";
    CacheSchemaType1["APP_METADATA"] = "AppMetadata";
    CacheSchemaType1["TEMPORARY"] = "TempCache";
    CacheSchemaType1["TELEMETRY"] = "Telemetry";
    CacheSchemaType1["UNDEFINED"] = "Undefined";
    CacheSchemaType1["THROTTLING"] = "Throttling";
})(CacheSchemaType || (CacheSchemaType = {
}));
var CacheType;
(function(CacheType1) {
    CacheType1[CacheType1["ADFS"] = 1001] = "ADFS";
    CacheType1[CacheType1["MSA"] = 1002] = "MSA";
    CacheType1[CacheType1["MSSTS"] = 1003] = "MSSTS";
    CacheType1[CacheType1["GENERIC"] = 1004] = "GENERIC";
    CacheType1[CacheType1["ACCESS_TOKEN"] = 2001] = "ACCESS_TOKEN";
    CacheType1[CacheType1["REFRESH_TOKEN"] = 2002] = "REFRESH_TOKEN";
    CacheType1[CacheType1["ID_TOKEN"] = 2003] = "ID_TOKEN";
    CacheType1[CacheType1["APP_METADATA"] = 3001] = "APP_METADATA";
    CacheType1[CacheType1["UNDEFINED"] = 9999] = "UNDEFINED";
})(CacheType || (CacheType = {
}));
const APP_METADATA = "appmetadata";
const ClientInfo = "client_info";
const THE_FAMILY_ID = "1";
const AUTHORITY_METADATA_CONSTANTS = {
    CACHE_KEY: "authority-metadata",
    REFRESH_TIME_SECONDS: 3600 * 24
};
var AuthorityMetadataSource;
(function(AuthorityMetadataSource1) {
    AuthorityMetadataSource1["CONFIG"] = "config";
    AuthorityMetadataSource1["CACHE"] = "cache";
    AuthorityMetadataSource1["NETWORK"] = "network";
})(AuthorityMetadataSource || (AuthorityMetadataSource = {
}));
const SERVER_TELEM_CONSTANTS = {
    SCHEMA_VERSION: 2,
    MAX_CUR_HEADER_BYTES: 80,
    MAX_LAST_HEADER_BYTES: 330,
    MAX_CACHED_ERRORS: 50,
    CACHE_KEY: "server-telemetry",
    CATEGORY_SEPARATOR: "|",
    VALUE_SEPARATOR: ",",
    OVERFLOW_TRUE: "1",
    OVERFLOW_FALSE: "0",
    UNKNOWN_ERROR: "unknown_error"
};
var AuthenticationScheme;
(function(AuthenticationScheme1) {
    AuthenticationScheme1["POP"] = "pop";
    AuthenticationScheme1["BEARER"] = "Bearer";
})(AuthenticationScheme || (AuthenticationScheme = {
}));
const ThrottlingConstants = {
    DEFAULT_THROTTLE_TIME_SECONDS: 60,
    DEFAULT_MAX_THROTTLE_TIME_SECONDS: 3600,
    THROTTLING_PREFIX: "throttling",
    X_MS_LIB_CAPABILITY_VALUE: "retry-after, h429"
};
const Errors = {
    INVALID_GRANT_ERROR: "invalid_grant",
    CLIENT_MISMATCH_ERROR: "client_mismatch"
};
var PasswordGrantConstants;
(function(PasswordGrantConstants1) {
    PasswordGrantConstants1["username"] = "username";
    PasswordGrantConstants1["password"] = "password";
})(PasswordGrantConstants || (PasswordGrantConstants = {
}));
var ResponseCodes;
(function(ResponseCodes1) {
    ResponseCodes1[ResponseCodes1["httpSuccess"] = 200] = "httpSuccess";
    ResponseCodes1[ResponseCodes1["httpBadRequest"] = 400] = "httpBadRequest";
})(ResponseCodes || (ResponseCodes = {
}));
const AuthErrorMessage1 = {
    unexpectedError: {
        code: "unexpected_error",
        desc: "Unexpected error in authentication."
    }
};
class AuthError1 extends Error {
    constructor(errorCode5, errorMessage, suberror){
        const errorString1 = errorMessage ? `${errorCode5}: ${errorMessage}` : errorCode5;
        super(errorString1);
        Object.setPrototypeOf(this, AuthError1.prototype);
        this.errorCode = errorCode5 || Constants.EMPTY_STRING;
        this.errorMessage = errorMessage || "";
        this.subError = suberror || "";
        this.name = "AuthError";
    }
    static createUnexpectedError(errDesc) {
        return new AuthError1(AuthErrorMessage1.unexpectedError.code, `${AuthErrorMessage1.unexpectedError.desc}: ${errDesc}`);
    }
}
const DEFAULT_CRYPTO_IMPLEMENTATION = {
    createNewGuid: ()=>{
        const notImplErr = "Crypto interface - createNewGuid() has not been implemented";
        throw AuthError1.createUnexpectedError(notImplErr);
    },
    base64Decode: ()=>{
        const notImplErr = "Crypto interface - base64Decode() has not been implemented";
        throw AuthError1.createUnexpectedError(notImplErr);
    },
    base64Encode: ()=>{
        const notImplErr = "Crypto interface - base64Encode() has not been implemented";
        throw AuthError1.createUnexpectedError(notImplErr);
    },
    async generatePkceCodes () {
        const notImplErr = "Crypto interface - generatePkceCodes() has not been implemented";
        throw AuthError1.createUnexpectedError(notImplErr);
    },
    async getPublicKeyThumbprint () {
        const notImplErr = "Crypto interface - getPublicKeyThumbprint() has not been implemented";
        throw AuthError1.createUnexpectedError(notImplErr);
    },
    async signJwt () {
        const notImplErr = "Crypto interface - signJwt() has not been implemented";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
};
const ClientAuthErrorMessage1 = {
    clientInfoDecodingError: {
        code: "client_info_decoding_error",
        desc: "The client info could not be parsed/decoded correctly. Please review the trace to determine the root cause."
    },
    clientInfoEmptyError: {
        code: "client_info_empty_error",
        desc: "The client info was empty. Please review the trace to determine the root cause."
    },
    tokenParsingError: {
        code: "token_parsing_error",
        desc: "Token cannot be parsed. Please review stack trace to determine root cause."
    },
    nullOrEmptyToken: {
        code: "null_or_empty_token",
        desc: "The token is null or empty. Please review the trace to determine the root cause."
    },
    endpointResolutionError: {
        code: "endpoints_resolution_error",
        desc: "Error: could not resolve endpoints. Please check network and try again."
    },
    networkError: {
        code: "network_error",
        desc: "Network request failed. Please check network trace to determine root cause."
    },
    unableToGetOpenidConfigError: {
        code: "openid_config_error",
        desc: "Could not retrieve endpoints. Check your authority and verify the .well-known/openid-configuration endpoint returns the required endpoints."
    },
    hashNotDeserialized: {
        code: "hash_not_deserialized",
        desc: "The hash parameters could not be deserialized. Please review the trace to determine the root cause."
    },
    blankGuidGenerated: {
        code: "blank_guid_generated",
        desc: "The guid generated was blank. Please review the trace to determine the root cause."
    },
    invalidStateError: {
        code: "invalid_state",
        desc: "State was not the expected format. Please check the logs to determine whether the request was sent using ProtocolUtils.setRequestState()."
    },
    stateMismatchError: {
        code: "state_mismatch",
        desc: "State mismatch error. Please check your network. Continued requests may cause cache overflow."
    },
    stateNotFoundError: {
        code: "state_not_found",
        desc: "State not found"
    },
    nonceMismatchError: {
        code: "nonce_mismatch",
        desc: "Nonce mismatch error. This may be caused by a race condition in concurrent requests."
    },
    nonceNotFoundError: {
        code: "nonce_not_found",
        desc: "nonce not found"
    },
    noTokensFoundError: {
        code: "no_tokens_found",
        desc: "No tokens were found for the given scopes, and no authorization code was passed to acquireToken. You must retrieve an authorization code before making a call to acquireToken()."
    },
    multipleMatchingTokens: {
        code: "multiple_matching_tokens",
        desc: "The cache contains multiple tokens satisfying the requirements. " + "Call AcquireToken again providing more requirements such as authority or account."
    },
    multipleMatchingAccounts: {
        code: "multiple_matching_accounts",
        desc: "The cache contains multiple accounts satisfying the given parameters. Please pass more info to obtain the correct account"
    },
    multipleMatchingAppMetadata: {
        code: "multiple_matching_appMetadata",
        desc: "The cache contains multiple appMetadata satisfying the given parameters. Please pass more info to obtain the correct appMetadata"
    },
    tokenRequestCannotBeMade: {
        code: "request_cannot_be_made",
        desc: "Token request cannot be made without authorization code or refresh token."
    },
    appendEmptyScopeError: {
        code: "cannot_append_empty_scope",
        desc: "Cannot append null or empty scope to ScopeSet. Please check the stack trace for more info."
    },
    removeEmptyScopeError: {
        code: "cannot_remove_empty_scope",
        desc: "Cannot remove null or empty scope from ScopeSet. Please check the stack trace for more info."
    },
    appendScopeSetError: {
        code: "cannot_append_scopeset",
        desc: "Cannot append ScopeSet due to error."
    },
    emptyInputScopeSetError: {
        code: "empty_input_scopeset",
        desc: "Empty input ScopeSet cannot be processed."
    },
    DeviceCodePollingCancelled: {
        code: "device_code_polling_cancelled",
        desc: "Caller has cancelled token endpoint polling during device code flow by setting DeviceCodeRequest.cancel = true."
    },
    DeviceCodeExpired: {
        code: "device_code_expired",
        desc: "Device code is expired."
    },
    NoAccountInSilentRequest: {
        code: "no_account_in_silent_request",
        desc: "Please pass an account object, silent flow is not supported without account information"
    },
    invalidCacheRecord: {
        code: "invalid_cache_record",
        desc: "Cache record object was null or undefined."
    },
    invalidCacheEnvironment: {
        code: "invalid_cache_environment",
        desc: "Invalid environment when attempting to create cache entry"
    },
    noAccountFound: {
        code: "no_account_found",
        desc: "No account found in cache for given key."
    },
    CachePluginError: {
        code: "no cache plugin set on CacheManager",
        desc: "ICachePlugin needs to be set before using readFromStorage or writeFromStorage"
    },
    noCryptoObj: {
        code: "no_crypto_object",
        desc: "No crypto object detected. This is required for the following operation: "
    },
    invalidCacheType: {
        code: "invalid_cache_type",
        desc: "Invalid cache type"
    },
    unexpectedAccountType: {
        code: "unexpected_account_type",
        desc: "Unexpected account type."
    },
    unexpectedCredentialType: {
        code: "unexpected_credential_type",
        desc: "Unexpected credential type."
    },
    invalidAssertion: {
        code: "invalid_assertion",
        desc: "Client assertion must meet requirements described in https://tools.ietf.org/html/rfc7515"
    },
    invalidClientCredential: {
        code: "invalid_client_credential",
        desc: "Client credential (secret, certificate, or assertion) must not be empty when creating a confidential client. An application should at most have one credential"
    },
    tokenRefreshRequired: {
        code: "token_refresh_required",
        desc: "Cannot return token from cache because it must be refreshed. This may be due to one of the following reasons: forceRefresh parameter is set to true, claims have been requested, there is no cached access token or it is expired."
    },
    userTimeoutReached: {
        code: "user_timeout_reached",
        desc: "User defined timeout for device code polling reached"
    },
    tokenClaimsRequired: {
        code: "token_claims_cnf_required_for_signedjwt",
        desc: "Cannot generate a POP jwt if the token_claims are not populated"
    },
    noAuthorizationCodeFromServer: {
        code: "authorization_code_missing_from_server_response",
        desc: "Server response does not contain an authorization code to proceed"
    },
    noAzureRegionDetected: {
        code: "no_azure_region_detected",
        desc: "No azure region was detected and no fallback was made available"
    },
    accessTokenEntityNullError: {
        code: "access_token_entity_null",
        desc: "Access token entity is null, please check logs and cache to ensure a valid access token is present."
    }
};
class ClientAuthError1 extends AuthError1 {
    constructor(errorCode1, errorMessage1){
        super(errorCode1, errorMessage1);
        this.name = "ClientAuthError";
        Object.setPrototypeOf(this, ClientAuthError1.prototype);
    }
    static createClientInfoDecodingError(caughtError) {
        return new ClientAuthError1(ClientAuthErrorMessage1.clientInfoDecodingError.code, `${ClientAuthErrorMessage1.clientInfoDecodingError.desc} Failed with error: ${caughtError}`);
    }
    static createClientInfoEmptyError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.clientInfoEmptyError.code, `${ClientAuthErrorMessage1.clientInfoEmptyError.desc}`);
    }
    static createTokenParsingError(caughtExtractionError) {
        return new ClientAuthError1(ClientAuthErrorMessage1.tokenParsingError.code, `${ClientAuthErrorMessage1.tokenParsingError.desc} Failed with error: ${caughtExtractionError}`);
    }
    static createTokenNullOrEmptyError(invalidRawTokenString) {
        return new ClientAuthError1(ClientAuthErrorMessage1.nullOrEmptyToken.code, `${ClientAuthErrorMessage1.nullOrEmptyToken.desc} Raw Token Value: ${invalidRawTokenString}`);
    }
    static createEndpointDiscoveryIncompleteError(errDetail) {
        return new ClientAuthError1(ClientAuthErrorMessage1.endpointResolutionError.code, `${ClientAuthErrorMessage1.endpointResolutionError.desc} Detail: ${errDetail}`);
    }
    static createNetworkError(endpoint, errDetail) {
        return new ClientAuthError1(ClientAuthErrorMessage1.networkError.code, `${ClientAuthErrorMessage1.networkError.desc} | Fetch client threw: ${errDetail} | Attempted to reach: ${endpoint.split("?")[0]}`);
    }
    static createUnableToGetOpenidConfigError(errDetail) {
        return new ClientAuthError1(ClientAuthErrorMessage1.unableToGetOpenidConfigError.code, `${ClientAuthErrorMessage1.unableToGetOpenidConfigError.desc} Attempted to retrieve endpoints from: ${errDetail}`);
    }
    static createHashNotDeserializedError(hashParamObj) {
        return new ClientAuthError1(ClientAuthErrorMessage1.hashNotDeserialized.code, `${ClientAuthErrorMessage1.hashNotDeserialized.desc} Given Object: ${hashParamObj}`);
    }
    static createInvalidStateError(invalidState, errorString) {
        return new ClientAuthError1(ClientAuthErrorMessage1.invalidStateError.code, `${ClientAuthErrorMessage1.invalidStateError.desc} Invalid State: ${invalidState}, Root Err: ${errorString}`);
    }
    static createStateMismatchError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.stateMismatchError.code, ClientAuthErrorMessage1.stateMismatchError.desc);
    }
    static createStateNotFoundError(missingState) {
        return new ClientAuthError1(ClientAuthErrorMessage1.stateNotFoundError.code, `${ClientAuthErrorMessage1.stateNotFoundError.desc}:  ${missingState}`);
    }
    static createNonceMismatchError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.nonceMismatchError.code, ClientAuthErrorMessage1.nonceMismatchError.desc);
    }
    static createNonceNotFoundError(missingNonce) {
        return new ClientAuthError1(ClientAuthErrorMessage1.nonceNotFoundError.code, `${ClientAuthErrorMessage1.nonceNotFoundError.desc}:  ${missingNonce}`);
    }
    static createNoTokensFoundError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.noTokensFoundError.code, ClientAuthErrorMessage1.noTokensFoundError.desc);
    }
    static createMultipleMatchingTokensInCacheError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.multipleMatchingTokens.code, `${ClientAuthErrorMessage1.multipleMatchingTokens.desc}.`);
    }
    static createMultipleMatchingAccountsInCacheError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.multipleMatchingAccounts.code, ClientAuthErrorMessage1.multipleMatchingAccounts.desc);
    }
    static createMultipleMatchingAppMetadataInCacheError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.multipleMatchingAppMetadata.code, ClientAuthErrorMessage1.multipleMatchingAppMetadata.desc);
    }
    static createTokenRequestCannotBeMadeError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.tokenRequestCannotBeMade.code, ClientAuthErrorMessage1.tokenRequestCannotBeMade.desc);
    }
    static createAppendEmptyScopeToSetError(givenScope) {
        return new ClientAuthError1(ClientAuthErrorMessage1.appendEmptyScopeError.code, `${ClientAuthErrorMessage1.appendEmptyScopeError.desc} Given Scope: ${givenScope}`);
    }
    static createRemoveEmptyScopeFromSetError(givenScope) {
        return new ClientAuthError1(ClientAuthErrorMessage1.removeEmptyScopeError.code, `${ClientAuthErrorMessage1.removeEmptyScopeError.desc} Given Scope: ${givenScope}`);
    }
    static createAppendScopeSetError(appendError) {
        return new ClientAuthError1(ClientAuthErrorMessage1.appendScopeSetError.code, `${ClientAuthErrorMessage1.appendScopeSetError.desc} Detail Error: ${appendError}`);
    }
    static createEmptyInputScopeSetError(givenScopeSet) {
        return new ClientAuthError1(ClientAuthErrorMessage1.emptyInputScopeSetError.code, `${ClientAuthErrorMessage1.emptyInputScopeSetError.desc} Given ScopeSet: ${givenScopeSet}`);
    }
    static createDeviceCodeCancelledError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.DeviceCodePollingCancelled.code, `${ClientAuthErrorMessage1.DeviceCodePollingCancelled.desc}`);
    }
    static createDeviceCodeExpiredError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.DeviceCodeExpired.code, `${ClientAuthErrorMessage1.DeviceCodeExpired.desc}`);
    }
    static createNoAccountInSilentRequestError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.NoAccountInSilentRequest.code, `${ClientAuthErrorMessage1.NoAccountInSilentRequest.desc}`);
    }
    static createNullOrUndefinedCacheRecord() {
        return new ClientAuthError1(ClientAuthErrorMessage1.invalidCacheRecord.code, ClientAuthErrorMessage1.invalidCacheRecord.desc);
    }
    static createInvalidCacheEnvironmentError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.invalidCacheEnvironment.code, ClientAuthErrorMessage1.invalidCacheEnvironment.desc);
    }
    static createNoAccountFoundError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.noAccountFound.code, ClientAuthErrorMessage1.noAccountFound.desc);
    }
    static createCachePluginError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.CachePluginError.code, `${ClientAuthErrorMessage1.CachePluginError.desc}`);
    }
    static createNoCryptoObjectError(operationName) {
        return new ClientAuthError1(ClientAuthErrorMessage1.noCryptoObj.code, `${ClientAuthErrorMessage1.noCryptoObj.desc}${operationName}`);
    }
    static createInvalidCacheTypeError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.invalidCacheType.code, `${ClientAuthErrorMessage1.invalidCacheType.desc}`);
    }
    static createUnexpectedAccountTypeError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.unexpectedAccountType.code, `${ClientAuthErrorMessage1.unexpectedAccountType.desc}`);
    }
    static createUnexpectedCredentialTypeError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.unexpectedCredentialType.code, `${ClientAuthErrorMessage1.unexpectedCredentialType.desc}`);
    }
    static createInvalidAssertionError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.invalidAssertion.code, `${ClientAuthErrorMessage1.invalidAssertion.desc}`);
    }
    static createInvalidCredentialError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.invalidClientCredential.code, `${ClientAuthErrorMessage1.invalidClientCredential.desc}`);
    }
    static createRefreshRequiredError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.tokenRefreshRequired.code, ClientAuthErrorMessage1.tokenRefreshRequired.desc);
    }
    static createUserTimeoutReachedError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.userTimeoutReached.code, ClientAuthErrorMessage1.userTimeoutReached.desc);
    }
    static createTokenClaimsRequiredError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.tokenClaimsRequired.code, ClientAuthErrorMessage1.tokenClaimsRequired.desc);
    }
    static createNoAuthCodeInServerResponseError() {
        return new ClientAuthError1(ClientAuthErrorMessage1.noAuthorizationCodeFromServer.code, ClientAuthErrorMessage1.noAuthorizationCodeFromServer.desc);
    }
}
class StringUtils {
    static decodeAuthToken(authToken) {
        if (StringUtils.isEmpty(authToken)) {
            throw ClientAuthError1.createTokenNullOrEmptyError(authToken);
        }
        const tokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/;
        const matches = tokenPartsRegex.exec(authToken);
        if (!matches || matches.length < 4) {
            throw ClientAuthError1.createTokenParsingError(`Given token is malformed: ${JSON.stringify(authToken)}`);
        }
        const crackedToken = {
            header: matches[1],
            JWSPayload: matches[2],
            JWSSig: matches[3]
        };
        return crackedToken;
    }
    static isEmpty(str) {
        return typeof str === "undefined" || !str || 0 === str.length;
    }
    static isEmptyObj(strObj) {
        if (strObj && !StringUtils.isEmpty(strObj)) {
            try {
                const obj = JSON.parse(strObj);
                return Object.keys(obj).length === 0;
            } catch (e) {
            }
        }
        return true;
    }
    static startsWith(str, search) {
        return str.indexOf(search) === 0;
    }
    static endsWith(str, search) {
        return str.length >= search.length && str.lastIndexOf(search) === str.length - search.length;
    }
    static queryStringToObject(query) {
        let match;
        const pl = /\+/g;
        const search = /([^&=]+)=([^&]*)/g;
        const decode5 = (s)=>decodeURIComponent(decodeURIComponent(s.replace(pl, " ")))
        ;
        const obj = {
        };
        match = search.exec(query);
        while(match){
            obj[decode5(match[1])] = decode5(match[2]);
            match = search.exec(query);
        }
        return obj;
    }
    static trimArrayEntries(arr) {
        return arr.map((entry)=>entry.trim()
        );
    }
    static removeEmptyStringsFromArray(arr) {
        return arr.filter((entry)=>{
            return !StringUtils.isEmpty(entry);
        });
    }
    static jsonParseHelper(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    }
    static matchPattern(pattern, input) {
        const regex = new RegExp(pattern.replace(/\*/g, "[^ ]*").replace(/\?/g, "\\\?"));
        return regex.test(input);
    }
}
var LogLevel1;
(function(LogLevel1) {
    LogLevel1[LogLevel1["Error"] = 0] = "Error";
    LogLevel1[LogLevel1["Warning"] = 1] = "Warning";
    LogLevel1[LogLevel1["Info"] = 2] = "Info";
    LogLevel1[LogLevel1["Verbose"] = 3] = "Verbose";
    LogLevel1[LogLevel1["Trace"] = 4] = "Trace";
})(LogLevel1 || (LogLevel1 = {
}));
class Logger1 {
    constructor(loggerOptions, packageName1, packageVersion1){
        this.level = LogLevel1.Info;
        const defaultLoggerCallback = ()=>{
        };
        this.localCallback = loggerOptions.loggerCallback || defaultLoggerCallback;
        this.piiLoggingEnabled = loggerOptions.piiLoggingEnabled || false;
        this.level = loggerOptions.logLevel || LogLevel1.Info;
        this.packageName = packageName1 || Constants.EMPTY_STRING;
        this.packageVersion = packageVersion1 || Constants.EMPTY_STRING;
    }
    clone(packageName, packageVersion) {
        return new Logger1({
            loggerCallback: this.localCallback,
            piiLoggingEnabled: this.piiLoggingEnabled,
            logLevel: this.level
        }, packageName, packageVersion);
    }
    logMessage(logMessage, options) {
        if (options.logLevel > this.level || !this.piiLoggingEnabled && options.containsPii) {
            return;
        }
        const timestamp = new Date().toUTCString();
        const logHeader = StringUtils.isEmpty(this.correlationId) ? `[${timestamp}] : ` : `[${timestamp}] : [${this.correlationId}]`;
        const log = `${logHeader} : ${this.packageName}@${this.packageVersion} : ${LogLevel1[options.logLevel]} - ${logMessage}`;
        this.executeCallback(options.logLevel, log, options.containsPii || false);
    }
    executeCallback(level, message, containsPii) {
        if (this.localCallback) {
            this.localCallback(level, message, containsPii);
        }
    }
    error(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Error,
            containsPii: false,
            correlationId: correlationId || ""
        });
    }
    errorPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Error,
            containsPii: true,
            correlationId: correlationId || ""
        });
    }
    warning(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Warning,
            containsPii: false,
            correlationId: correlationId || ""
        });
    }
    warningPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Warning,
            containsPii: true,
            correlationId: correlationId || ""
        });
    }
    info(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Info,
            containsPii: false,
            correlationId: correlationId || ""
        });
    }
    infoPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Info,
            containsPii: true,
            correlationId: correlationId || ""
        });
    }
    verbose(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Verbose,
            containsPii: false,
            correlationId: correlationId || ""
        });
    }
    verbosePii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Verbose,
            containsPii: true,
            correlationId: correlationId || ""
        });
    }
    trace(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Trace,
            containsPii: false,
            correlationId: correlationId || ""
        });
    }
    tracePii(message, correlationId) {
        this.logMessage(message, {
            logLevel: LogLevel1.Trace,
            containsPii: true,
            correlationId: correlationId || ""
        });
    }
    isPiiLoggingEnabled() {
        return this.piiLoggingEnabled || false;
    }
}
const name$1 = "@azure/msal-common";
const version$1 = "4.3.0";
class CredentialEntity {
    generateAccountId() {
        return CredentialEntity.generateAccountIdForCacheKey(this.homeAccountId, this.environment);
    }
    generateCredentialId() {
        return CredentialEntity.generateCredentialIdForCacheKey(this.credentialType, this.clientId, this.realm, this.familyId);
    }
    generateTarget() {
        return CredentialEntity.generateTargetForCacheKey(this.target);
    }
    generateCredentialKey() {
        return CredentialEntity.generateCredentialCacheKey(this.homeAccountId, this.environment, this.credentialType, this.clientId, this.realm, this.target, this.familyId);
    }
    generateType() {
        switch(this.credentialType){
            case CredentialType.ID_TOKEN:
                return CacheType.ID_TOKEN;
            case CredentialType.ACCESS_TOKEN:
                return CacheType.ACCESS_TOKEN;
            case CredentialType.REFRESH_TOKEN:
                return CacheType.REFRESH_TOKEN;
            default:
                {
                    throw ClientAuthError1.createUnexpectedCredentialTypeError();
                }
        }
    }
    static getCredentialType(key) {
        if (key.indexOf(CredentialType.ACCESS_TOKEN.toLowerCase()) !== -1) {
            if (key.indexOf(CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME.toLowerCase()) !== -1) {
                return CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
            }
            return CredentialType.ACCESS_TOKEN;
        } else if (key.indexOf(CredentialType.ID_TOKEN.toLowerCase()) !== -1) {
            return CredentialType.ID_TOKEN;
        } else if (key.indexOf(CredentialType.REFRESH_TOKEN.toLowerCase()) !== -1) {
            return CredentialType.REFRESH_TOKEN;
        }
        return Constants.NOT_DEFINED;
    }
    static generateCredentialCacheKey(homeAccountId, environment, credentialType, clientId, realm, target, familyId) {
        const credentialKey = [
            this.generateAccountIdForCacheKey(homeAccountId, environment),
            this.generateCredentialIdForCacheKey(credentialType, clientId, realm, familyId),
            this.generateTargetForCacheKey(target)
        ];
        return credentialKey.join(Separators.CACHE_KEY_SEPARATOR).toLowerCase();
    }
    static generateAccountIdForCacheKey(homeAccountId, environment) {
        const accountId = [
            homeAccountId,
            environment
        ];
        return accountId.join(Separators.CACHE_KEY_SEPARATOR).toLowerCase();
    }
    static generateCredentialIdForCacheKey(credentialType, clientId, realm, familyId) {
        const clientOrFamilyId = credentialType === CredentialType.REFRESH_TOKEN ? familyId || clientId : clientId;
        const credentialId = [
            credentialType,
            clientOrFamilyId,
            realm || ""
        ];
        return credentialId.join(Separators.CACHE_KEY_SEPARATOR).toLowerCase();
    }
    static generateTargetForCacheKey(scopes) {
        return (scopes || "").toLowerCase();
    }
}
const ClientConfigurationErrorMessage1 = {
    redirectUriNotSet: {
        code: "redirect_uri_empty",
        desc: "A redirect URI is required for all calls, and none has been set."
    },
    postLogoutUriNotSet: {
        code: "post_logout_uri_empty",
        desc: "A post logout redirect has not been set."
    },
    claimsRequestParsingError: {
        code: "claims_request_parsing_error",
        desc: "Could not parse the given claims request object."
    },
    authorityUriInsecure: {
        code: "authority_uri_insecure",
        desc: "Authority URIs must use https.  Please see here for valid authority configuration options: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options"
    },
    urlParseError: {
        code: "url_parse_error",
        desc: "URL could not be parsed into appropriate segments."
    },
    urlEmptyError: {
        code: "empty_url_error",
        desc: "URL was empty or null."
    },
    emptyScopesError: {
        code: "empty_input_scopes_error",
        desc: "Scopes cannot be passed as null, undefined or empty array because they are required to obtain an access token."
    },
    nonArrayScopesError: {
        code: "nonarray_input_scopes_error",
        desc: "Scopes cannot be passed as non-array."
    },
    clientIdSingleScopeError: {
        code: "clientid_input_scopes_error",
        desc: "Client ID can only be provided as a single scope."
    },
    invalidPrompt: {
        code: "invalid_prompt_value",
        desc: "Supported prompt values are 'login', 'select_account', 'consent' and 'none'.  Please see here for valid configuration options: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options"
    },
    invalidClaimsRequest: {
        code: "invalid_claims",
        desc: "Given claims parameter must be a stringified JSON object."
    },
    tokenRequestEmptyError: {
        code: "token_request_empty",
        desc: "Token request was empty and not found in cache."
    },
    logoutRequestEmptyError: {
        code: "logout_request_empty",
        desc: "The logout request was null or undefined."
    },
    invalidCodeChallengeMethod: {
        code: "invalid_code_challenge_method",
        desc: "code_challenge_method passed is invalid. Valid values are \"plain\" and \"S256\"."
    },
    invalidCodeChallengeParams: {
        code: "pkce_params_missing",
        desc: "Both params: code_challenge and code_challenge_method are to be passed if to be sent in the request"
    },
    invalidCloudDiscoveryMetadata: {
        code: "invalid_cloud_discovery_metadata",
        desc: "Invalid cloudDiscoveryMetadata provided. Must be a JSON object containing tenant_discovery_endpoint and metadata fields"
    },
    invalidAuthorityMetadata: {
        code: "invalid_authority_metadata",
        desc: "Invalid authorityMetadata provided. Must by a JSON object containing authorization_endpoint, token_endpoint, end_session_endpoint, issuer fields."
    },
    untrustedAuthority: {
        code: "untrusted_authority",
        desc: "The provided authority is not a trusted authority. Please include this authority in the knownAuthorities config parameter."
    }
};
class ClientConfigurationError1 extends ClientAuthError1 {
    constructor(errorCode2, errorMessage2){
        super(errorCode2, errorMessage2);
        this.name = "ClientConfigurationError";
        Object.setPrototypeOf(this, ClientConfigurationError1.prototype);
    }
    static createRedirectUriEmptyError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.redirectUriNotSet.code, ClientConfigurationErrorMessage1.redirectUriNotSet.desc);
    }
    static createPostLogoutRedirectUriEmptyError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.postLogoutUriNotSet.code, ClientConfigurationErrorMessage1.postLogoutUriNotSet.desc);
    }
    static createClaimsRequestParsingError(claimsRequestParseError) {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.claimsRequestParsingError.code, `${ClientConfigurationErrorMessage1.claimsRequestParsingError.desc} Given value: ${claimsRequestParseError}`);
    }
    static createInsecureAuthorityUriError(urlString) {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.authorityUriInsecure.code, `${ClientConfigurationErrorMessage1.authorityUriInsecure.desc} Given URI: ${urlString}`);
    }
    static createUrlParseError(urlParseError) {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.urlParseError.code, `${ClientConfigurationErrorMessage1.urlParseError.desc} Given Error: ${urlParseError}`);
    }
    static createUrlEmptyError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.urlEmptyError.code, ClientConfigurationErrorMessage1.urlEmptyError.desc);
    }
    static createScopesNonArrayError(inputScopes) {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.nonArrayScopesError.code, `${ClientConfigurationErrorMessage1.nonArrayScopesError.desc} Given Scopes: ${inputScopes}`);
    }
    static createEmptyScopesArrayError(inputScopes) {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.emptyScopesError.code, `${ClientConfigurationErrorMessage1.emptyScopesError.desc} Given Scopes: ${inputScopes}`);
    }
    static createClientIdSingleScopeError(inputScopes) {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.clientIdSingleScopeError.code, `${ClientConfigurationErrorMessage1.clientIdSingleScopeError.desc} Given Scopes: ${inputScopes}`);
    }
    static createInvalidPromptError(promptValue) {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.invalidPrompt.code, `${ClientConfigurationErrorMessage1.invalidPrompt.desc} Given value: ${promptValue}`);
    }
    static createInvalidClaimsRequestError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.invalidClaimsRequest.code, ClientConfigurationErrorMessage1.invalidClaimsRequest.desc);
    }
    static createEmptyLogoutRequestError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.logoutRequestEmptyError.code, ClientConfigurationErrorMessage1.logoutRequestEmptyError.desc);
    }
    static createEmptyTokenRequestError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.tokenRequestEmptyError.code, ClientConfigurationErrorMessage1.tokenRequestEmptyError.desc);
    }
    static createInvalidCodeChallengeMethodError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.invalidCodeChallengeMethod.code, ClientConfigurationErrorMessage1.invalidCodeChallengeMethod.desc);
    }
    static createInvalidCodeChallengeParamsError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.invalidCodeChallengeParams.code, ClientConfigurationErrorMessage1.invalidCodeChallengeParams.desc);
    }
    static createInvalidCloudDiscoveryMetadataError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.invalidCloudDiscoveryMetadata.code, ClientConfigurationErrorMessage1.invalidCloudDiscoveryMetadata.desc);
    }
    static createInvalidAuthorityMetadataError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.invalidAuthorityMetadata.code, ClientConfigurationErrorMessage1.invalidAuthorityMetadata.desc);
    }
    static createUntrustedAuthorityError() {
        return new ClientConfigurationError1(ClientConfigurationErrorMessage1.untrustedAuthority.code, ClientConfigurationErrorMessage1.untrustedAuthority.desc);
    }
}
class ScopeSet {
    constructor(inputScopes1){
        const scopeArr = inputScopes1 ? StringUtils.trimArrayEntries([
            ...inputScopes1
        ]) : [];
        const filteredInput = scopeArr ? StringUtils.removeEmptyStringsFromArray(scopeArr) : [];
        this.validateInputScopes(filteredInput);
        this.scopes = new Set();
        filteredInput.forEach((scope)=>this.scopes.add(scope)
        );
    }
    static fromString(inputScopeString) {
        inputScopeString = inputScopeString || "";
        const inputScopes1 = inputScopeString.split(" ");
        return new ScopeSet(inputScopes1);
    }
    validateInputScopes(inputScopes) {
        if (!inputScopes || inputScopes.length < 1) {
            throw ClientConfigurationError1.createEmptyScopesArrayError(inputScopes);
        }
    }
    containsScope(scope) {
        const lowerCaseScopes = this.printScopesLowerCase().split(" ");
        const lowerCaseScopesSet = new ScopeSet(lowerCaseScopes);
        return !StringUtils.isEmpty(scope) ? lowerCaseScopesSet.scopes.has(scope.toLowerCase()) : false;
    }
    containsScopeSet(scopeSet) {
        if (!scopeSet || scopeSet.scopes.size <= 0) {
            return false;
        }
        return this.scopes.size >= scopeSet.scopes.size && scopeSet.asArray().every((scope)=>this.containsScope(scope)
        );
    }
    containsOnlyOIDCScopes() {
        let defaultScopeCount = 0;
        OIDC_SCOPES.forEach((defaultScope)=>{
            if (this.containsScope(defaultScope)) {
                defaultScopeCount += 1;
            }
        });
        return this.scopes.size === defaultScopeCount;
    }
    appendScope(newScope) {
        if (!StringUtils.isEmpty(newScope)) {
            this.scopes.add(newScope.trim());
        }
    }
    appendScopes(newScopes) {
        try {
            newScopes.forEach((newScope)=>this.appendScope(newScope)
            );
        } catch (e) {
            throw ClientAuthError1.createAppendScopeSetError(e);
        }
    }
    removeScope(scope) {
        if (StringUtils.isEmpty(scope)) {
            throw ClientAuthError1.createRemoveEmptyScopeFromSetError(scope);
        }
        this.scopes.delete(scope.trim());
    }
    removeOIDCScopes() {
        OIDC_SCOPES.forEach((defaultScope)=>{
            this.scopes.delete(defaultScope);
        });
    }
    unionScopeSets(otherScopes) {
        if (!otherScopes) {
            throw ClientAuthError1.createEmptyInputScopeSetError(otherScopes);
        }
        const unionScopes = new Set();
        otherScopes.scopes.forEach((scope)=>unionScopes.add(scope.toLowerCase())
        );
        this.scopes.forEach((scope)=>unionScopes.add(scope.toLowerCase())
        );
        return unionScopes;
    }
    intersectingScopeSets(otherScopes) {
        if (!otherScopes) {
            throw ClientAuthError1.createEmptyInputScopeSetError(otherScopes);
        }
        if (!otherScopes.containsOnlyOIDCScopes()) {
            otherScopes.removeOIDCScopes();
        }
        const unionScopes = this.unionScopeSets(otherScopes);
        const sizeOtherScopes = otherScopes.getScopeCount();
        const sizeThisScopes = this.getScopeCount();
        const sizeUnionScopes = unionScopes.size;
        return sizeUnionScopes < sizeThisScopes + sizeOtherScopes;
    }
    getScopeCount() {
        return this.scopes.size;
    }
    asArray() {
        const array = [];
        this.scopes.forEach((val)=>array.push(val)
        );
        return array;
    }
    printScopes() {
        if (this.scopes) {
            const scopeArr1 = this.asArray();
            return scopeArr1.join(" ");
        }
        return "";
    }
    printScopesLowerCase() {
        return this.printScopes().toLowerCase();
    }
}
function buildClientInfo(rawClientInfo, crypto) {
    if (StringUtils.isEmpty(rawClientInfo)) {
        throw ClientAuthError1.createClientInfoEmptyError();
    }
    try {
        const decodedClientInfo = crypto.base64Decode(rawClientInfo);
        return JSON.parse(decodedClientInfo);
    } catch (e) {
        throw ClientAuthError1.createClientInfoDecodingError(e);
    }
}
var AuthorityType;
(function(AuthorityType1) {
    AuthorityType1[AuthorityType1["Default"] = 0] = "Default";
    AuthorityType1[AuthorityType1["Adfs"] = 1] = "Adfs";
})(AuthorityType || (AuthorityType = {
}));
class AccountEntity {
    generateAccountId() {
        const accountId = [
            this.homeAccountId,
            this.environment
        ];
        return accountId.join(Separators.CACHE_KEY_SEPARATOR).toLowerCase();
    }
    generateAccountKey() {
        return AccountEntity.generateAccountCacheKey({
            homeAccountId: this.homeAccountId,
            environment: this.environment,
            tenantId: this.realm,
            username: this.username,
            localAccountId: this.localAccountId
        });
    }
    generateType() {
        switch(this.authorityType){
            case CacheAccountType.ADFS_ACCOUNT_TYPE:
                return CacheType.ADFS;
            case CacheAccountType.MSAV1_ACCOUNT_TYPE:
                return CacheType.MSA;
            case CacheAccountType.MSSTS_ACCOUNT_TYPE:
                return CacheType.MSSTS;
            case CacheAccountType.GENERIC_ACCOUNT_TYPE:
                return CacheType.GENERIC;
            default:
                {
                    throw ClientAuthError1.createUnexpectedAccountTypeError();
                }
        }
    }
    getAccountInfo() {
        return {
            homeAccountId: this.homeAccountId,
            environment: this.environment,
            tenantId: this.realm,
            username: this.username,
            localAccountId: this.localAccountId,
            name: this.name,
            idTokenClaims: this.idTokenClaims
        };
    }
    static generateAccountCacheKey(accountInterface) {
        const accountKey = [
            accountInterface.homeAccountId,
            accountInterface.environment || "",
            accountInterface.tenantId || ""
        ];
        return accountKey.join(Separators.CACHE_KEY_SEPARATOR).toLowerCase();
    }
    static createAccount(clientInfo, homeAccountId, authority, idToken, oboAssertion, cloudGraphHostName, msGraphHost) {
        const account = new AccountEntity();
        account.authorityType = CacheAccountType.MSSTS_ACCOUNT_TYPE;
        account.clientInfo = clientInfo;
        account.homeAccountId = homeAccountId;
        const env2 = authority.getPreferredCache();
        if (StringUtils.isEmpty(env2)) {
            throw ClientAuthError1.createInvalidCacheEnvironmentError();
        }
        account.environment = env2;
        account.realm = idToken?.claims?.tid || "";
        account.oboAssertion = oboAssertion;
        if (idToken) {
            account.idTokenClaims = idToken.claims;
            account.localAccountId = idToken?.claims?.oid || idToken?.claims?.sub || "";
            account.username = idToken?.claims?.preferred_username || (idToken?.claims?.emails ? idToken.claims.emails[0] : "");
            account.name = idToken?.claims?.name;
        }
        account.cloudGraphHostName = cloudGraphHostName;
        account.msGraphHost = msGraphHost;
        return account;
    }
    static createGenericAccount(authority, homeAccountId, idToken, oboAssertion, cloudGraphHostName, msGraphHost) {
        const account = new AccountEntity();
        account.authorityType = authority.authorityType === AuthorityType.Adfs ? CacheAccountType.ADFS_ACCOUNT_TYPE : CacheAccountType.GENERIC_ACCOUNT_TYPE;
        account.homeAccountId = homeAccountId;
        account.realm = "";
        account.oboAssertion = oboAssertion;
        const env2 = authority.getPreferredCache();
        if (StringUtils.isEmpty(env2)) {
            throw ClientAuthError1.createInvalidCacheEnvironmentError();
        }
        if (idToken) {
            account.localAccountId = idToken?.claims?.oid || idToken?.claims?.sub || "";
            account.username = idToken?.claims?.upn || "";
            account.name = idToken?.claims?.name || "";
            account.idTokenClaims = idToken?.claims;
        }
        account.environment = env2;
        account.cloudGraphHostName = cloudGraphHostName;
        account.msGraphHost = msGraphHost;
        return account;
    }
    static generateHomeAccountId(serverClientInfo, authType, logger, cryptoObj, idToken) {
        const accountId = idToken?.claims?.sub ? idToken.claims.sub : Constants.EMPTY_STRING;
        if (authType === AuthorityType.Adfs) {
            return accountId;
        }
        if (serverClientInfo) {
            const clientInfo = buildClientInfo(serverClientInfo, cryptoObj);
            if (!StringUtils.isEmpty(clientInfo.uid) && !StringUtils.isEmpty(clientInfo.utid)) {
                return `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`;
            }
        }
        logger.verbose("No client info in response");
        return accountId;
    }
    static isAccountEntity(entity) {
        if (!entity) {
            return false;
        }
        return entity.hasOwnProperty("homeAccountId") && entity.hasOwnProperty("environment") && entity.hasOwnProperty("realm") && entity.hasOwnProperty("localAccountId") && entity.hasOwnProperty("username") && entity.hasOwnProperty("authorityType");
    }
    static accountInfoIsEqual(accountA, accountB, compareClaims) {
        if (!accountA || !accountB) {
            return false;
        }
        let claimsMatch = true;
        if (compareClaims) {
            const accountAClaims = accountA.idTokenClaims || {
            };
            const accountBClaims = accountB.idTokenClaims || {
            };
            claimsMatch = accountAClaims.iat === accountBClaims.iat && accountAClaims.nonce === accountBClaims.nonce;
        }
        return accountA.homeAccountId === accountB.homeAccountId && accountA.localAccountId === accountB.localAccountId && accountA.username === accountB.username && accountA.tenantId === accountB.tenantId && accountA.environment === accountB.environment && claimsMatch;
    }
}
class AuthToken {
    constructor(rawToken, crypto1){
        if (StringUtils.isEmpty(rawToken)) {
            throw ClientAuthError1.createTokenNullOrEmptyError(rawToken);
        }
        this.rawToken = rawToken;
        this.claims = AuthToken.extractTokenClaims(rawToken, crypto1);
    }
    static extractTokenClaims(encodedToken, crypto) {
        const decodedToken = StringUtils.decodeAuthToken(encodedToken);
        try {
            const base64TokenPayload = decodedToken.JWSPayload;
            const base64Decoded = crypto.base64Decode(base64TokenPayload);
            return JSON.parse(base64Decoded);
        } catch (err) {
            throw ClientAuthError1.createTokenParsingError(err);
        }
    }
}
class CacheManager {
    constructor(clientId1, cryptoImpl){
        this.clientId = clientId1;
        this.cryptoImpl = cryptoImpl;
    }
    getAllAccounts() {
        const currentAccounts = this.getAccountsFilteredBy();
        const accountValues = Object.keys(currentAccounts).map((accountKey)=>currentAccounts[accountKey]
        );
        const numAccounts = accountValues.length;
        if (numAccounts < 1) {
            return [];
        } else {
            const allAccounts = accountValues.map((value7)=>{
                const accountEntity = CacheManager.toObject(new AccountEntity(), value7);
                const accountInfo = accountEntity.getAccountInfo();
                const idToken = this.readIdTokenFromCache(this.clientId, accountInfo);
                if (idToken && !accountInfo.idTokenClaims) {
                    accountInfo.idTokenClaims = new AuthToken(idToken.secret, this.cryptoImpl).claims;
                }
                return accountInfo;
            });
            return allAccounts;
        }
    }
    saveCacheRecord(cacheRecord) {
        if (!cacheRecord) {
            throw ClientAuthError1.createNullOrUndefinedCacheRecord();
        }
        if (!!cacheRecord.account) {
            this.setAccount(cacheRecord.account);
        }
        if (!!cacheRecord.idToken) {
            this.setIdTokenCredential(cacheRecord.idToken);
        }
        if (!!cacheRecord.accessToken) {
            this.saveAccessToken(cacheRecord.accessToken);
        }
        if (!!cacheRecord.refreshToken) {
            this.setRefreshTokenCredential(cacheRecord.refreshToken);
        }
        if (!!cacheRecord.appMetadata) {
            this.setAppMetadata(cacheRecord.appMetadata);
        }
    }
    saveAccessToken(credential) {
        const currentTokenCache = this.getCredentialsFilteredBy({
            clientId: credential.clientId,
            credentialType: credential.credentialType,
            environment: credential.environment,
            homeAccountId: credential.homeAccountId,
            realm: credential.realm
        });
        const currentScopes = ScopeSet.fromString(credential.target);
        const currentAccessTokens = Object.keys(currentTokenCache.accessTokens).map((key10)=>currentTokenCache.accessTokens[key10]
        );
        if (currentAccessTokens) {
            currentAccessTokens.forEach((tokenEntity)=>{
                const tokenScopeSet = ScopeSet.fromString(tokenEntity.target);
                if (tokenScopeSet.intersectingScopeSets(currentScopes)) {
                    this.removeCredential(tokenEntity);
                }
            });
        }
        this.setAccessTokenCredential(credential);
    }
    getAccountsFilteredBy(accountFilter) {
        return this.getAccountsFilteredByInternal(accountFilter ? accountFilter.homeAccountId : "", accountFilter ? accountFilter.environment : "", accountFilter ? accountFilter.realm : "");
    }
    getAccountsFilteredByInternal(homeAccountId, environment, realm) {
        const allCacheKeys = this.getKeys();
        const matchingAccounts = {
        };
        allCacheKeys.forEach((cacheKey)=>{
            const entity = this.getAccount(cacheKey);
            if (!entity) {
                return;
            }
            if (!!homeAccountId && !this.matchHomeAccountId(entity, homeAccountId)) {
                return;
            }
            if (!!environment && !this.matchEnvironment(entity, environment)) {
                return;
            }
            if (!!realm && !this.matchRealm(entity, realm)) {
                return;
            }
            matchingAccounts[cacheKey] = entity;
        });
        return matchingAccounts;
    }
    getCredentialsFilteredBy(filter) {
        return this.getCredentialsFilteredByInternal(filter.homeAccountId, filter.environment, filter.credentialType, filter.clientId, filter.familyId, filter.realm, filter.target, filter.oboAssertion);
    }
    getCredentialsFilteredByInternal(homeAccountId, environment, credentialType, clientId, familyId, realm, target, oboAssertion) {
        const allCacheKeys = this.getKeys();
        const matchingCredentials = {
            idTokens: {
            },
            accessTokens: {
            },
            refreshTokens: {
            }
        };
        allCacheKeys.forEach((cacheKey)=>{
            const credType = CredentialEntity.getCredentialType(cacheKey);
            if (credType === Constants.NOT_DEFINED) {
                return;
            }
            const entity = this.getSpecificCredential(cacheKey, credType);
            if (!entity) {
                return;
            }
            if (!!oboAssertion && !this.matchOboAssertion(entity, oboAssertion)) {
                return;
            }
            if (!!homeAccountId && !this.matchHomeAccountId(entity, homeAccountId)) {
                return;
            }
            if (!!environment && !this.matchEnvironment(entity, environment)) {
                return;
            }
            if (!!realm && !this.matchRealm(entity, realm)) {
                return;
            }
            if (!!credentialType && !this.matchCredentialType(entity, credentialType)) {
                return;
            }
            if (!!clientId && !this.matchClientId(entity, clientId)) {
                return;
            }
            if (!!familyId && !this.matchFamilyId(entity, familyId)) {
                return;
            }
            if (!!target && !this.matchTarget(entity, target)) {
                return;
            }
            switch(credType){
                case CredentialType.ID_TOKEN:
                    matchingCredentials.idTokens[cacheKey] = entity;
                    break;
                case CredentialType.ACCESS_TOKEN:
                case CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME:
                    matchingCredentials.accessTokens[cacheKey] = entity;
                    break;
                case CredentialType.REFRESH_TOKEN:
                    matchingCredentials.refreshTokens[cacheKey] = entity;
                    break;
            }
        });
        return matchingCredentials;
    }
    getAppMetadataFilteredBy(filter) {
        return this.getAppMetadataFilteredByInternal(filter.environment, filter.clientId);
    }
    getAppMetadataFilteredByInternal(environment, clientId) {
        const allCacheKeys = this.getKeys();
        const matchingAppMetadata = {
        };
        allCacheKeys.forEach((cacheKey)=>{
            if (!this.isAppMetadata(cacheKey)) {
                return;
            }
            const entity = this.getAppMetadata(cacheKey);
            if (!entity) {
                return;
            }
            if (!!environment && !this.matchEnvironment(entity, environment)) {
                return;
            }
            if (!!clientId && !this.matchClientId(entity, clientId)) {
                return;
            }
            matchingAppMetadata[cacheKey] = entity;
        });
        return matchingAppMetadata;
    }
    getAuthorityMetadataByAlias(host) {
        const allCacheKeys = this.getAuthorityMetadataKeys();
        let matchedEntity = null;
        allCacheKeys.forEach((cacheKey)=>{
            if (!this.isAuthorityMetadata(cacheKey) || cacheKey.indexOf(this.clientId) === -1) {
                return;
            }
            const entity = this.getAuthorityMetadata(cacheKey);
            if (!entity) {
                return;
            }
            if (entity.aliases.indexOf(host) === -1) {
                return;
            }
            matchedEntity = entity;
        });
        return matchedEntity;
    }
    removeAllAccounts() {
        const allCacheKeys = this.getKeys();
        allCacheKeys.forEach((cacheKey)=>{
            const entity = this.getAccount(cacheKey);
            if (!entity) {
                return;
            }
            this.removeAccount(cacheKey);
        });
        return true;
    }
    removeAccount(accountKey) {
        const account = this.getAccount(accountKey);
        if (!account) {
            throw ClientAuthError1.createNoAccountFoundError();
        }
        return this.removeAccountContext(account) && this.removeItem(accountKey, CacheSchemaType.ACCOUNT);
    }
    removeAccountContext(account) {
        const allCacheKeys = this.getKeys();
        const accountId = account.generateAccountId();
        allCacheKeys.forEach((cacheKey)=>{
            const credType = CredentialEntity.getCredentialType(cacheKey);
            if (credType === Constants.NOT_DEFINED) {
                return;
            }
            const cacheEntity = this.getSpecificCredential(cacheKey, credType);
            if (!!cacheEntity && accountId === cacheEntity.generateAccountId()) {
                this.removeCredential(cacheEntity);
            }
        });
        return true;
    }
    removeCredential(credential) {
        const key10 = credential.generateCredentialKey();
        return this.removeItem(key10, CacheSchemaType.CREDENTIAL);
    }
    removeAppMetadata() {
        const allCacheKeys = this.getKeys();
        allCacheKeys.forEach((cacheKey)=>{
            if (this.isAppMetadata(cacheKey)) {
                this.removeItem(cacheKey, CacheSchemaType.APP_METADATA);
            }
        });
        return true;
    }
    readCacheRecord(account, clientId, scopes, environment, authScheme) {
        const cachedAccount = this.readAccountFromCache(account);
        const cachedIdToken = this.readIdTokenFromCache(clientId, account);
        const cachedAccessToken = this.readAccessTokenFromCache(clientId, account, scopes, authScheme);
        const cachedRefreshToken = this.readRefreshTokenFromCache(clientId, account, false);
        const cachedAppMetadata = this.readAppMetadataFromCache(environment, clientId);
        if (cachedAccount && cachedIdToken) {
            cachedAccount.idTokenClaims = new AuthToken(cachedIdToken.secret, this.cryptoImpl).claims;
        }
        return {
            account: cachedAccount,
            idToken: cachedIdToken,
            accessToken: cachedAccessToken,
            refreshToken: cachedRefreshToken,
            appMetadata: cachedAppMetadata
        };
    }
    readAccountFromCache(account) {
        const accountKey = AccountEntity.generateAccountCacheKey(account);
        return this.getAccount(accountKey);
    }
    readIdTokenFromCache(clientId, account) {
        const idTokenFilter = {
            homeAccountId: account.homeAccountId,
            environment: account.environment,
            credentialType: CredentialType.ID_TOKEN,
            clientId: clientId,
            realm: account.tenantId
        };
        const credentialCache = this.getCredentialsFilteredBy(idTokenFilter);
        const idTokens = Object.keys(credentialCache.idTokens).map((key10)=>credentialCache.idTokens[key10]
        );
        const numIdTokens = idTokens.length;
        if (numIdTokens < 1) {
            return null;
        } else if (numIdTokens > 1) {
            throw ClientAuthError1.createMultipleMatchingTokensInCacheError();
        }
        return idTokens[0];
    }
    readAccessTokenFromCache(clientId, account, scopes, authScheme) {
        const credentialType = authScheme === AuthenticationScheme.POP ? CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME : CredentialType.ACCESS_TOKEN;
        const accessTokenFilter = {
            homeAccountId: account.homeAccountId,
            environment: account.environment,
            credentialType: credentialType,
            clientId,
            realm: account.tenantId,
            target: scopes.printScopesLowerCase()
        };
        const credentialCache = this.getCredentialsFilteredBy(accessTokenFilter);
        const accessTokens = Object.keys(credentialCache.accessTokens).map((key10)=>credentialCache.accessTokens[key10]
        );
        const numAccessTokens = accessTokens.length;
        if (numAccessTokens < 1) {
            return null;
        } else if (numAccessTokens > 1) {
            throw ClientAuthError1.createMultipleMatchingTokensInCacheError();
        }
        return accessTokens[0];
    }
    readRefreshTokenFromCache(clientId, account, familyRT) {
        const id = familyRT ? THE_FAMILY_ID : undefined;
        const refreshTokenFilter = {
            homeAccountId: account.homeAccountId,
            environment: account.environment,
            credentialType: CredentialType.REFRESH_TOKEN,
            clientId: clientId,
            familyId: id
        };
        const credentialCache = this.getCredentialsFilteredBy(refreshTokenFilter);
        const refreshTokens = Object.keys(credentialCache.refreshTokens).map((key10)=>credentialCache.refreshTokens[key10]
        );
        const numRefreshTokens = refreshTokens.length;
        if (numRefreshTokens < 1) {
            return null;
        }
        return refreshTokens[0];
    }
    readAppMetadataFromCache(environment, clientId) {
        const appMetadataFilter = {
            environment,
            clientId
        };
        const appMetadata = this.getAppMetadataFilteredBy(appMetadataFilter);
        const appMetadataEntries = Object.keys(appMetadata).map((key10)=>appMetadata[key10]
        );
        const numAppMetadata = appMetadataEntries.length;
        if (numAppMetadata < 1) {
            return null;
        } else if (numAppMetadata > 1) {
            throw ClientAuthError1.createMultipleMatchingAppMetadataInCacheError();
        }
        return appMetadataEntries[0];
    }
    isAppMetadataFOCI(environment, clientId) {
        const appMetadata = this.readAppMetadataFromCache(environment, clientId);
        return !!(appMetadata && appMetadata.familyId === THE_FAMILY_ID);
    }
    matchHomeAccountId(entity, homeAccountId) {
        return !!(entity.homeAccountId && homeAccountId === entity.homeAccountId);
    }
    matchOboAssertion(entity, oboAssertion) {
        return !!(entity.oboAssertion && oboAssertion === entity.oboAssertion);
    }
    matchEnvironment(entity, environment) {
        const cloudMetadata = this.getAuthorityMetadataByAlias(environment);
        if (cloudMetadata && cloudMetadata.aliases.indexOf(entity.environment) > -1) {
            return true;
        }
        return false;
    }
    matchCredentialType(entity, credentialType) {
        return entity.credentialType && credentialType.toLowerCase() === entity.credentialType.toLowerCase();
    }
    matchClientId(entity, clientId) {
        return !!(entity.clientId && clientId === entity.clientId);
    }
    matchFamilyId(entity, familyId) {
        return !!(entity.familyId && familyId === entity.familyId);
    }
    matchRealm(entity, realm) {
        return !!(entity.realm && realm === entity.realm);
    }
    matchTarget(entity, target) {
        const isNotAccessTokenCredential = entity.credentialType !== CredentialType.ACCESS_TOKEN && entity.credentialType !== CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
        if (isNotAccessTokenCredential || !entity.target) {
            return false;
        }
        const entityScopeSet = ScopeSet.fromString(entity.target);
        const requestTargetScopeSet = ScopeSet.fromString(target);
        if (!requestTargetScopeSet.containsOnlyOIDCScopes()) {
            requestTargetScopeSet.removeOIDCScopes();
        } else {
            requestTargetScopeSet.removeScope(Constants.OFFLINE_ACCESS_SCOPE);
        }
        return entityScopeSet.containsScopeSet(requestTargetScopeSet);
    }
    isAppMetadata(key) {
        return key.indexOf(APP_METADATA) !== -1;
    }
    isAuthorityMetadata(key) {
        return key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) !== -1;
    }
    generateAuthorityMetadataCacheKey(authority) {
        return `${AUTHORITY_METADATA_CONSTANTS.CACHE_KEY}-${this.clientId}-${authority}`;
    }
    getSpecificCredential(key, credType) {
        switch(credType){
            case CredentialType.ID_TOKEN:
                {
                    return this.getIdTokenCredential(key);
                }
            case CredentialType.ACCESS_TOKEN:
            case CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME:
                {
                    return this.getAccessTokenCredential(key);
                }
            case CredentialType.REFRESH_TOKEN:
                {
                    return this.getRefreshTokenCredential(key);
                }
            default:
                return null;
        }
    }
    static toObject(obj, json) {
        for(const propertyName in json){
            obj[propertyName] = json[propertyName];
        }
        return obj;
    }
}
class DefaultStorageClass extends CacheManager {
    setAccount() {
        const notImplErr = "Storage interface - setAccount() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getAccount() {
        const notImplErr = "Storage interface - getAccount() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    setIdTokenCredential() {
        const notImplErr = "Storage interface - setIdTokenCredential() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getIdTokenCredential() {
        const notImplErr = "Storage interface - getIdTokenCredential() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    setAccessTokenCredential() {
        const notImplErr = "Storage interface - setAccessTokenCredential() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getAccessTokenCredential() {
        const notImplErr = "Storage interface - getAccessTokenCredential() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    setRefreshTokenCredential() {
        const notImplErr = "Storage interface - setRefreshTokenCredential() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getRefreshTokenCredential() {
        const notImplErr = "Storage interface - getRefreshTokenCredential() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    setAppMetadata() {
        const notImplErr = "Storage interface - setAppMetadata() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getAppMetadata() {
        const notImplErr = "Storage interface - getAppMetadata() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    setServerTelemetry() {
        const notImplErr = "Storage interface - setServerTelemetry() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getServerTelemetry() {
        const notImplErr = "Storage interface - getServerTelemetry() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    setAuthorityMetadata() {
        const notImplErr = "Storage interface - setAuthorityMetadata() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getAuthorityMetadata() {
        const notImplErr = "Storage interface - getAuthorityMetadata() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getAuthorityMetadataKeys() {
        const notImplErr = "Storage interface - getAuthorityMetadataKeys() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    setThrottlingCache() {
        const notImplErr = "Storage interface - setThrottlingCache() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getThrottlingCache() {
        const notImplErr = "Storage interface - getThrottlingCache() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    removeItem() {
        const notImplErr = "Storage interface - removeItem() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    containsKey() {
        const notImplErr = "Storage interface - containsKey() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    getKeys() {
        const notImplErr = "Storage interface - getKeys() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
    clear() {
        const notImplErr = "Storage interface - clear() has not been implemented for the cacheStorage interface.";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
}
function ownKeys$9(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$9(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source1 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$9(Object(source1), true).forEach(function(key10) {
                _defineProperty(target, key10, source1[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source1));
        } else {
            ownKeys$9(Object(source1)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source1, key10));
            });
        }
    }
    return target;
}
const DEFAULT_SYSTEM_OPTIONS$1 = {
    tokenRenewalOffsetSeconds: 300
};
const DEFAULT_LOGGER_IMPLEMENTATION = {
    loggerCallback: ()=>{
    },
    piiLoggingEnabled: false,
    logLevel: LogLevel1.Info
};
const DEFAULT_NETWORK_IMPLEMENTATION = {
    async sendGetRequestAsync () {
        const notImplErr = "Network interface - sendGetRequestAsync() has not been implemented";
        throw AuthError1.createUnexpectedError(notImplErr);
    },
    async sendPostRequestAsync () {
        const notImplErr = "Network interface - sendPostRequestAsync() has not been implemented";
        throw AuthError1.createUnexpectedError(notImplErr);
    }
};
const DEFAULT_LIBRARY_INFO = {
    sku: Constants.SKU,
    version: version$1,
    cpu: "",
    os: ""
};
const DEFAULT_CLIENT_CREDENTIALS = {
    clientSecret: "",
    clientAssertion: undefined
};
function buildClientConfiguration({ authOptions: userAuthOptions , systemOptions: userSystemOptions , loggerOptions: userLoggerOption , storageInterface: storageImplementation , networkInterface: networkImplementation , cryptoInterface: cryptoImplementation , clientCredentials: clientCredentials , libraryInfo: libraryInfo , serverTelemetryManager: serverTelemetryManager , persistencePlugin: persistencePlugin , serializableCache: serializableCache  }) {
    return {
        authOptions: buildAuthOptions(userAuthOptions),
        systemOptions: _objectSpread$9(_objectSpread$9({
        }, DEFAULT_SYSTEM_OPTIONS$1), userSystemOptions),
        loggerOptions: _objectSpread$9(_objectSpread$9({
        }, DEFAULT_LOGGER_IMPLEMENTATION), userLoggerOption),
        storageInterface: storageImplementation || new DefaultStorageClass(userAuthOptions.clientId, DEFAULT_CRYPTO_IMPLEMENTATION),
        networkInterface: networkImplementation || DEFAULT_NETWORK_IMPLEMENTATION,
        cryptoInterface: cryptoImplementation || DEFAULT_CRYPTO_IMPLEMENTATION,
        clientCredentials: clientCredentials || DEFAULT_CLIENT_CREDENTIALS,
        libraryInfo: _objectSpread$9(_objectSpread$9({
        }, DEFAULT_LIBRARY_INFO), libraryInfo),
        serverTelemetryManager: serverTelemetryManager || null,
        persistencePlugin: persistencePlugin || null,
        serializableCache: serializableCache || null
    };
}
function buildAuthOptions(authOptions) {
    return _objectSpread$9({
        clientCapabilities: []
    }, authOptions);
}
class ServerError1 extends AuthError1 {
    constructor(errorCode3, errorMessage3, subError2){
        super(errorCode3, errorMessage3, subError2);
        this.name = "ServerError";
        Object.setPrototypeOf(this, ServerError1.prototype);
    }
}
class ThrottlingUtils {
    static generateThrottlingStorageKey(thumbprint) {
        return `${ThrottlingConstants.THROTTLING_PREFIX}.${JSON.stringify(thumbprint)}`;
    }
    static preProcess(cacheManager, thumbprint) {
        const key10 = ThrottlingUtils.generateThrottlingStorageKey(thumbprint);
        const value7 = cacheManager.getThrottlingCache(key10);
        if (value7) {
            if (value7.throttleTime < Date.now()) {
                cacheManager.removeItem(key10, CacheSchemaType.THROTTLING);
                return;
            }
            throw new ServerError1(value7.errorCodes?.join(" ") || Constants.EMPTY_STRING, value7.errorMessage, value7.subError);
        }
    }
    static postProcess(cacheManager, thumbprint, response) {
        if (ThrottlingUtils.checkResponseStatus(response) || ThrottlingUtils.checkResponseForRetryAfter(response)) {
            const thumbprintValue = {
                throttleTime: ThrottlingUtils.calculateThrottleTime(parseInt(response.headers[HeaderNames.RETRY_AFTER])),
                error: response.body.error,
                errorCodes: response.body.error_codes,
                errorMessage: response.body.error_description,
                subError: response.body.suberror
            };
            cacheManager.setThrottlingCache(ThrottlingUtils.generateThrottlingStorageKey(thumbprint), thumbprintValue);
        }
    }
    static checkResponseStatus(response) {
        return response.status === 429 || response.status >= 500 && response.status < 600;
    }
    static checkResponseForRetryAfter(response) {
        if (response.headers) {
            return response.headers.hasOwnProperty(HeaderNames.RETRY_AFTER) && (response.status < 200 || response.status >= 300);
        }
        return false;
    }
    static calculateThrottleTime(throttleTime) {
        if (throttleTime <= 0) {
            throttleTime = 0;
        }
        const currentSeconds = Date.now() / 1000;
        return Math.floor(Math.min(currentSeconds + (throttleTime || ThrottlingConstants.DEFAULT_THROTTLE_TIME_SECONDS), currentSeconds + ThrottlingConstants.DEFAULT_MAX_THROTTLE_TIME_SECONDS) * 1000);
    }
    static removeThrottle(cacheManager, clientId, authority, scopes, homeAccountIdentifier) {
        const thumbprint = {
            clientId,
            authority,
            scopes,
            homeAccountIdentifier
        };
        const key10 = this.generateThrottlingStorageKey(thumbprint);
        return cacheManager.removeItem(key10, CacheSchemaType.THROTTLING);
    }
}
class NetworkManager {
    constructor(networkClient1, cacheManager2){
        this.networkClient = networkClient1;
        this.cacheManager = cacheManager2;
    }
    async sendPostRequest(thumbprint, tokenEndpoint, options) {
        ThrottlingUtils.preProcess(this.cacheManager, thumbprint);
        let response;
        try {
            response = await this.networkClient.sendPostRequestAsync(tokenEndpoint, options);
        } catch (e) {
            if (e instanceof AuthError1) {
                throw e;
            } else {
                throw ClientAuthError1.createNetworkError(tokenEndpoint, e);
            }
        }
        ThrottlingUtils.postProcess(this.cacheManager, thumbprint, response);
        return response;
    }
}
class BaseClient {
    constructor(configuration11){
        this.config = buildClientConfiguration(configuration11);
        this.logger = new Logger1(this.config.loggerOptions, name$1, version$1);
        this.cryptoUtils = this.config.cryptoInterface;
        this.cacheManager = this.config.storageInterface;
        this.networkClient = this.config.networkInterface;
        this.networkManager = new NetworkManager(this.networkClient, this.cacheManager);
        this.serverTelemetryManager = this.config.serverTelemetryManager;
        this.authority = this.config.authOptions.authority;
    }
    createDefaultTokenRequestHeaders() {
        const headers = {
        };
        headers[HeaderNames.CONTENT_TYPE] = Constants.URL_FORM_CONTENT_TYPE;
        return headers;
    }
    async executePostToTokenEndpoint(tokenEndpoint, queryString, headers, thumbprint) {
        const response = await this.networkManager.sendPostRequest(thumbprint, tokenEndpoint, {
            body: queryString,
            headers: headers
        });
        if (this.config.serverTelemetryManager && response.status < 500 && response.status !== 429) {
            this.config.serverTelemetryManager.clearTelemetryCache();
        }
        return response;
    }
    updateAuthority(updatedAuthority) {
        if (!updatedAuthority.discoveryComplete()) {
            throw ClientAuthError1.createEndpointDiscoveryIncompleteError("Updated authority has not completed endpoint discovery.");
        }
        this.authority = updatedAuthority;
    }
}
class RequestValidator {
    static validateRedirectUri(redirectUri) {
        if (StringUtils.isEmpty(redirectUri)) {
            throw ClientConfigurationError1.createRedirectUriEmptyError();
        }
    }
    static validatePrompt(prompt) {
        if ([
            PromptValue1.LOGIN,
            PromptValue1.SELECT_ACCOUNT,
            PromptValue1.CONSENT,
            PromptValue1.NONE
        ].indexOf(prompt) < 0) {
            throw ClientConfigurationError1.createInvalidPromptError(prompt);
        }
    }
    static validateClaims(claims) {
        try {
            JSON.parse(claims);
        } catch (e) {
            throw ClientConfigurationError1.createInvalidClaimsRequestError();
        }
    }
    static validateCodeChallengeParams(codeChallenge, codeChallengeMethod) {
        if (StringUtils.isEmpty(codeChallenge) || StringUtils.isEmpty(codeChallengeMethod)) {
            throw ClientConfigurationError1.createInvalidCodeChallengeParamsError();
        } else {
            this.validateCodeChallengeMethod(codeChallengeMethod);
        }
    }
    static validateCodeChallengeMethod(codeChallengeMethod) {
        if ([
            CodeChallengeMethodValues.PLAIN,
            CodeChallengeMethodValues.S256
        ].indexOf(codeChallengeMethod) < 0) {
            throw ClientConfigurationError1.createInvalidCodeChallengeMethodError();
        }
    }
    static sanitizeEQParams(eQParams, queryParams) {
        if (!eQParams) {
            return {
            };
        }
        queryParams.forEach((value7, key10)=>{
            if (eQParams[key10]) {
                delete eQParams[key10];
            }
        });
        return eQParams;
    }
}
class RequestParameterBuilder {
    constructor(){
        this.parameters = new Map();
    }
    addResponseTypeCode() {
        this.parameters.set(AADServerParamKeys.RESPONSE_TYPE, encodeURIComponent(Constants.CODE_RESPONSE_TYPE));
    }
    addResponseMode(responseMode) {
        this.parameters.set(AADServerParamKeys.RESPONSE_MODE, encodeURIComponent(responseMode ? responseMode : ResponseMode1.QUERY));
    }
    addScopes(scopes, addOidcScopes = true) {
        const requestScopes = addOidcScopes ? [
            ...scopes || [],
            ...OIDC_DEFAULT_SCOPES
        ] : scopes || [];
        const scopeSet = new ScopeSet(requestScopes);
        this.parameters.set(AADServerParamKeys.SCOPE, encodeURIComponent(scopeSet.printScopes()));
    }
    addClientId(clientId) {
        this.parameters.set(AADServerParamKeys.CLIENT_ID, encodeURIComponent(clientId));
    }
    addRedirectUri(redirectUri) {
        RequestValidator.validateRedirectUri(redirectUri);
        this.parameters.set(AADServerParamKeys.REDIRECT_URI, encodeURIComponent(redirectUri));
    }
    addPostLogoutRedirectUri(redirectUri) {
        RequestValidator.validateRedirectUri(redirectUri);
        this.parameters.set(AADServerParamKeys.POST_LOGOUT_URI, encodeURIComponent(redirectUri));
    }
    addIdTokenHint(idTokenHint) {
        this.parameters.set(AADServerParamKeys.ID_TOKEN_HINT, encodeURIComponent(idTokenHint));
    }
    addDomainHint(domainHint) {
        this.parameters.set(SSOTypes.DOMAIN_HINT, encodeURIComponent(domainHint));
    }
    addLoginHint(loginHint) {
        this.parameters.set(SSOTypes.LOGIN_HINT, encodeURIComponent(loginHint));
    }
    addSid(sid) {
        this.parameters.set(SSOTypes.SID, encodeURIComponent(sid));
    }
    addClaims(claims, clientCapabilities) {
        const mergedClaims = this.addClientCapabilitiesToClaims(claims, clientCapabilities);
        RequestValidator.validateClaims(mergedClaims);
        this.parameters.set(AADServerParamKeys.CLAIMS, encodeURIComponent(mergedClaims));
    }
    addCorrelationId(correlationId) {
        this.parameters.set(AADServerParamKeys.CLIENT_REQUEST_ID, encodeURIComponent(correlationId));
    }
    addLibraryInfo(libraryInfo) {
        this.parameters.set(AADServerParamKeys.X_CLIENT_SKU, libraryInfo.sku);
        this.parameters.set(AADServerParamKeys.X_CLIENT_VER, libraryInfo.version);
        this.parameters.set(AADServerParamKeys.X_CLIENT_OS, libraryInfo.os);
        this.parameters.set(AADServerParamKeys.X_CLIENT_CPU, libraryInfo.cpu);
    }
    addPrompt(prompt) {
        RequestValidator.validatePrompt(prompt);
        this.parameters.set(`${AADServerParamKeys.PROMPT}`, encodeURIComponent(prompt));
    }
    addState(state) {
        if (!StringUtils.isEmpty(state)) {
            this.parameters.set(AADServerParamKeys.STATE, encodeURIComponent(state));
        }
    }
    addNonce(nonce) {
        this.parameters.set(AADServerParamKeys.NONCE, encodeURIComponent(nonce));
    }
    addCodeChallengeParams(codeChallenge, codeChallengeMethod) {
        RequestValidator.validateCodeChallengeParams(codeChallenge, codeChallengeMethod);
        if (codeChallenge && codeChallengeMethod) {
            this.parameters.set(AADServerParamKeys.CODE_CHALLENGE, encodeURIComponent(codeChallenge));
            this.parameters.set(AADServerParamKeys.CODE_CHALLENGE_METHOD, encodeURIComponent(codeChallengeMethod));
        } else {
            throw ClientConfigurationError1.createInvalidCodeChallengeParamsError();
        }
    }
    addAuthorizationCode(code) {
        this.parameters.set(AADServerParamKeys.CODE, encodeURIComponent(code));
    }
    addDeviceCode(code) {
        this.parameters.set(AADServerParamKeys.DEVICE_CODE, encodeURIComponent(code));
    }
    addRefreshToken(refreshToken) {
        this.parameters.set(AADServerParamKeys.REFRESH_TOKEN, encodeURIComponent(refreshToken));
    }
    addCodeVerifier(codeVerifier) {
        this.parameters.set(AADServerParamKeys.CODE_VERIFIER, encodeURIComponent(codeVerifier));
    }
    addClientSecret(clientSecret) {
        this.parameters.set(AADServerParamKeys.CLIENT_SECRET, encodeURIComponent(clientSecret));
    }
    addClientAssertion(clientAssertion) {
        this.parameters.set(AADServerParamKeys.CLIENT_ASSERTION, encodeURIComponent(clientAssertion));
    }
    addClientAssertionType(clientAssertionType) {
        this.parameters.set(AADServerParamKeys.CLIENT_ASSERTION_TYPE, encodeURIComponent(clientAssertionType));
    }
    addOboAssertion(oboAssertion) {
        this.parameters.set(AADServerParamKeys.OBO_ASSERTION, encodeURIComponent(oboAssertion));
    }
    addRequestTokenUse(tokenUse) {
        this.parameters.set(AADServerParamKeys.REQUESTED_TOKEN_USE, encodeURIComponent(tokenUse));
    }
    addGrantType(grantType) {
        this.parameters.set(AADServerParamKeys.GRANT_TYPE, encodeURIComponent(grantType));
    }
    addClientInfo() {
        this.parameters.set(ClientInfo, "1");
    }
    addExtraQueryParameters(eQparams) {
        RequestValidator.sanitizeEQParams(eQparams, this.parameters);
        Object.keys(eQparams).forEach((key10)=>{
            this.parameters.set(key10, eQparams[key10]);
        });
    }
    addClientCapabilitiesToClaims(claims, clientCapabilities) {
        let mergedClaims;
        if (!claims) {
            mergedClaims = {
            };
        } else {
            try {
                mergedClaims = JSON.parse(claims);
            } catch (e) {
                throw ClientConfigurationError1.createInvalidClaimsRequestError();
            }
        }
        if (clientCapabilities && clientCapabilities.length > 0) {
            if (!mergedClaims.hasOwnProperty(ClaimsRequestKeys.ACCESS_TOKEN)) {
                mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN] = {
                };
            }
            mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN][ClaimsRequestKeys.XMS_CC] = {
                values: clientCapabilities
            };
        }
        return JSON.stringify(mergedClaims);
    }
    addUsername(username) {
        this.parameters.set(PasswordGrantConstants.username, username);
    }
    addPassword(password) {
        this.parameters.set(PasswordGrantConstants.password, password);
    }
    addPopToken(cnfString) {
        if (!StringUtils.isEmpty(cnfString)) {
            this.parameters.set(AADServerParamKeys.TOKEN_TYPE, AuthenticationScheme.POP);
            this.parameters.set(AADServerParamKeys.REQ_CNF, encodeURIComponent(cnfString));
        }
    }
    addServerTelemetry(serverTelemetryManager) {
        this.parameters.set(AADServerParamKeys.X_CLIENT_CURR_TELEM, serverTelemetryManager.generateCurrentRequestHeaderValue());
        this.parameters.set(AADServerParamKeys.X_CLIENT_LAST_TELEM, serverTelemetryManager.generateLastRequestHeaderValue());
    }
    addThrottling() {
        this.parameters.set(AADServerParamKeys.X_MS_LIB_CAPABILITY, ThrottlingConstants.X_MS_LIB_CAPABILITY_VALUE);
    }
    createQueryString() {
        const queryParameterArray = new Array();
        this.parameters.forEach((value7, key10)=>{
            queryParameterArray.push(`${key10}=${value7}`);
        });
        return queryParameterArray.join("&");
    }
}
class IdTokenEntity extends CredentialEntity {
    static createIdTokenEntity(homeAccountId, environment, idToken, clientId, tenantId, oboAssertion) {
        const idTokenEntity = new IdTokenEntity();
        idTokenEntity.credentialType = CredentialType.ID_TOKEN;
        idTokenEntity.homeAccountId = homeAccountId;
        idTokenEntity.environment = environment;
        idTokenEntity.clientId = clientId;
        idTokenEntity.secret = idToken;
        idTokenEntity.realm = tenantId;
        idTokenEntity.oboAssertion = oboAssertion;
        return idTokenEntity;
    }
    static isIdTokenEntity(entity) {
        if (!entity) {
            return false;
        }
        return entity.hasOwnProperty("homeAccountId") && entity.hasOwnProperty("environment") && entity.hasOwnProperty("credentialType") && entity.hasOwnProperty("realm") && entity.hasOwnProperty("clientId") && entity.hasOwnProperty("secret") && entity["credentialType"] === CredentialType.ID_TOKEN;
    }
}
class TimeUtils {
    static nowSeconds() {
        return Math.round(new Date().getTime() / 1000);
    }
    static isTokenExpired(expiresOn, offset) {
        const expirationSec = Number(expiresOn) || 0;
        const offsetCurrentTimeSec = TimeUtils.nowSeconds() + offset;
        return offsetCurrentTimeSec > expirationSec;
    }
}
class AccessTokenEntity extends CredentialEntity {
    static createAccessTokenEntity(homeAccountId, environment, accessToken, clientId, tenantId, scopes, expiresOn, extExpiresOn, cryptoUtils, refreshOn, tokenType, oboAssertion) {
        const atEntity = new AccessTokenEntity();
        atEntity.homeAccountId = homeAccountId;
        atEntity.credentialType = CredentialType.ACCESS_TOKEN;
        atEntity.secret = accessToken;
        const currentTime = TimeUtils.nowSeconds();
        atEntity.cachedAt = currentTime.toString();
        atEntity.expiresOn = expiresOn.toString();
        atEntity.extendedExpiresOn = extExpiresOn.toString();
        if (refreshOn) {
            atEntity.refreshOn = refreshOn.toString();
        }
        atEntity.environment = environment;
        atEntity.clientId = clientId;
        atEntity.realm = tenantId;
        atEntity.target = scopes;
        atEntity.oboAssertion = oboAssertion;
        atEntity.tokenType = StringUtils.isEmpty(tokenType) ? AuthenticationScheme.BEARER : tokenType;
        if (atEntity.tokenType === AuthenticationScheme.POP) {
            atEntity.credentialType = CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
            const tokenClaims = AuthToken.extractTokenClaims(accessToken, cryptoUtils);
            if (!tokenClaims?.cnf?.kid) {
                throw ClientAuthError1.createTokenClaimsRequiredError();
            }
            atEntity.keyId = tokenClaims.cnf.kid;
        }
        return atEntity;
    }
    static isAccessTokenEntity(entity) {
        if (!entity) {
            return false;
        }
        return entity.hasOwnProperty("homeAccountId") && entity.hasOwnProperty("environment") && entity.hasOwnProperty("credentialType") && entity.hasOwnProperty("realm") && entity.hasOwnProperty("clientId") && entity.hasOwnProperty("secret") && entity.hasOwnProperty("target") && (entity["credentialType"] === CredentialType.ACCESS_TOKEN || entity["credentialType"] === CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME);
    }
}
class RefreshTokenEntity extends CredentialEntity {
    static createRefreshTokenEntity(homeAccountId, environment, refreshToken, clientId, familyId, oboAssertion) {
        const rtEntity = new RefreshTokenEntity();
        rtEntity.clientId = clientId;
        rtEntity.credentialType = CredentialType.REFRESH_TOKEN;
        rtEntity.environment = environment;
        rtEntity.homeAccountId = homeAccountId;
        rtEntity.secret = refreshToken;
        rtEntity.oboAssertion = oboAssertion;
        if (familyId) rtEntity.familyId = familyId;
        return rtEntity;
    }
    static isRefreshTokenEntity(entity) {
        if (!entity) {
            return false;
        }
        return entity.hasOwnProperty("homeAccountId") && entity.hasOwnProperty("environment") && entity.hasOwnProperty("credentialType") && entity.hasOwnProperty("clientId") && entity.hasOwnProperty("secret") && entity["credentialType"] === CredentialType.REFRESH_TOKEN;
    }
}
const InteractionRequiredAuthErrorMessage = [
    "interaction_required",
    "consent_required",
    "login_required"
];
const InteractionRequiredAuthSubErrorMessage = [
    "message_only",
    "additional_action",
    "basic_action",
    "user_password_expired",
    "consent_required"
];
class InteractionRequiredAuthError1 extends ServerError1 {
    constructor(errorCode4, errorMessage4, subError1){
        super(errorCode4, errorMessage4, subError1);
        this.name = "InteractionRequiredAuthError";
        Object.setPrototypeOf(this, InteractionRequiredAuthError1.prototype);
    }
    static isInteractionRequiredError(errorCode, errorString, subError) {
        const isInteractionRequiredErrorCode = !!errorCode && InteractionRequiredAuthErrorMessage.indexOf(errorCode) > -1;
        const isInteractionRequiredSubError = !!subError && InteractionRequiredAuthSubErrorMessage.indexOf(subError) > -1;
        const isInteractionRequiredErrorDesc = !!errorString && InteractionRequiredAuthErrorMessage.some((irErrorCode)=>{
            return errorString.indexOf(irErrorCode) > -1;
        });
        return isInteractionRequiredErrorCode || isInteractionRequiredErrorDesc || isInteractionRequiredSubError;
    }
}
class CacheRecord {
    constructor(accountEntity, idTokenEntity, accessTokenEntity, refreshTokenEntity, appMetadataEntity){
        this.account = accountEntity || null;
        this.idToken = idTokenEntity || null;
        this.accessToken = accessTokenEntity || null;
        this.refreshToken = refreshTokenEntity || null;
        this.appMetadata = appMetadataEntity || null;
    }
}
class ProtocolUtils {
    static setRequestState(cryptoObj, userState, meta) {
        const libraryState = ProtocolUtils.generateLibraryState(cryptoObj, meta);
        return !StringUtils.isEmpty(userState) ? `${libraryState}${Constants.RESOURCE_DELIM}${userState}` : libraryState;
    }
    static generateLibraryState(cryptoObj, meta) {
        if (!cryptoObj) {
            throw ClientAuthError1.createNoCryptoObjectError("generateLibraryState");
        }
        const stateObj = {
            id: cryptoObj.createNewGuid()
        };
        if (meta) {
            stateObj.meta = meta;
        }
        const stateString = JSON.stringify(stateObj);
        return cryptoObj.base64Encode(stateString);
    }
    static parseRequestState(cryptoObj, state) {
        if (!cryptoObj) {
            throw ClientAuthError1.createNoCryptoObjectError("parseRequestState");
        }
        if (StringUtils.isEmpty(state)) {
            throw ClientAuthError1.createInvalidStateError(state, "Null, undefined or empty state");
        }
        try {
            const splitState = decodeURIComponent(state).split(Constants.RESOURCE_DELIM);
            const libraryState = splitState[0];
            const userState = splitState.length > 1 ? splitState.slice(1).join(Constants.RESOURCE_DELIM) : "";
            const libraryStateString = cryptoObj.base64Decode(libraryState);
            const libraryStateObj = JSON.parse(libraryStateString);
            return {
                userRequestState: !StringUtils.isEmpty(userState) ? userState : "",
                libraryState: libraryStateObj
            };
        } catch (e) {
            throw ClientAuthError1.createInvalidStateError(state, e);
        }
    }
}
class UrlString {
    constructor(url1){
        this._urlString = url1;
        if (StringUtils.isEmpty(this._urlString)) {
            throw ClientConfigurationError1.createUrlEmptyError();
        }
        if (StringUtils.isEmpty(this.getHash())) {
            this._urlString = UrlString.canonicalizeUri(url1);
        }
    }
    get urlString() {
        return this._urlString;
    }
    static canonicalizeUri(url) {
        if (url) {
            url = url.toLowerCase();
            if (StringUtils.endsWith(url, "?")) {
                url = url.slice(0, -1);
            } else if (StringUtils.endsWith(url, "?/")) {
                url = url.slice(0, -2);
            }
            if (!StringUtils.endsWith(url, "/")) {
                url += "/";
            }
        }
        return url;
    }
    validateAsUri() {
        let components;
        try {
            components = this.getUrlComponents();
        } catch (e) {
            throw ClientConfigurationError1.createUrlParseError(e);
        }
        if (!components.HostNameAndPort || !components.PathSegments) {
            throw ClientConfigurationError1.createUrlParseError(`Given url string: ${this.urlString}`);
        }
        if (!components.Protocol || components.Protocol.toLowerCase() !== "https:") {
            throw ClientConfigurationError1.createInsecureAuthorityUriError(this.urlString);
        }
    }
    urlRemoveQueryStringParameter(name) {
        let regex = new RegExp("(\\&" + name + "=)[^\&]+");
        this._urlString = this.urlString.replace(regex, "");
        regex = new RegExp("(" + name + "=)[^\&]+&");
        this._urlString = this.urlString.replace(regex, "");
        regex = new RegExp("(" + name + "=)[^\&]+");
        this._urlString = this.urlString.replace(regex, "");
        return this.urlString;
    }
    static appendQueryString(url, queryString) {
        if (StringUtils.isEmpty(queryString)) {
            return url;
        }
        return url.indexOf("?") < 0 ? `${url}?${queryString}` : `${url}&${queryString}`;
    }
    static removeHashFromUrl(url) {
        return UrlString.canonicalizeUri(url.split("#")[0]);
    }
    replaceTenantPath(tenantId) {
        const urlObject = this.getUrlComponents();
        const pathArray = urlObject.PathSegments;
        if (tenantId && pathArray.length !== 0 && (pathArray[0] === AADAuthorityConstants.COMMON || pathArray[0] === AADAuthorityConstants.ORGANIZATIONS)) {
            pathArray[0] = tenantId;
        }
        return UrlString.constructAuthorityUriFromObject(urlObject);
    }
    getHash() {
        return UrlString.parseHash(this.urlString);
    }
    getUrlComponents() {
        const regEx = RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
        const match = this.urlString.match(regEx);
        if (!match) {
            throw ClientConfigurationError1.createUrlParseError(`Given url string: ${this.urlString}`);
        }
        const urlComponents = {
            Protocol: match[1],
            HostNameAndPort: match[4],
            AbsolutePath: match[5],
            QueryString: match[7]
        };
        let pathSegments = urlComponents.AbsolutePath.split("/");
        pathSegments = pathSegments.filter((val)=>val && val.length > 0
        );
        urlComponents.PathSegments = pathSegments;
        if (!StringUtils.isEmpty(urlComponents.QueryString) && urlComponents.QueryString.endsWith("/")) {
            urlComponents.QueryString = urlComponents.QueryString.substring(0, urlComponents.QueryString.length - 1);
        }
        return urlComponents;
    }
    static getDomainFromUrl(url) {
        const regEx = RegExp("^([^:/?#]+://)?([^/?#]*)");
        const match = url.match(regEx);
        if (!match) {
            throw ClientConfigurationError1.createUrlParseError(`Given url string: ${url}`);
        }
        return match[2];
    }
    static getAbsoluteUrl(relativeUrl, baseUrl) {
        if (relativeUrl[0] === Constants.FORWARD_SLASH) {
            const url2 = new UrlString(baseUrl);
            const baseComponents = url2.getUrlComponents();
            return baseComponents.Protocol + "//" + baseComponents.HostNameAndPort + relativeUrl;
        }
        return relativeUrl;
    }
    static parseHash(hashString) {
        const hashIndex1 = hashString.indexOf("#");
        const hashIndex2 = hashString.indexOf("#/");
        if (hashIndex2 > -1) {
            return hashString.substring(hashIndex2 + 2);
        } else if (hashIndex1 > -1) {
            return hashString.substring(hashIndex1 + 1);
        }
        return "";
    }
    static constructAuthorityUriFromObject(urlObject) {
        return new UrlString(urlObject.Protocol + "//" + urlObject.HostNameAndPort + "/" + urlObject.PathSegments.join("/"));
    }
    static getDeserializedHash(hash) {
        if (StringUtils.isEmpty(hash)) {
            return {
            };
        }
        const parsedHash = UrlString.parseHash(hash);
        const deserializedHash = StringUtils.queryStringToObject(StringUtils.isEmpty(parsedHash) ? hash : parsedHash);
        if (!deserializedHash) {
            throw ClientAuthError1.createHashNotDeserializedError(JSON.stringify(deserializedHash));
        }
        return deserializedHash;
    }
    static hashContainsKnownProperties(hash) {
        if (StringUtils.isEmpty(hash)) {
            return false;
        }
        const parameters = UrlString.getDeserializedHash(hash);
        return !!(parameters.code || parameters.error_description || parameters.error || parameters.state);
    }
}
var KeyLocation;
(function(KeyLocation1) {
    KeyLocation1["SW"] = "sw";
    KeyLocation1["UHW"] = "uhw";
})(KeyLocation || (KeyLocation = {
}));
class PopTokenGenerator {
    constructor(cryptoUtils){
        this.cryptoUtils = cryptoUtils;
    }
    async generateCnf(request) {
        const kidThumbprint = await this.cryptoUtils.getPublicKeyThumbprint(request);
        const reqCnf = {
            kid: kidThumbprint,
            xms_ksl: KeyLocation.SW
        };
        return this.cryptoUtils.base64Encode(JSON.stringify(reqCnf));
    }
    async signPopToken(accessToken, request) {
        const tokenClaims = AuthToken.extractTokenClaims(accessToken, this.cryptoUtils);
        const { resourceRequestMethod , resourceRequestUri , shrClaims  } = request;
        const resourceUrlString = resourceRequestUri ? new UrlString(resourceRequestUri) : undefined;
        const resourceUrlComponents = resourceUrlString?.getUrlComponents();
        if (!tokenClaims?.cnf?.kid) {
            throw ClientAuthError1.createTokenClaimsRequiredError();
        }
        return await this.cryptoUtils.signJwt({
            at: accessToken,
            ts: TimeUtils.nowSeconds(),
            m: resourceRequestMethod?.toUpperCase(),
            u: resourceUrlComponents?.HostNameAndPort,
            nonce: this.cryptoUtils.createNewGuid(),
            p: resourceUrlComponents?.AbsolutePath,
            q: resourceUrlComponents?.QueryString ? [
                [],
                resourceUrlComponents.QueryString
            ] : undefined,
            client_claims: shrClaims || undefined
        }, tokenClaims.cnf.kid);
    }
}
class AppMetadataEntity {
    generateAppMetadataKey() {
        return AppMetadataEntity.generateAppMetadataCacheKey(this.environment, this.clientId);
    }
    static generateAppMetadataCacheKey(environment, clientId) {
        const appMetaDataKeyArray = [
            APP_METADATA,
            environment,
            clientId
        ];
        return appMetaDataKeyArray.join(Separators.CACHE_KEY_SEPARATOR).toLowerCase();
    }
    static createAppMetadataEntity(clientId, environment, familyId) {
        const appMetadata = new AppMetadataEntity();
        appMetadata.clientId = clientId;
        appMetadata.environment = environment;
        if (familyId) {
            appMetadata.familyId = familyId;
        }
        return appMetadata;
    }
    static isAppMetadataEntity(key, entity) {
        if (!entity) {
            return false;
        }
        return key.indexOf(APP_METADATA) === 0 && entity.hasOwnProperty("clientId") && entity.hasOwnProperty("environment");
    }
}
class TokenCacheContext1 {
    constructor(tokenCache, hasChanged){
        this.cache = tokenCache;
        this.hasChanged = hasChanged;
    }
    get cacheHasChanged() {
        return this.hasChanged;
    }
    get tokenCache() {
        return this.cache;
    }
}
class ResponseHandler {
    constructor(clientId2, cacheStorage, cryptoObj1, logger3, serializableCache, persistencePlugin){
        this.clientId = clientId2;
        this.cacheStorage = cacheStorage;
        this.cryptoObj = cryptoObj1;
        this.logger = logger3;
        this.serializableCache = serializableCache;
        this.persistencePlugin = persistencePlugin;
    }
    validateServerAuthorizationCodeResponse(serverResponseHash, cachedState, cryptoObj) {
        if (!serverResponseHash.state || !cachedState) {
            throw !serverResponseHash.state ? ClientAuthError1.createStateNotFoundError("Server State") : ClientAuthError1.createStateNotFoundError("Cached State");
        }
        if (decodeURIComponent(serverResponseHash.state) !== decodeURIComponent(cachedState)) {
            throw ClientAuthError1.createStateMismatchError();
        }
        if (serverResponseHash.error || serverResponseHash.error_description || serverResponseHash.suberror) {
            if (InteractionRequiredAuthError1.isInteractionRequiredError(serverResponseHash.error, serverResponseHash.error_description, serverResponseHash.suberror)) {
                throw new InteractionRequiredAuthError1(serverResponseHash.error || Constants.EMPTY_STRING, serverResponseHash.error_description, serverResponseHash.suberror);
            }
            throw new ServerError1(serverResponseHash.error || Constants.EMPTY_STRING, serverResponseHash.error_description, serverResponseHash.suberror);
        }
        if (serverResponseHash.client_info) {
            buildClientInfo(serverResponseHash.client_info, cryptoObj);
        }
    }
    validateTokenResponse(serverResponse) {
        if (serverResponse.error || serverResponse.error_description || serverResponse.suberror) {
            if (InteractionRequiredAuthError1.isInteractionRequiredError(serverResponse.error, serverResponse.error_description, serverResponse.suberror)) {
                throw new InteractionRequiredAuthError1(serverResponse.error, serverResponse.error_description, serverResponse.suberror);
            }
            const errString = `${serverResponse.error_codes} - [${serverResponse.timestamp}]: ${serverResponse.error_description} - Correlation ID: ${serverResponse.correlation_id} - Trace ID: ${serverResponse.trace_id}`;
            throw new ServerError1(serverResponse.error, errString, serverResponse.suberror);
        }
    }
    async handleServerTokenResponse(serverTokenResponse, authority, reqTimestamp, request, authCodePayload, oboAssertion, handlingRefreshTokenResponse) {
        let idTokenObj;
        if (serverTokenResponse.id_token) {
            idTokenObj = new AuthToken(serverTokenResponse.id_token || Constants.EMPTY_STRING, this.cryptoObj);
            if (authCodePayload && !StringUtils.isEmpty(authCodePayload.nonce)) {
                if (idTokenObj.claims.nonce !== authCodePayload.nonce) {
                    throw ClientAuthError1.createNonceMismatchError();
                }
            }
        }
        this.homeAccountIdentifier = AccountEntity.generateHomeAccountId(serverTokenResponse.client_info || Constants.EMPTY_STRING, authority.authorityType, this.logger, this.cryptoObj, idTokenObj);
        let requestStateObj;
        if (!!authCodePayload && !!authCodePayload.state) {
            requestStateObj = ProtocolUtils.parseRequestState(this.cryptoObj, authCodePayload.state);
        }
        const cacheRecord = this.generateCacheRecord(serverTokenResponse, authority, reqTimestamp, idTokenObj, request.scopes, oboAssertion, authCodePayload);
        let cacheContext;
        try {
            if (this.persistencePlugin && this.serializableCache) {
                this.logger.verbose("Persistence enabled, calling beforeCacheAccess");
                cacheContext = new TokenCacheContext1(this.serializableCache, true);
                await this.persistencePlugin.beforeCacheAccess(cacheContext);
            }
            if (handlingRefreshTokenResponse && cacheRecord.account) {
                const key10 = cacheRecord.account.generateAccountKey();
                const account = this.cacheStorage.getAccount(key10);
                if (!account) {
                    this.logger.warning("Account used to refresh tokens not in persistence, refreshed tokens will not be stored in the cache");
                    return ResponseHandler.generateAuthenticationResult(this.cryptoObj, authority, cacheRecord, false, request, idTokenObj, requestStateObj);
                }
            }
            this.cacheStorage.saveCacheRecord(cacheRecord);
        } finally{
            if (this.persistencePlugin && this.serializableCache && cacheContext) {
                this.logger.verbose("Persistence enabled, calling afterCacheAccess");
                await this.persistencePlugin.afterCacheAccess(cacheContext);
            }
        }
        return ResponseHandler.generateAuthenticationResult(this.cryptoObj, authority, cacheRecord, false, request, idTokenObj, requestStateObj);
    }
    generateCacheRecord(serverTokenResponse, authority, reqTimestamp, idTokenObj, requestScopes, oboAssertion, authCodePayload) {
        const env2 = authority.getPreferredCache();
        if (StringUtils.isEmpty(env2)) {
            throw ClientAuthError1.createInvalidCacheEnvironmentError();
        }
        let cachedIdToken;
        let cachedAccount;
        if (!StringUtils.isEmpty(serverTokenResponse.id_token) && !!idTokenObj) {
            cachedIdToken = IdTokenEntity.createIdTokenEntity(this.homeAccountIdentifier, env2, serverTokenResponse.id_token || Constants.EMPTY_STRING, this.clientId, idTokenObj.claims.tid || Constants.EMPTY_STRING, oboAssertion);
            cachedAccount = this.generateAccountEntity(serverTokenResponse, idTokenObj, authority, oboAssertion, authCodePayload);
        }
        let cachedAccessToken = null;
        if (!StringUtils.isEmpty(serverTokenResponse.access_token)) {
            const responseScopes = serverTokenResponse.scope ? ScopeSet.fromString(serverTokenResponse.scope) : new ScopeSet(requestScopes || []);
            const expiresIn = (typeof serverTokenResponse.expires_in === "string" ? parseInt(serverTokenResponse.expires_in, 10) : serverTokenResponse.expires_in) || 0;
            const extExpiresIn = (typeof serverTokenResponse.ext_expires_in === "string" ? parseInt(serverTokenResponse.ext_expires_in, 10) : serverTokenResponse.ext_expires_in) || 0;
            const refreshIn = (typeof serverTokenResponse.refresh_in === "string" ? parseInt(serverTokenResponse.refresh_in, 10) : serverTokenResponse.refresh_in) || undefined;
            const tokenExpirationSeconds = reqTimestamp + expiresIn;
            const extendedTokenExpirationSeconds = tokenExpirationSeconds + extExpiresIn;
            const refreshOnSeconds = refreshIn && refreshIn > 0 ? reqTimestamp + refreshIn : undefined;
            cachedAccessToken = AccessTokenEntity.createAccessTokenEntity(this.homeAccountIdentifier, env2, serverTokenResponse.access_token || Constants.EMPTY_STRING, this.clientId, idTokenObj ? idTokenObj.claims.tid || Constants.EMPTY_STRING : authority.tenant, responseScopes.printScopes(), tokenExpirationSeconds, extendedTokenExpirationSeconds, this.cryptoObj, refreshOnSeconds, serverTokenResponse.token_type, oboAssertion);
        }
        let cachedRefreshToken = null;
        if (!StringUtils.isEmpty(serverTokenResponse.refresh_token)) {
            cachedRefreshToken = RefreshTokenEntity.createRefreshTokenEntity(this.homeAccountIdentifier, env2, serverTokenResponse.refresh_token || Constants.EMPTY_STRING, this.clientId, serverTokenResponse.foci, oboAssertion);
        }
        let cachedAppMetadata = null;
        if (!StringUtils.isEmpty(serverTokenResponse.foci)) {
            cachedAppMetadata = AppMetadataEntity.createAppMetadataEntity(this.clientId, env2, serverTokenResponse.foci);
        }
        return new CacheRecord(cachedAccount, cachedIdToken, cachedAccessToken, cachedRefreshToken, cachedAppMetadata);
    }
    generateAccountEntity(serverTokenResponse, idToken, authority, oboAssertion, authCodePayload) {
        const authorityType = authority.authorityType;
        const cloudGraphHostName = authCodePayload ? authCodePayload.cloud_graph_host_name : "";
        const msGraphhost = authCodePayload ? authCodePayload.msgraph_host : "";
        if (authorityType === AuthorityType.Adfs) {
            this.logger.verbose("Authority type is ADFS, creating ADFS account");
            return AccountEntity.createGenericAccount(authority, this.homeAccountIdentifier, idToken, oboAssertion, cloudGraphHostName, msGraphhost);
        }
        if (StringUtils.isEmpty(serverTokenResponse.client_info) && authority.protocolMode === "AAD") {
            throw ClientAuthError1.createClientInfoEmptyError();
        }
        return serverTokenResponse.client_info ? AccountEntity.createAccount(serverTokenResponse.client_info, this.homeAccountIdentifier, authority, idToken, oboAssertion, cloudGraphHostName, msGraphhost) : AccountEntity.createGenericAccount(authority, this.homeAccountIdentifier, idToken, oboAssertion, cloudGraphHostName, msGraphhost);
    }
    static async generateAuthenticationResult(cryptoObj, authority, cacheRecord, fromTokenCache, request, idTokenObj, requestState) {
        let accessToken = "";
        let responseScopes = [];
        let expiresOn = null;
        let extExpiresOn;
        let familyId = Constants.EMPTY_STRING;
        if (cacheRecord.accessToken) {
            if (cacheRecord.accessToken.tokenType === AuthenticationScheme.POP) {
                const popTokenGenerator = new PopTokenGenerator(cryptoObj);
                accessToken = await popTokenGenerator.signPopToken(cacheRecord.accessToken.secret, request);
            } else {
                accessToken = cacheRecord.accessToken.secret;
            }
            responseScopes = ScopeSet.fromString(cacheRecord.accessToken.target).asArray();
            expiresOn = new Date(Number(cacheRecord.accessToken.expiresOn) * 1000);
            extExpiresOn = new Date(Number(cacheRecord.accessToken.extendedExpiresOn) * 1000);
        }
        if (cacheRecord.appMetadata) {
            familyId = cacheRecord.appMetadata.familyId === THE_FAMILY_ID ? THE_FAMILY_ID : Constants.EMPTY_STRING;
        }
        const uid = idTokenObj?.claims.oid || idTokenObj?.claims.sub || Constants.EMPTY_STRING;
        const tid = idTokenObj?.claims.tid || Constants.EMPTY_STRING;
        return {
            authority: authority.canonicalAuthority,
            uniqueId: uid,
            tenantId: tid,
            scopes: responseScopes,
            account: cacheRecord.account ? cacheRecord.account.getAccountInfo() : null,
            idToken: idTokenObj ? idTokenObj.rawToken : Constants.EMPTY_STRING,
            idTokenClaims: idTokenObj ? idTokenObj.claims : {
            },
            accessToken: accessToken,
            fromCache: fromTokenCache,
            expiresOn: expiresOn,
            extExpiresOn: extExpiresOn,
            familyId: familyId,
            tokenType: cacheRecord.accessToken?.tokenType || Constants.EMPTY_STRING,
            state: requestState ? requestState.userRequestState : Constants.EMPTY_STRING,
            cloudGraphHostName: cacheRecord.account?.cloudGraphHostName || Constants.EMPTY_STRING,
            msGraphHost: cacheRecord.account?.msGraphHost || Constants.EMPTY_STRING
        };
    }
}
function ownKeys$8(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$8(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source2 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$8(Object(source2), true).forEach(function(key10) {
                _defineProperty(target, key10, source2[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source2));
        } else {
            ownKeys$8(Object(source2)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source2, key10));
            });
        }
    }
    return target;
}
class AuthorizationCodeClient extends BaseClient {
    constructor(configuration1){
        super(configuration1);
    }
    async getAuthCodeUrl(request) {
        const queryString = this.createAuthCodeUrlQueryString(request);
        return UrlString.appendQueryString(this.authority.authorizationEndpoint, queryString);
    }
    async acquireToken(request, authCodePayload) {
        this.logger.info("in acquireToken call");
        if (!request || StringUtils.isEmpty(request.code)) {
            throw ClientAuthError1.createTokenRequestCannotBeMadeError();
        }
        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.executeTokenRequest(this.authority, request);
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        responseHandler.validateTokenResponse(response.body);
        return await responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request, authCodePayload);
    }
    handleFragmentResponse(hashFragment, cachedState) {
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, null, null);
        const hashUrlString = new UrlString(hashFragment);
        const serverParams = UrlString.getDeserializedHash(hashUrlString.getHash());
        responseHandler.validateServerAuthorizationCodeResponse(serverParams, cachedState, this.cryptoUtils);
        if (!serverParams.code) {
            throw ClientAuthError1.createNoAuthCodeInServerResponseError();
        }
        return _objectSpread$8(_objectSpread$8({
        }, serverParams), {
        }, {
            code: serverParams.code
        });
    }
    getLogoutUri(logoutRequest) {
        if (!logoutRequest) {
            throw ClientConfigurationError1.createEmptyLogoutRequestError();
        }
        if (logoutRequest.account) {
            this.cacheManager.removeAccount(AccountEntity.generateAccountCacheKey(logoutRequest.account));
        } else {
            this.cacheManager.clear();
        }
        const queryString = this.createLogoutUrlQueryString(logoutRequest);
        return StringUtils.isEmpty(queryString) ? this.authority.endSessionEndpoint : `${this.authority.endSessionEndpoint}?${queryString}`;
    }
    async executeTokenRequest(authority, request) {
        const thumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: authority.canonicalAuthority,
            scopes: request.scopes
        };
        const requestBody = await this.createTokenRequestBody(request);
        const queryParameters = this.createTokenQueryParameters(request);
        const headers = this.createDefaultTokenRequestHeaders();
        const endpoint = StringUtils.isEmpty(queryParameters) ? authority.tokenEndpoint : `${authority.tokenEndpoint}?${queryParameters}`;
        return this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint);
    }
    createTokenQueryParameters(request) {
        const parameterBuilder = new RequestParameterBuilder();
        if (request.tokenQueryParameters) {
            parameterBuilder.addExtraQueryParameters(request.tokenQueryParameters);
        }
        return parameterBuilder.createQueryString();
    }
    async createTokenRequestBody(request) {
        const parameterBuilder = new RequestParameterBuilder();
        parameterBuilder.addClientId(this.config.authOptions.clientId);
        parameterBuilder.addRedirectUri(request.redirectUri);
        parameterBuilder.addScopes(request.scopes);
        parameterBuilder.addAuthorizationCode(request.code);
        parameterBuilder.addLibraryInfo(this.config.libraryInfo);
        parameterBuilder.addThrottling();
        if (this.serverTelemetryManager) {
            parameterBuilder.addServerTelemetry(this.serverTelemetryManager);
        }
        if (request.codeVerifier) {
            parameterBuilder.addCodeVerifier(request.codeVerifier);
        }
        if (this.config.clientCredentials.clientSecret) {
            parameterBuilder.addClientSecret(this.config.clientCredentials.clientSecret);
        }
        if (this.config.clientCredentials.clientAssertion) {
            const clientAssertion = this.config.clientCredentials.clientAssertion;
            parameterBuilder.addClientAssertion(clientAssertion.assertion);
            parameterBuilder.addClientAssertionType(clientAssertion.assertionType);
        }
        parameterBuilder.addGrantType(GrantType.AUTHORIZATION_CODE_GRANT);
        parameterBuilder.addClientInfo();
        if (request.authenticationScheme === AuthenticationScheme.POP) {
            const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils);
            const cnfString = await popTokenGenerator.generateCnf(request);
            parameterBuilder.addPopToken(cnfString);
        }
        const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
        parameterBuilder.addCorrelationId(correlationId);
        if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
            parameterBuilder.addClaims(request.claims, this.config.authOptions.clientCapabilities);
        }
        return parameterBuilder.createQueryString();
    }
    createAuthCodeUrlQueryString(request) {
        const parameterBuilder = new RequestParameterBuilder();
        parameterBuilder.addClientId(this.config.authOptions.clientId);
        const requestScopes = [
            ...request.scopes || [],
            ...request.extraScopesToConsent || []
        ];
        parameterBuilder.addScopes(requestScopes);
        parameterBuilder.addRedirectUri(request.redirectUri);
        const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
        parameterBuilder.addCorrelationId(correlationId);
        parameterBuilder.addResponseMode(request.responseMode);
        parameterBuilder.addResponseTypeCode();
        parameterBuilder.addLibraryInfo(this.config.libraryInfo);
        parameterBuilder.addClientInfo();
        if (request.codeChallenge && request.codeChallengeMethod) {
            parameterBuilder.addCodeChallengeParams(request.codeChallenge, request.codeChallengeMethod);
        }
        if (request.prompt) {
            parameterBuilder.addPrompt(request.prompt);
        }
        if (request.domainHint) {
            parameterBuilder.addDomainHint(request.domainHint);
        }
        if (request.prompt !== PromptValue1.SELECT_ACCOUNT) {
            if (request.sid && request.prompt === PromptValue1.NONE) {
                this.logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from request");
                parameterBuilder.addSid(request.sid);
            } else if (request.account) {
                const accountSid = this.extractAccountSid(request.account);
                if (accountSid && request.prompt === PromptValue1.NONE) {
                    this.logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from account");
                    parameterBuilder.addSid(accountSid);
                } else if (request.loginHint) {
                    this.logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from request");
                    parameterBuilder.addLoginHint(request.loginHint);
                } else if (request.account.username) {
                    this.logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from account");
                    parameterBuilder.addLoginHint(request.account.username);
                }
            } else if (request.loginHint) {
                this.logger.verbose("createAuthCodeUrlQueryString: No account, adding login_hint from request");
                parameterBuilder.addLoginHint(request.loginHint);
            }
        } else {
            this.logger.verbose("createAuthCodeUrlQueryString: Prompt is select_account, ignoring account hints");
        }
        if (request.nonce) {
            parameterBuilder.addNonce(request.nonce);
        }
        if (request.state) {
            parameterBuilder.addState(request.state);
        }
        if (!StringUtils.isEmpty(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
            parameterBuilder.addClaims(request.claims, this.config.authOptions.clientCapabilities);
        }
        if (request.extraQueryParameters) {
            parameterBuilder.addExtraQueryParameters(request.extraQueryParameters);
        }
        return parameterBuilder.createQueryString();
    }
    createLogoutUrlQueryString(request) {
        const parameterBuilder = new RequestParameterBuilder();
        if (request.postLogoutRedirectUri) {
            parameterBuilder.addPostLogoutRedirectUri(request.postLogoutRedirectUri);
        }
        if (request.correlationId) {
            parameterBuilder.addCorrelationId(request.correlationId);
        }
        if (request.idTokenHint) {
            parameterBuilder.addIdTokenHint(request.idTokenHint);
        }
        return parameterBuilder.createQueryString();
    }
    extractAccountSid(account) {
        if (account.idTokenClaims) {
            const tokenClaims = account.idTokenClaims;
            return tokenClaims.sid || null;
        }
        return null;
    }
}
class DeviceCodeClient extends BaseClient {
    constructor(configuration2){
        super(configuration2);
    }
    async acquireToken(request) {
        const deviceCodeResponse = await this.getDeviceCode(request);
        request.deviceCodeCallback(deviceCodeResponse);
        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.acquireTokenWithDeviceCode(request, deviceCodeResponse);
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        responseHandler.validateTokenResponse(response);
        return await responseHandler.handleServerTokenResponse(response, this.authority, reqTimestamp, request);
    }
    async getDeviceCode(request) {
        const queryString = this.createQueryString(request);
        const headers = this.createDefaultTokenRequestHeaders();
        const thumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: request.authority,
            scopes: request.scopes
        };
        return this.executePostRequestToDeviceCodeEndpoint(this.authority.deviceCodeEndpoint, queryString, headers, thumbprint);
    }
    async executePostRequestToDeviceCodeEndpoint(deviceCodeEndpoint, queryString, headers, thumbprint) {
        const { body: { user_code: userCode , device_code: deviceCode , verification_uri: verificationUri , expires_in: expiresIn , interval , message: message9  }  } = await this.networkManager.sendPostRequest(thumbprint, deviceCodeEndpoint, {
            body: queryString,
            headers: headers
        });
        return {
            userCode,
            deviceCode,
            verificationUri,
            expiresIn,
            interval,
            message: message9
        };
    }
    createQueryString(request) {
        const parameterBuilder = new RequestParameterBuilder();
        parameterBuilder.addScopes(request.scopes);
        parameterBuilder.addClientId(this.config.authOptions.clientId);
        if (!StringUtils.isEmpty(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
            parameterBuilder.addClaims(request.claims, this.config.authOptions.clientCapabilities);
        }
        return parameterBuilder.createQueryString();
    }
    async acquireTokenWithDeviceCode(request, deviceCodeResponse) {
        const requestBody = this.createTokenRequestBody(request, deviceCodeResponse);
        const headers = this.createDefaultTokenRequestHeaders();
        const userSpecifiedTimeout = request.timeout ? TimeUtils.nowSeconds() + request.timeout : undefined;
        const deviceCodeExpirationTime = TimeUtils.nowSeconds() + deviceCodeResponse.expiresIn;
        const pollingIntervalMilli = deviceCodeResponse.interval * 1000;
        return new Promise((resolve3, reject)=>{
            const intervalId = setInterval(async ()=>{
                try {
                    if (request.cancel) {
                        this.logger.error("Token request cancelled by setting DeviceCodeRequest.cancel = true");
                        clearInterval(intervalId);
                        reject(ClientAuthError1.createDeviceCodeCancelledError());
                    } else if (userSpecifiedTimeout && userSpecifiedTimeout < deviceCodeExpirationTime && TimeUtils.nowSeconds() > userSpecifiedTimeout) {
                        this.logger.error(`User defined timeout for device code polling reached. The timeout was set for ${userSpecifiedTimeout}`);
                        clearInterval(intervalId);
                        reject(ClientAuthError1.createUserTimeoutReachedError());
                    } else if (TimeUtils.nowSeconds() > deviceCodeExpirationTime) {
                        if (userSpecifiedTimeout) {
                            this.logger.verbose(`User specified timeout ignored as the device code has expired before the timeout elapsed. The user specified timeout was set for ${userSpecifiedTimeout}`);
                        }
                        this.logger.error(`Device code expired. Expiration time of device code was ${deviceCodeExpirationTime}`);
                        clearInterval(intervalId);
                        reject(ClientAuthError1.createDeviceCodeExpiredError());
                    } else {
                        const thumbprint = {
                            clientId: this.config.authOptions.clientId,
                            authority: request.authority,
                            scopes: request.scopes
                        };
                        const response = await this.executePostToTokenEndpoint(this.authority.tokenEndpoint, requestBody, headers, thumbprint);
                        if (response.body && response.body.error === Constants.AUTHORIZATION_PENDING) {
                            this.logger.info(response.body.error_description || "no_error_description");
                        } else {
                            clearInterval(intervalId);
                            resolve3(response.body);
                        }
                    }
                } catch (error2) {
                    clearInterval(intervalId);
                    reject(error2);
                }
            }, pollingIntervalMilli);
        });
    }
    createTokenRequestBody(request, deviceCodeResponse) {
        const requestParameters = new RequestParameterBuilder();
        requestParameters.addScopes(request.scopes);
        requestParameters.addClientId(this.config.authOptions.clientId);
        requestParameters.addGrantType(GrantType.DEVICE_CODE_GRANT);
        requestParameters.addDeviceCode(deviceCodeResponse.deviceCode);
        const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
        requestParameters.addCorrelationId(correlationId);
        requestParameters.addClientInfo();
        requestParameters.addLibraryInfo(this.config.libraryInfo);
        requestParameters.addThrottling();
        if (this.serverTelemetryManager) {
            requestParameters.addServerTelemetry(this.serverTelemetryManager);
        }
        if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
            requestParameters.addClaims(request.claims, this.config.authOptions.clientCapabilities);
        }
        return requestParameters.createQueryString();
    }
}
function ownKeys$7(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$7(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source3 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$7(Object(source3), true).forEach(function(key10) {
                _defineProperty(target, key10, source3[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source3));
        } else {
            ownKeys$7(Object(source3)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source3, key10));
            });
        }
    }
    return target;
}
class RefreshTokenClient extends BaseClient {
    constructor(configuration3){
        super(configuration3);
    }
    async acquireToken(request) {
        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.executeTokenRequest(request, this.authority);
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        responseHandler.validateTokenResponse(response.body);
        return responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request, undefined, undefined, true);
    }
    async acquireTokenByRefreshToken(request) {
        if (!request) {
            throw ClientConfigurationError1.createEmptyTokenRequestError();
        }
        if (!request.account) {
            throw ClientAuthError1.createNoAccountInSilentRequestError();
        }
        const isFOCI = this.cacheManager.isAppMetadataFOCI(request.account.environment, this.config.authOptions.clientId);
        if (isFOCI) {
            try {
                return this.acquireTokenWithCachedRefreshToken(request, true);
            } catch (e) {
                const noFamilyRTInCache = e instanceof ClientAuthError1 && e.errorCode === ClientAuthErrorMessage1.noTokensFoundError.code;
                const clientMismatchErrorWithFamilyRT = e instanceof ServerError1 && e.errorCode === Errors.INVALID_GRANT_ERROR && e.subError === Errors.CLIENT_MISMATCH_ERROR;
                if (noFamilyRTInCache || clientMismatchErrorWithFamilyRT) {
                    return this.acquireTokenWithCachedRefreshToken(request, false);
                } else {
                    throw e;
                }
            }
        }
        return this.acquireTokenWithCachedRefreshToken(request, false);
    }
    async acquireTokenWithCachedRefreshToken(request, foci) {
        const refreshToken = this.cacheManager.readRefreshTokenFromCache(this.config.authOptions.clientId, request.account, foci);
        if (!refreshToken) {
            throw ClientAuthError1.createNoTokensFoundError();
        }
        const refreshTokenRequest = _objectSpread$7(_objectSpread$7({
        }, request), {
        }, {
            refreshToken: refreshToken.secret,
            authenticationScheme: request.authenticationScheme || AuthenticationScheme.BEARER
        });
        return this.acquireToken(refreshTokenRequest);
    }
    async executeTokenRequest(request, authority) {
        const requestBody = await this.createTokenRequestBody(request);
        const queryParameters = this.createTokenQueryParameters(request);
        const headers = this.createDefaultTokenRequestHeaders();
        const thumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: authority.canonicalAuthority,
            scopes: request.scopes
        };
        const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParameters);
        return this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint);
    }
    createTokenQueryParameters(request) {
        const parameterBuilder = new RequestParameterBuilder();
        if (request.tokenQueryParameters) {
            parameterBuilder.addExtraQueryParameters(request.tokenQueryParameters);
        }
        return parameterBuilder.createQueryString();
    }
    async createTokenRequestBody(request) {
        const parameterBuilder = new RequestParameterBuilder();
        parameterBuilder.addClientId(this.config.authOptions.clientId);
        parameterBuilder.addScopes(request.scopes);
        parameterBuilder.addGrantType(GrantType.REFRESH_TOKEN_GRANT);
        parameterBuilder.addClientInfo();
        parameterBuilder.addLibraryInfo(this.config.libraryInfo);
        parameterBuilder.addThrottling();
        if (this.serverTelemetryManager) {
            parameterBuilder.addServerTelemetry(this.serverTelemetryManager);
        }
        const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
        parameterBuilder.addCorrelationId(correlationId);
        parameterBuilder.addRefreshToken(request.refreshToken);
        if (this.config.clientCredentials.clientSecret) {
            parameterBuilder.addClientSecret(this.config.clientCredentials.clientSecret);
        }
        if (this.config.clientCredentials.clientAssertion) {
            const clientAssertion = this.config.clientCredentials.clientAssertion;
            parameterBuilder.addClientAssertion(clientAssertion.assertion);
            parameterBuilder.addClientAssertionType(clientAssertion.assertionType);
        }
        if (request.authenticationScheme === AuthenticationScheme.POP) {
            const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils);
            parameterBuilder.addPopToken(await popTokenGenerator.generateCnf(request));
        }
        if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
            parameterBuilder.addClaims(request.claims, this.config.authOptions.clientCapabilities);
        }
        return parameterBuilder.createQueryString();
    }
}
class ClientCredentialClient extends BaseClient {
    constructor(configuration4){
        super(configuration4);
    }
    async acquireToken(request) {
        this.scopeSet = new ScopeSet(request.scopes || []);
        if (request.skipCache) {
            return await this.executeTokenRequest(request, this.authority);
        }
        const cachedAuthenticationResult = await this.getCachedAuthenticationResult(request);
        if (cachedAuthenticationResult) {
            return cachedAuthenticationResult;
        } else {
            return await this.executeTokenRequest(request, this.authority);
        }
    }
    async getCachedAuthenticationResult(request) {
        const cachedAccessToken = this.readAccessTokenFromCache();
        if (!cachedAccessToken || TimeUtils.isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)) {
            return null;
        }
        return await ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, {
            account: null,
            idToken: null,
            accessToken: cachedAccessToken,
            refreshToken: null,
            appMetadata: null
        }, true, request);
    }
    readAccessTokenFromCache() {
        const accessTokenFilter = {
            homeAccountId: "",
            environment: this.authority.canonicalAuthorityUrlComponents.HostNameAndPort,
            credentialType: CredentialType.ACCESS_TOKEN,
            clientId: this.config.authOptions.clientId,
            realm: this.authority.tenant,
            target: this.scopeSet.printScopesLowerCase()
        };
        const credentialCache = this.cacheManager.getCredentialsFilteredBy(accessTokenFilter);
        const accessTokens = Object.keys(credentialCache.accessTokens).map((key10)=>credentialCache.accessTokens[key10]
        );
        if (accessTokens.length < 1) {
            return null;
        } else if (accessTokens.length > 1) {
            throw ClientAuthError1.createMultipleMatchingTokensInCacheError();
        }
        return accessTokens[0];
    }
    async executeTokenRequest(request, authority) {
        const requestBody = this.createTokenRequestBody(request);
        const headers = this.createDefaultTokenRequestHeaders();
        const thumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: request.authority,
            scopes: request.scopes
        };
        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.executePostToTokenEndpoint(authority.tokenEndpoint, requestBody, headers, thumbprint);
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        responseHandler.validateTokenResponse(response.body);
        const tokenResponse = await responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request);
        return tokenResponse;
    }
    createTokenRequestBody(request) {
        const parameterBuilder = new RequestParameterBuilder();
        parameterBuilder.addClientId(this.config.authOptions.clientId);
        parameterBuilder.addScopes(request.scopes, false);
        parameterBuilder.addGrantType(GrantType.CLIENT_CREDENTIALS_GRANT);
        parameterBuilder.addLibraryInfo(this.config.libraryInfo);
        parameterBuilder.addThrottling();
        if (this.serverTelemetryManager) {
            parameterBuilder.addServerTelemetry(this.serverTelemetryManager);
        }
        const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
        parameterBuilder.addCorrelationId(correlationId);
        if (this.config.clientCredentials.clientSecret) {
            parameterBuilder.addClientSecret(this.config.clientCredentials.clientSecret);
        }
        if (this.config.clientCredentials.clientAssertion) {
            const clientAssertion = this.config.clientCredentials.clientAssertion;
            parameterBuilder.addClientAssertion(clientAssertion.assertion);
            parameterBuilder.addClientAssertionType(clientAssertion.assertionType);
        }
        if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
            parameterBuilder.addClaims(request.claims, this.config.authOptions.clientCapabilities);
        }
        return parameterBuilder.createQueryString();
    }
}
class OnBehalfOfClient extends BaseClient {
    constructor(configuration5){
        super(configuration5);
    }
    async acquireToken(request) {
        this.scopeSet = new ScopeSet(request.scopes || []);
        if (request.skipCache) {
            return await this.executeTokenRequest(request, this.authority);
        }
        const cachedAuthenticationResult = await this.getCachedAuthenticationResult(request);
        if (cachedAuthenticationResult) {
            return cachedAuthenticationResult;
        } else {
            return await this.executeTokenRequest(request, this.authority);
        }
    }
    async getCachedAuthenticationResult(request) {
        const cachedAccessToken = this.readAccessTokenFromCache(request);
        if (!cachedAccessToken || TimeUtils.isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)) {
            return null;
        }
        const cachedIdToken = this.readIdTokenFromCache(request);
        let idTokenObject;
        let cachedAccount = null;
        if (cachedIdToken) {
            idTokenObject = new AuthToken(cachedIdToken.secret, this.config.cryptoInterface);
            const localAccountId = idTokenObject.claims.oid ? idTokenObject.claims.oid : idTokenObject.claims.sub;
            const accountInfo = {
                homeAccountId: cachedIdToken.homeAccountId,
                environment: cachedIdToken.environment,
                tenantId: cachedIdToken.realm,
                username: Constants.EMPTY_STRING,
                localAccountId: localAccountId || ""
            };
            cachedAccount = this.readAccountFromCache(accountInfo);
        }
        return await ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, {
            account: cachedAccount,
            accessToken: cachedAccessToken,
            idToken: cachedIdToken,
            refreshToken: null,
            appMetadata: null
        }, true, request, idTokenObject);
    }
    readAccessTokenFromCache(request) {
        const accessTokenFilter = {
            environment: this.authority.canonicalAuthorityUrlComponents.HostNameAndPort,
            credentialType: CredentialType.ACCESS_TOKEN,
            clientId: this.config.authOptions.clientId,
            realm: this.authority.tenant,
            target: this.scopeSet.printScopesLowerCase(),
            oboAssertion: request.oboAssertion
        };
        const credentialCache = this.cacheManager.getCredentialsFilteredBy(accessTokenFilter);
        const accessTokens = Object.keys(credentialCache.accessTokens).map((key10)=>credentialCache.accessTokens[key10]
        );
        const numAccessTokens = accessTokens.length;
        if (numAccessTokens < 1) {
            return null;
        } else if (numAccessTokens > 1) {
            throw ClientAuthError1.createMultipleMatchingTokensInCacheError();
        }
        return accessTokens[0];
    }
    readIdTokenFromCache(request) {
        const idTokenFilter = {
            environment: this.authority.canonicalAuthorityUrlComponents.HostNameAndPort,
            credentialType: CredentialType.ID_TOKEN,
            clientId: this.config.authOptions.clientId,
            realm: this.authority.tenant,
            oboAssertion: request.oboAssertion
        };
        const credentialCache = this.cacheManager.getCredentialsFilteredBy(idTokenFilter);
        const idTokens = Object.keys(credentialCache.idTokens).map((key10)=>credentialCache.idTokens[key10]
        );
        if (idTokens.length < 1) {
            return null;
        }
        return idTokens[0];
    }
    readAccountFromCache(account) {
        return this.cacheManager.readAccountFromCache(account);
    }
    async executeTokenRequest(request, authority) {
        const requestBody = this.createTokenRequestBody(request);
        const headers = this.createDefaultTokenRequestHeaders();
        const thumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: request.authority,
            scopes: request.scopes
        };
        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.executePostToTokenEndpoint(authority.tokenEndpoint, requestBody, headers, thumbprint);
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        responseHandler.validateTokenResponse(response.body);
        const tokenResponse = await responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request);
        return tokenResponse;
    }
    createTokenRequestBody(request) {
        const parameterBuilder = new RequestParameterBuilder();
        parameterBuilder.addClientId(this.config.authOptions.clientId);
        parameterBuilder.addScopes(request.scopes);
        parameterBuilder.addGrantType(GrantType.JWT_BEARER);
        parameterBuilder.addClientInfo();
        parameterBuilder.addLibraryInfo(this.config.libraryInfo);
        parameterBuilder.addThrottling();
        if (this.serverTelemetryManager) {
            parameterBuilder.addServerTelemetry(this.serverTelemetryManager);
        }
        const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
        parameterBuilder.addCorrelationId(correlationId);
        parameterBuilder.addRequestTokenUse(AADServerParamKeys.ON_BEHALF_OF);
        parameterBuilder.addOboAssertion(request.oboAssertion);
        if (this.config.clientCredentials.clientSecret) {
            parameterBuilder.addClientSecret(this.config.clientCredentials.clientSecret);
        }
        if (this.config.clientCredentials.clientAssertion) {
            const clientAssertion = this.config.clientCredentials.clientAssertion;
            parameterBuilder.addClientAssertion(clientAssertion.assertion);
            parameterBuilder.addClientAssertionType(clientAssertion.assertionType);
        }
        return parameterBuilder.createQueryString();
    }
}
class SilentFlowClient extends BaseClient {
    constructor(configuration6){
        super(configuration6);
    }
    async acquireToken(request) {
        try {
            return await this.acquireCachedToken(request);
        } catch (e) {
            if (e instanceof ClientAuthError1 && e.errorCode === ClientAuthErrorMessage1.tokenRefreshRequired.code) {
                const refreshTokenClient = new RefreshTokenClient(this.config);
                return refreshTokenClient.acquireTokenByRefreshToken(request);
            } else {
                throw e;
            }
        }
    }
    async acquireCachedToken(request) {
        if (!request) {
            throw ClientConfigurationError1.createEmptyTokenRequestError();
        }
        if (!request.account) {
            throw ClientAuthError1.createNoAccountInSilentRequestError();
        }
        const requestScopes = new ScopeSet(request.scopes || []);
        const environment = request.authority || this.authority.getPreferredCache();
        const authScheme = request.authenticationScheme || AuthenticationScheme.BEARER;
        const cacheRecord = this.cacheManager.readCacheRecord(request.account, this.config.authOptions.clientId, requestScopes, environment, authScheme);
        if (request.forceRefresh || !StringUtils.isEmptyObj(request.claims) || !cacheRecord.accessToken || TimeUtils.isTokenExpired(cacheRecord.accessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds) || cacheRecord.accessToken.refreshOn && TimeUtils.isTokenExpired(cacheRecord.accessToken.refreshOn, 0)) {
            throw ClientAuthError1.createRefreshRequiredError();
        }
        if (this.config.serverTelemetryManager) {
            this.config.serverTelemetryManager.incrementCacheHits();
        }
        return await this.generateResultFromCacheRecord(cacheRecord, request);
    }
    async generateResultFromCacheRecord(cacheRecord, request) {
        let idTokenObj;
        if (cacheRecord.idToken) {
            idTokenObj = new AuthToken(cacheRecord.idToken.secret, this.config.cryptoInterface);
        }
        return await ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, cacheRecord, true, request, idTokenObj);
    }
}
class UsernamePasswordClient extends BaseClient {
    constructor(configuration7){
        super(configuration7);
    }
    async acquireToken(request) {
        this.logger.info("in acquireToken call");
        const reqTimestamp = TimeUtils.nowSeconds();
        const response = await this.executeTokenRequest(this.authority, request);
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        responseHandler.validateTokenResponse(response.body);
        const tokenResponse = responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request);
        return tokenResponse;
    }
    async executeTokenRequest(authority, request) {
        const thumbprint = {
            clientId: this.config.authOptions.clientId,
            authority: authority.canonicalAuthority,
            scopes: request.scopes
        };
        const requestBody = this.createTokenRequestBody(request);
        const headers = this.createDefaultTokenRequestHeaders();
        return this.executePostToTokenEndpoint(authority.tokenEndpoint, requestBody, headers, thumbprint);
    }
    createTokenRequestBody(request) {
        const parameterBuilder = new RequestParameterBuilder();
        parameterBuilder.addClientId(this.config.authOptions.clientId);
        parameterBuilder.addUsername(request.username);
        parameterBuilder.addPassword(request.password);
        parameterBuilder.addScopes(request.scopes);
        parameterBuilder.addGrantType(GrantType.RESOURCE_OWNER_PASSWORD_GRANT);
        parameterBuilder.addClientInfo();
        parameterBuilder.addLibraryInfo(this.config.libraryInfo);
        parameterBuilder.addThrottling();
        if (this.serverTelemetryManager) {
            parameterBuilder.addServerTelemetry(this.serverTelemetryManager);
        }
        const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
        parameterBuilder.addCorrelationId(correlationId);
        if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
            parameterBuilder.addClaims(request.claims, this.config.authOptions.clientCapabilities);
        }
        return parameterBuilder.createQueryString();
    }
}
function isOpenIdConfigResponse(response) {
    return response.hasOwnProperty("authorization_endpoint") && response.hasOwnProperty("token_endpoint") && response.hasOwnProperty("end_session_endpoint") && response.hasOwnProperty("issuer");
}
var ProtocolMode1;
(function(ProtocolMode1) {
    ProtocolMode1["AAD"] = "AAD";
    ProtocolMode1["OIDC"] = "OIDC";
})(ProtocolMode1 || (ProtocolMode1 = {
}));
class AuthorityMetadataEntity {
    constructor(){
        this.expiresAt = TimeUtils.nowSeconds() + AUTHORITY_METADATA_CONSTANTS.REFRESH_TIME_SECONDS;
    }
    updateCloudDiscoveryMetadata(metadata, fromNetwork) {
        this.aliases = metadata.aliases;
        this.preferred_cache = metadata.preferred_cache;
        this.preferred_network = metadata.preferred_network;
        this.aliasesFromNetwork = fromNetwork;
    }
    updateEndpointMetadata(metadata, fromNetwork) {
        this.authorization_endpoint = metadata.authorization_endpoint;
        this.token_endpoint = metadata.token_endpoint;
        this.end_session_endpoint = metadata.end_session_endpoint;
        this.issuer = metadata.issuer;
        this.endpointsFromNetwork = fromNetwork;
    }
    updateCanonicalAuthority(authority) {
        this.canonical_authority = authority;
    }
    resetExpiresAt() {
        this.expiresAt = TimeUtils.nowSeconds() + AUTHORITY_METADATA_CONSTANTS.REFRESH_TIME_SECONDS;
    }
    isExpired() {
        return this.expiresAt <= TimeUtils.nowSeconds();
    }
    static isAuthorityMetadataEntity(key, entity) {
        if (!entity) {
            return false;
        }
        return key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) === 0 && entity.hasOwnProperty("aliases") && entity.hasOwnProperty("preferred_cache") && entity.hasOwnProperty("preferred_network") && entity.hasOwnProperty("canonical_authority") && entity.hasOwnProperty("authorization_endpoint") && entity.hasOwnProperty("token_endpoint") && entity.hasOwnProperty("end_session_endpoint") && entity.hasOwnProperty("issuer") && entity.hasOwnProperty("aliasesFromNetwork") && entity.hasOwnProperty("endpointsFromNetwork") && entity.hasOwnProperty("expiresAt");
    }
}
function isCloudInstanceDiscoveryResponse(response) {
    return response.hasOwnProperty("tenant_discovery_endpoint") && response.hasOwnProperty("metadata");
}
class RegionDiscovery {
    constructor(networkInterface2){
        this.networkInterface = networkInterface2;
    }
    async detectRegion(environmentRegion) {
        let autodetectedRegionName = environmentRegion;
        if (!autodetectedRegionName) {
            try {
                const response = await this.getRegionFromIMDS(Constants.IMDS_VERSION);
                if (response.status === ResponseCodes.httpSuccess) {
                    autodetectedRegionName = response.body;
                }
                if (response.status === ResponseCodes.httpBadRequest) {
                    const latestIMDSVersion = await this.getCurrentVersion();
                    if (!latestIMDSVersion) {
                        return null;
                    }
                    const response1 = await this.getRegionFromIMDS(latestIMDSVersion);
                    if (response1.status === ResponseCodes.httpSuccess) {
                        autodetectedRegionName = response1.body;
                    }
                }
            } catch (e) {
                return null;
            }
        }
        return autodetectedRegionName || null;
    }
    async getRegionFromIMDS(version) {
        return this.networkInterface.sendGetRequestAsync(`${Constants.IMDS_ENDPOINT}?api-version=${version}&format=text`, RegionDiscovery.IMDS_OPTIONS, Constants.IMDS_TIMEOUT);
    }
    async getCurrentVersion() {
        try {
            const response = await this.networkInterface.sendGetRequestAsync(`${Constants.IMDS_ENDPOINT}?format=json`, RegionDiscovery.IMDS_OPTIONS);
            if (response.status === ResponseCodes.httpBadRequest && response.body && response.body["newest-versions"] && response.body["newest-versions"].length > 0) {
                return response.body["newest-versions"][0];
            }
            return null;
        } catch (e) {
            return null;
        }
    }
}
RegionDiscovery.IMDS_OPTIONS = {
    headers: {
        "Metadata": "true"
    }
};
function ownKeys$6(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$6(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source4 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$6(Object(source4), true).forEach(function(key10) {
                _defineProperty(target, key10, source4[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source4));
        } else {
            ownKeys$6(Object(source4)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source4, key10));
            });
        }
    }
    return target;
}
class Authority {
    constructor(authority1, networkInterface1, cacheManager1, authorityOptions1){
        this.canonicalAuthority = authority1;
        this._canonicalAuthority.validateAsUri();
        this.networkInterface = networkInterface1;
        this.cacheManager = cacheManager1;
        this.authorityOptions = authorityOptions1;
        this.regionDiscovery = new RegionDiscovery(networkInterface1);
    }
    get authorityType() {
        const pathSegments = this.canonicalAuthorityUrlComponents.PathSegments;
        if (pathSegments.length && pathSegments[0].toLowerCase() === Constants.ADFS) {
            return AuthorityType.Adfs;
        }
        return AuthorityType.Default;
    }
    get protocolMode() {
        return this.authorityOptions.protocolMode;
    }
    get options() {
        return this.authorityOptions;
    }
    get canonicalAuthority() {
        return this._canonicalAuthority.urlString;
    }
    set canonicalAuthority(url) {
        this._canonicalAuthority = new UrlString(url);
        this._canonicalAuthority.validateAsUri();
        this._canonicalAuthorityUrlComponents = null;
    }
    get canonicalAuthorityUrlComponents() {
        if (!this._canonicalAuthorityUrlComponents) {
            this._canonicalAuthorityUrlComponents = this._canonicalAuthority.getUrlComponents();
        }
        return this._canonicalAuthorityUrlComponents;
    }
    get hostnameAndPort() {
        return this.canonicalAuthorityUrlComponents.HostNameAndPort.toLowerCase();
    }
    get tenant() {
        return this.canonicalAuthorityUrlComponents.PathSegments[0];
    }
    get authorizationEndpoint() {
        if (this.discoveryComplete()) {
            const endpoint = this.replacePath(this.metadata.authorization_endpoint);
            return this.replaceTenant(endpoint);
        } else {
            throw ClientAuthError1.createEndpointDiscoveryIncompleteError("Discovery incomplete.");
        }
    }
    get tokenEndpoint() {
        if (this.discoveryComplete()) {
            const endpoint = this.replacePath(this.metadata.token_endpoint);
            return this.replaceTenant(endpoint);
        } else {
            throw ClientAuthError1.createEndpointDiscoveryIncompleteError("Discovery incomplete.");
        }
    }
    get deviceCodeEndpoint() {
        if (this.discoveryComplete()) {
            const endpoint = this.replacePath(this.metadata.token_endpoint.replace("/token", "/devicecode"));
            return this.replaceTenant(endpoint);
        } else {
            throw ClientAuthError1.createEndpointDiscoveryIncompleteError("Discovery incomplete.");
        }
    }
    get endSessionEndpoint() {
        if (this.discoveryComplete()) {
            const endpoint = this.replacePath(this.metadata.end_session_endpoint);
            return this.replaceTenant(endpoint);
        } else {
            throw ClientAuthError1.createEndpointDiscoveryIncompleteError("Discovery incomplete.");
        }
    }
    get selfSignedJwtAudience() {
        if (this.discoveryComplete()) {
            const endpoint = this.replacePath(this.metadata.issuer);
            return this.replaceTenant(endpoint);
        } else {
            throw ClientAuthError1.createEndpointDiscoveryIncompleteError("Discovery incomplete.");
        }
    }
    replaceTenant(urlString) {
        return urlString.replace(/{tenant}|{tenantid}/g, this.tenant);
    }
    replacePath(urlString) {
        let endpoint = urlString;
        const cachedAuthorityUrl = new UrlString(this.metadata.canonical_authority);
        const cachedAuthorityParts = cachedAuthorityUrl.getUrlComponents().PathSegments;
        const currentAuthorityParts = this.canonicalAuthorityUrlComponents.PathSegments;
        currentAuthorityParts.forEach((currentPart, index)=>{
            const cachedPart = cachedAuthorityParts[index];
            if (currentPart !== cachedPart) {
                endpoint = endpoint.replace(`/${cachedPart}/`, `/${currentPart}/`);
            }
        });
        return endpoint;
    }
    get defaultOpenIdConfigurationEndpoint() {
        if (this.authorityType === AuthorityType.Adfs || this.protocolMode === ProtocolMode1.OIDC) {
            return `${this.canonicalAuthority}.well-known/openid-configuration`;
        }
        return `${this.canonicalAuthority}v2.0/.well-known/openid-configuration`;
    }
    discoveryComplete() {
        return !!this.metadata;
    }
    async resolveEndpointsAsync() {
        let metadataEntity = this.cacheManager.getAuthorityMetadataByAlias(this.hostnameAndPort);
        if (!metadataEntity) {
            metadataEntity = new AuthorityMetadataEntity();
            metadataEntity.updateCanonicalAuthority(this.canonicalAuthority);
        }
        const cloudDiscoverySource = await this.updateCloudDiscoveryMetadata(metadataEntity);
        this.canonicalAuthority = this.canonicalAuthority.replace(this.hostnameAndPort, metadataEntity.preferred_network);
        const endpointSource = await this.updateEndpointMetadata(metadataEntity);
        if (cloudDiscoverySource !== AuthorityMetadataSource.CACHE && endpointSource !== AuthorityMetadataSource.CACHE) {
            metadataEntity.resetExpiresAt();
            metadataEntity.updateCanonicalAuthority(this.canonicalAuthority);
        }
        const cacheKey = this.cacheManager.generateAuthorityMetadataCacheKey(metadataEntity.preferred_cache);
        this.cacheManager.setAuthorityMetadata(cacheKey, metadataEntity);
        this.metadata = metadataEntity;
    }
    async updateEndpointMetadata(metadataEntity) {
        let metadata = this.getEndpointMetadataFromConfig();
        if (metadata) {
            metadataEntity.updateEndpointMetadata(metadata, false);
            return AuthorityMetadataSource.CONFIG;
        }
        if (this.isAuthoritySameType(metadataEntity) && metadataEntity.endpointsFromNetwork && !metadataEntity.isExpired()) {
            return AuthorityMetadataSource.CACHE;
        }
        metadata = await this.getEndpointMetadataFromNetwork();
        if (metadata) {
            if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
                const autodetectedRegionName = await this.regionDiscovery.detectRegion(this.authorityOptions.azureRegionConfiguration.environmentRegion);
                const azureRegion = this.authorityOptions.azureRegionConfiguration.azureRegion === Constants.AZURE_REGION_AUTO_DISCOVER_FLAG ? autodetectedRegionName : this.authorityOptions.azureRegionConfiguration.azureRegion;
                if (azureRegion) {
                    metadata = Authority.replaceWithRegionalInformation(metadata, azureRegion);
                }
            }
            metadataEntity.updateEndpointMetadata(metadata, true);
            return AuthorityMetadataSource.NETWORK;
        } else {
            throw ClientAuthError1.createUnableToGetOpenidConfigError(this.defaultOpenIdConfigurationEndpoint);
        }
    }
    isAuthoritySameType(metadataEntity) {
        const cachedAuthorityUrl = new UrlString(metadataEntity.canonical_authority);
        const cachedParts = cachedAuthorityUrl.getUrlComponents().PathSegments;
        return cachedParts.length === this.canonicalAuthorityUrlComponents.PathSegments.length;
    }
    getEndpointMetadataFromConfig() {
        if (this.authorityOptions.authorityMetadata) {
            try {
                return JSON.parse(this.authorityOptions.authorityMetadata);
            } catch (e) {
                throw ClientConfigurationError1.createInvalidAuthorityMetadataError();
            }
        }
        return null;
    }
    async getEndpointMetadataFromNetwork() {
        try {
            const response = await this.networkInterface.sendGetRequestAsync(this.defaultOpenIdConfigurationEndpoint);
            return isOpenIdConfigResponse(response.body) ? response.body : null;
        } catch (e) {
            return null;
        }
    }
    async updateCloudDiscoveryMetadata(metadataEntity) {
        let metadata = this.getCloudDiscoveryMetadataFromConfig();
        if (metadata) {
            metadataEntity.updateCloudDiscoveryMetadata(metadata, false);
            return AuthorityMetadataSource.CONFIG;
        }
        if (this.isAuthoritySameType(metadataEntity) && metadataEntity.aliasesFromNetwork && !metadataEntity.isExpired()) {
            return AuthorityMetadataSource.CACHE;
        }
        metadata = await this.getCloudDiscoveryMetadataFromNetwork();
        if (metadata) {
            metadataEntity.updateCloudDiscoveryMetadata(metadata, true);
            return AuthorityMetadataSource.NETWORK;
        } else {
            throw ClientConfigurationError1.createUntrustedAuthorityError();
        }
    }
    getCloudDiscoveryMetadataFromConfig() {
        if (this.authorityOptions.cloudDiscoveryMetadata) {
            try {
                const parsedResponse = JSON.parse(this.authorityOptions.cloudDiscoveryMetadata);
                const metadata = Authority.getCloudDiscoveryMetadataFromNetworkResponse(parsedResponse.metadata, this.hostnameAndPort);
                if (metadata) {
                    return metadata;
                }
            } catch (e) {
                throw ClientConfigurationError1.createInvalidCloudDiscoveryMetadataError();
            }
        }
        if (this.isInKnownAuthorities()) {
            return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
        }
        return null;
    }
    async getCloudDiscoveryMetadataFromNetwork() {
        const instanceDiscoveryEndpoint = `${Constants.AAD_INSTANCE_DISCOVERY_ENDPT}${this.canonicalAuthority}oauth2/v2.0/authorize`;
        let match = null;
        try {
            const response = await this.networkInterface.sendGetRequestAsync(instanceDiscoveryEndpoint);
            const metadata = isCloudInstanceDiscoveryResponse(response.body) ? response.body.metadata : [];
            if (metadata.length === 0) {
                return null;
            }
            match = Authority.getCloudDiscoveryMetadataFromNetworkResponse(metadata, this.hostnameAndPort);
        } catch (e) {
            return null;
        }
        if (!match) {
            match = Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
        }
        return match;
    }
    isInKnownAuthorities() {
        const matches = this.authorityOptions.knownAuthorities.filter((authority1)=>{
            return UrlString.getDomainFromUrl(authority1).toLowerCase() === this.hostnameAndPort;
        });
        return matches.length > 0;
    }
    static createCloudDiscoveryMetadataFromHost(host) {
        return {
            preferred_network: host,
            preferred_cache: host,
            aliases: [
                host
            ]
        };
    }
    static getCloudDiscoveryMetadataFromNetworkResponse(response, authority) {
        for(let i7 = 0; i7 < response.length; i7++){
            const metadata = response[i7];
            if (metadata.aliases.indexOf(authority) > -1) {
                return metadata;
            }
        }
        return null;
    }
    getPreferredCache() {
        if (this.discoveryComplete()) {
            return this.metadata.preferred_cache;
        } else {
            throw ClientAuthError1.createEndpointDiscoveryIncompleteError("Discovery incomplete.");
        }
    }
    isAlias(host) {
        return this.metadata.aliases.indexOf(host) > -1;
    }
    static isPublicCloudAuthority(host) {
        return Constants.KNOWN_PUBLIC_CLOUDS.includes(host);
    }
    static buildRegionalAuthorityString(host, region, queryString) {
        const authorityUrlInstance = new UrlString(host);
        authorityUrlInstance.validateAsUri();
        const authorityUrlParts = authorityUrlInstance.getUrlComponents();
        let hostNameAndPort = `${region}.${authorityUrlParts.HostNameAndPort}`;
        if (this.isPublicCloudAuthority(authorityUrlParts.HostNameAndPort)) {
            hostNameAndPort = `${region}.${Constants.REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX}`;
        }
        const url2 = UrlString.constructAuthorityUriFromObject(_objectSpread$6(_objectSpread$6({
        }, authorityUrlInstance.getUrlComponents()), {
        }, {
            HostNameAndPort: hostNameAndPort
        })).urlString;
        if (queryString) return `${url2}?${queryString}`;
        return url2;
    }
    static replaceWithRegionalInformation(metadata, azureRegion) {
        metadata.authorization_endpoint = Authority.buildRegionalAuthorityString(metadata.authorization_endpoint, azureRegion);
        metadata.token_endpoint = Authority.buildRegionalAuthorityString(metadata.token_endpoint, azureRegion, "allowestsrnonmsi=true");
        metadata.end_session_endpoint = Authority.buildRegionalAuthorityString(metadata.end_session_endpoint, azureRegion);
        return metadata;
    }
}
class AuthorityFactory {
    static async createDiscoveredInstance(authorityUri, networkClient, cacheManager, authorityOptions) {
        const acquireTokenAuthority = AuthorityFactory.createInstance(authorityUri, networkClient, cacheManager, authorityOptions);
        try {
            await acquireTokenAuthority.resolveEndpointsAsync();
            return acquireTokenAuthority;
        } catch (e) {
            throw ClientAuthError1.createEndpointDiscoveryIncompleteError(e);
        }
    }
    static createInstance(authorityUrl, networkInterface, cacheManager, authorityOptions) {
        if (StringUtils.isEmpty(authorityUrl)) {
            throw ClientConfigurationError1.createUrlEmptyError();
        }
        return new Authority(authorityUrl, networkInterface, cacheManager, authorityOptions);
    }
}
class ServerTelemetryEntity {
    constructor(){
        this.failedRequests = [];
        this.errors = [];
        this.cacheHits = 0;
    }
    static isServerTelemetryEntity(key, entity) {
        const validateKey = key.indexOf(SERVER_TELEM_CONSTANTS.CACHE_KEY) === 0;
        let validateEntity = true;
        if (entity) {
            validateEntity = entity.hasOwnProperty("failedRequests") && entity.hasOwnProperty("errors") && entity.hasOwnProperty("cacheHits");
        }
        return validateKey && validateEntity;
    }
}
class ThrottlingEntity {
    static isThrottlingEntity(key, entity) {
        let validateKey = false;
        if (key) {
            validateKey = key.indexOf(ThrottlingConstants.THROTTLING_PREFIX) === 0;
        }
        let validateEntity = true;
        if (entity) {
            validateEntity = entity.hasOwnProperty("throttleTime");
        }
        return validateKey && validateEntity;
    }
}
class ServerTelemetryManager {
    constructor(telemetryRequest, cacheManager3){
        this.cacheManager = cacheManager3;
        this.apiId = telemetryRequest.apiId;
        this.correlationId = telemetryRequest.correlationId;
        this.forceRefresh = telemetryRequest.forceRefresh || false;
        this.wrapperSKU = telemetryRequest.wrapperSKU || Constants.EMPTY_STRING;
        this.wrapperVer = telemetryRequest.wrapperVer || Constants.EMPTY_STRING;
        this.telemetryCacheKey = SERVER_TELEM_CONSTANTS.CACHE_KEY + Separators.CACHE_KEY_SEPARATOR + telemetryRequest.clientId;
    }
    generateCurrentRequestHeaderValue() {
        const forceRefreshInt = this.forceRefresh ? 1 : 0;
        const request = `${this.apiId}${SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR}${forceRefreshInt}`;
        const platformFields = [
            this.wrapperSKU,
            this.wrapperVer
        ].join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        return [
            SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
            request,
            platformFields
        ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
    }
    generateLastRequestHeaderValue() {
        const lastRequests = this.getLastRequests();
        const maxErrors = ServerTelemetryManager.maxErrorsToSend(lastRequests);
        const failedRequests = lastRequests.failedRequests.slice(0, 2 * maxErrors).join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        const errors = lastRequests.errors.slice(0, maxErrors).join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        const errorCount = lastRequests.errors.length;
        const overflow = maxErrors < errorCount ? SERVER_TELEM_CONSTANTS.OVERFLOW_TRUE : SERVER_TELEM_CONSTANTS.OVERFLOW_FALSE;
        const platformFields = [
            errorCount,
            overflow
        ].join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        return [
            SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
            lastRequests.cacheHits,
            failedRequests,
            errors,
            platformFields
        ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
    }
    cacheFailedRequest(error) {
        const lastRequests = this.getLastRequests();
        if (lastRequests.errors.length >= SERVER_TELEM_CONSTANTS.MAX_CACHED_ERRORS) {
            lastRequests.failedRequests.shift();
            lastRequests.failedRequests.shift();
            lastRequests.errors.shift();
        }
        lastRequests.failedRequests.push(this.apiId, this.correlationId);
        if (!StringUtils.isEmpty(error.subError)) {
            lastRequests.errors.push(error.subError);
        } else if (!StringUtils.isEmpty(error.errorCode)) {
            lastRequests.errors.push(error.errorCode);
        } else if (!!error && error.toString()) {
            lastRequests.errors.push(error.toString());
        } else {
            lastRequests.errors.push(SERVER_TELEM_CONSTANTS.UNKNOWN_ERROR);
        }
        this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests);
        return;
    }
    incrementCacheHits() {
        const lastRequests = this.getLastRequests();
        lastRequests.cacheHits += 1;
        this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests);
        return lastRequests.cacheHits;
    }
    getLastRequests() {
        const initialValue = new ServerTelemetryEntity();
        const lastRequests = this.cacheManager.getServerTelemetry(this.telemetryCacheKey);
        return lastRequests || initialValue;
    }
    clearTelemetryCache() {
        const lastRequests = this.getLastRequests();
        const numErrorsFlushed = ServerTelemetryManager.maxErrorsToSend(lastRequests);
        const errorCount = lastRequests.errors.length;
        if (numErrorsFlushed === errorCount) {
            this.cacheManager.removeItem(this.telemetryCacheKey);
        } else {
            const serverTelemEntity = new ServerTelemetryEntity();
            serverTelemEntity.failedRequests = lastRequests.failedRequests.slice(numErrorsFlushed * 2);
            serverTelemEntity.errors = lastRequests.errors.slice(numErrorsFlushed);
            this.cacheManager.setServerTelemetry(this.telemetryCacheKey, serverTelemEntity);
        }
    }
    static maxErrorsToSend(serverTelemetryEntity) {
        let i7;
        let maxErrors = 0;
        let dataSize = 0;
        const errorCount = serverTelemetryEntity.errors.length;
        for(i7 = 0; i7 < errorCount; i7++){
            const apiId = serverTelemetryEntity.failedRequests[2 * i7] || Constants.EMPTY_STRING;
            const correlationId = serverTelemetryEntity.failedRequests[2 * i7 + 1] || Constants.EMPTY_STRING;
            const errorCode6 = serverTelemetryEntity.errors[i7] || Constants.EMPTY_STRING;
            dataSize += apiId.toString().length + correlationId.toString().length + errorCode6.length + 3;
            if (dataSize < SERVER_TELEM_CONSTANTS.MAX_LAST_HEADER_BYTES) {
                maxErrors += 1;
            } else {
                break;
            }
        }
        return maxErrors;
    }
}
class HttpClient {
    async sendGetRequestAsync(url, options) {
        const request = {
            method: HttpMethod.GET,
            url: url,
            headers: options && options.headers,
            validateStatus: ()=>true
        };
        const response = await axiod(request);
        return {
            headers: response.headers,
            body: response.data,
            status: response.status
        };
    }
    async sendPostRequestAsync(url, options, cancellationToken) {
        const request = {
            method: HttpMethod.POST,
            url: url,
            data: options && options.body || "",
            timeout: cancellationToken,
            headers: options && options.headers,
            validateStatus: ()=>true
        };
        const response = await axiod(request);
        return {
            headers: response.headers,
            body: response.data,
            status: response.status
        };
    }
}
class NetworkUtils {
    static getNetworkClient() {
        return new HttpClient();
    }
}
function ownKeys$5(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$5(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source5 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$5(Object(source5), true).forEach(function(key10) {
                _defineProperty$1(target, key10, source5[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source5));
        } else {
            ownKeys$5(Object(source5)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source5, key10));
            });
        }
    }
    return target;
}
const DEFAULT_AUTH_OPTIONS = {
    clientId: "",
    authority: Constants.DEFAULT_AUTHORITY,
    clientSecret: "",
    clientAssertion: "",
    clientCertificate: {
        thumbprint: "",
        privateKey: "",
        x5c: ""
    },
    knownAuthorities: [],
    cloudDiscoveryMetadata: "",
    authorityMetadata: "",
    clientCapabilities: [],
    protocolMode: ProtocolMode1.AAD
};
const DEFAULT_CACHE_OPTIONS = {
};
const DEFAULT_LOGGER_OPTIONS = {
    loggerCallback: ()=>{
    },
    piiLoggingEnabled: false,
    logLevel: LogLevel1.Info
};
const DEFAULT_SYSTEM_OPTIONS = {
    loggerOptions: DEFAULT_LOGGER_OPTIONS,
    networkClient: NetworkUtils.getNetworkClient()
};
function buildAppConfiguration1({ auth , cache , system  }) {
    return {
        auth: _objectSpread$5(_objectSpread$5({
        }, DEFAULT_AUTH_OPTIONS), auth),
        cache: _objectSpread$5(_objectSpread$5({
        }, DEFAULT_CACHE_OPTIONS), cache),
        system: _objectSpread$5(_objectSpread$5({
        }, DEFAULT_SYSTEM_OPTIONS), system)
    };
}
class GuidGenerator {
    static generateGuid() {
        return v4();
    }
    static isGuid(guid) {
        const regexGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return regexGuid.test(guid);
    }
}
class EncodingUtils {
    static base64Encode(str, encoding) {
        return Buffer1.from(str, encoding).toString("base64");
    }
    static base64EncodeUrl(str, encoding) {
        return EncodingUtils.base64Encode(str, encoding).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    static base64Decode(base64Str) {
        return Buffer1.from(base64Str, "base64").toString("utf8");
    }
    static base64DecodeUrl(base64Str) {
        let str2 = base64Str.replace(/-/g, "+").replace(/_/g, "/");
        while(str2.length % 4){
            str2 += "=";
        }
        return EncodingUtils.base64Decode(str2);
    }
}
class PkceGenerator {
    async generatePkceCodes() {
        const verifier = this.generateCodeVerifier();
        const challenge = this.generateCodeChallengeFromVerifier(verifier);
        return {
            verifier,
            challenge
        };
    }
    generateCodeVerifier() {
        const buffer = __default1.randomBytes(32);
        const verifier = this.bufferToCVString(buffer);
        return EncodingUtils.base64EncodeUrl(verifier);
    }
    generateCodeChallengeFromVerifier(codeVerifier) {
        return EncodingUtils.base64EncodeUrl(this.sha256(codeVerifier).toString("base64"), "base64");
    }
    sha256(buffer) {
        return __default1.createHash(Hash2.SHA256).update(buffer).digest();
    }
    bufferToCVString(buffer) {
        const charArr = [];
        for(let i7 = 0; i7 < buffer.byteLength; i7 += 1){
            const index = buffer[i7] % CharSet.CV_CHARSET.length;
            charArr.push(CharSet.CV_CHARSET[index]);
        }
        return charArr.join("");
    }
}
class CryptoProvider1 {
    constructor(){
        this.pkceGenerator = new PkceGenerator();
    }
    createNewGuid() {
        return GuidGenerator.generateGuid();
    }
    base64Encode(input) {
        return EncodingUtils.base64Encode(input);
    }
    base64Decode(input) {
        return EncodingUtils.base64Decode(input);
    }
    generatePkceCodes() {
        return this.pkceGenerator.generatePkceCodes();
    }
    getPublicKeyThumbprint() {
        throw new Error("Method not implemented.");
    }
    signJwt() {
        throw new Error("Method not implemented.");
    }
}
class Deserializer {
    static deserializeJSONBlob(jsonFile) {
        const deserializedCache = StringUtils.isEmpty(jsonFile) ? {
        } : JSON.parse(jsonFile);
        return deserializedCache;
    }
    static deserializeAccounts(accounts) {
        const accountObjects = {
        };
        if (accounts) {
            Object.keys(accounts).map(function(key10) {
                const serializedAcc = accounts[key10];
                const mappedAcc = {
                    homeAccountId: serializedAcc.home_account_id,
                    environment: serializedAcc.environment,
                    realm: serializedAcc.realm,
                    localAccountId: serializedAcc.local_account_id,
                    username: serializedAcc.username,
                    authorityType: serializedAcc.authority_type,
                    name: serializedAcc.name,
                    clientInfo: serializedAcc.client_info,
                    lastModificationTime: serializedAcc.last_modification_time,
                    lastModificationApp: serializedAcc.last_modification_app
                };
                const account = new AccountEntity();
                CacheManager.toObject(account, mappedAcc);
                accountObjects[key10] = account;
            });
        }
        return accountObjects;
    }
    static deserializeIdTokens(idTokens) {
        const idObjects = {
        };
        if (idTokens) {
            Object.keys(idTokens).map(function(key10) {
                const serializedIdT = idTokens[key10];
                const mappedIdT = {
                    homeAccountId: serializedIdT.home_account_id,
                    environment: serializedIdT.environment,
                    credentialType: serializedIdT.credential_type,
                    clientId: serializedIdT.client_id,
                    secret: serializedIdT.secret,
                    realm: serializedIdT.realm
                };
                const idToken = new IdTokenEntity();
                CacheManager.toObject(idToken, mappedIdT);
                idObjects[key10] = idToken;
            });
        }
        return idObjects;
    }
    static deserializeAccessTokens(accessTokens) {
        const atObjects = {
        };
        if (accessTokens) {
            Object.keys(accessTokens).map(function(key10) {
                const serializedAT = accessTokens[key10];
                const mappedAT = {
                    homeAccountId: serializedAT.home_account_id,
                    environment: serializedAT.environment,
                    credentialType: serializedAT.credential_type,
                    clientId: serializedAT.client_id,
                    secret: serializedAT.secret,
                    realm: serializedAT.realm,
                    target: serializedAT.target,
                    cachedAt: serializedAT.cached_at,
                    expiresOn: serializedAT.expires_on,
                    extendedExpiresOn: serializedAT.extended_expires_on,
                    refreshOn: serializedAT.refresh_on,
                    keyId: serializedAT.key_id,
                    tokenType: serializedAT.token_type
                };
                const accessToken = new AccessTokenEntity();
                CacheManager.toObject(accessToken, mappedAT);
                atObjects[key10] = accessToken;
            });
        }
        return atObjects;
    }
    static deserializeRefreshTokens(refreshTokens) {
        const rtObjects = {
        };
        if (refreshTokens) {
            Object.keys(refreshTokens).map(function(key10) {
                const serializedRT = refreshTokens[key10];
                const mappedRT = {
                    homeAccountId: serializedRT.home_account_id,
                    environment: serializedRT.environment,
                    credentialType: serializedRT.credential_type,
                    clientId: serializedRT.client_id,
                    secret: serializedRT.secret,
                    familyId: serializedRT.family_id,
                    target: serializedRT.target,
                    realm: serializedRT.realm
                };
                const refreshToken = new RefreshTokenEntity();
                CacheManager.toObject(refreshToken, mappedRT);
                rtObjects[key10] = refreshToken;
            });
        }
        return rtObjects;
    }
    static deserializeAppMetadata(appMetadata) {
        const appMetadataObjects = {
        };
        if (appMetadata) {
            Object.keys(appMetadata).map(function(key10) {
                const serializedAmdt = appMetadata[key10];
                const mappedAmd = {
                    clientId: serializedAmdt.client_id,
                    environment: serializedAmdt.environment,
                    familyId: serializedAmdt.family_id
                };
                const amd = new AppMetadataEntity();
                CacheManager.toObject(amd, mappedAmd);
                appMetadataObjects[key10] = amd;
            });
        }
        return appMetadataObjects;
    }
    static deserializeAllCache(jsonCache) {
        return {
            accounts: jsonCache.Account ? this.deserializeAccounts(jsonCache.Account) : {
            },
            idTokens: jsonCache.IdToken ? this.deserializeIdTokens(jsonCache.IdToken) : {
            },
            accessTokens: jsonCache.AccessToken ? this.deserializeAccessTokens(jsonCache.AccessToken) : {
            },
            refreshTokens: jsonCache.RefreshToken ? this.deserializeRefreshTokens(jsonCache.RefreshToken) : {
            },
            appMetadata: jsonCache.AppMetadata ? this.deserializeAppMetadata(jsonCache.AppMetadata) : {
            }
        };
    }
}
class Serializer {
    static serializeJSONBlob(data) {
        return JSON.stringify(data);
    }
    static serializeAccounts(accCache) {
        const accounts = {
        };
        Object.keys(accCache).map(function(key10) {
            const accountEntity1 = accCache[key10];
            accounts[key10] = {
                home_account_id: accountEntity1.homeAccountId,
                environment: accountEntity1.environment,
                realm: accountEntity1.realm,
                local_account_id: accountEntity1.localAccountId,
                username: accountEntity1.username,
                authority_type: accountEntity1.authorityType,
                name: accountEntity1.name,
                client_info: accountEntity1.clientInfo,
                last_modification_time: accountEntity1.lastModificationTime,
                last_modification_app: accountEntity1.lastModificationApp
            };
        });
        return accounts;
    }
    static serializeIdTokens(idTCache) {
        const idTokens = {
        };
        Object.keys(idTCache).map(function(key10) {
            const idTEntity = idTCache[key10];
            idTokens[key10] = {
                home_account_id: idTEntity.homeAccountId,
                environment: idTEntity.environment,
                credential_type: idTEntity.credentialType,
                client_id: idTEntity.clientId,
                secret: idTEntity.secret,
                realm: idTEntity.realm
            };
        });
        return idTokens;
    }
    static serializeAccessTokens(atCache) {
        const accessTokens = {
        };
        Object.keys(atCache).map(function(key10) {
            const atEntity = atCache[key10];
            accessTokens[key10] = {
                home_account_id: atEntity.homeAccountId,
                environment: atEntity.environment,
                credential_type: atEntity.credentialType,
                client_id: atEntity.clientId,
                secret: atEntity.secret,
                realm: atEntity.realm,
                target: atEntity.target,
                cached_at: atEntity.cachedAt,
                expires_on: atEntity.expiresOn,
                extended_expires_on: atEntity.extendedExpiresOn,
                refresh_on: atEntity.refreshOn,
                key_id: atEntity.keyId,
                token_type: atEntity.tokenType
            };
        });
        return accessTokens;
    }
    static serializeRefreshTokens(rtCache) {
        const refreshTokens = {
        };
        Object.keys(rtCache).map(function(key10) {
            const rtEntity = rtCache[key10];
            refreshTokens[key10] = {
                home_account_id: rtEntity.homeAccountId,
                environment: rtEntity.environment,
                credential_type: rtEntity.credentialType,
                client_id: rtEntity.clientId,
                secret: rtEntity.secret,
                family_id: rtEntity.familyId,
                target: rtEntity.target,
                realm: rtEntity.realm
            };
        });
        return refreshTokens;
    }
    static serializeAppMetadata(amdtCache) {
        const appMetadata = {
        };
        Object.keys(amdtCache).map(function(key10) {
            const amdtEntity = amdtCache[key10];
            appMetadata[key10] = {
                client_id: amdtEntity.clientId,
                environment: amdtEntity.environment,
                family_id: amdtEntity.familyId
            };
        });
        return appMetadata;
    }
    static serializeAllCache(inMemCache) {
        return {
            Account: this.serializeAccounts(inMemCache.accounts),
            IdToken: this.serializeIdTokens(inMemCache.idTokens),
            AccessToken: this.serializeAccessTokens(inMemCache.accessTokens),
            RefreshToken: this.serializeRefreshTokens(inMemCache.refreshTokens),
            AppMetadata: this.serializeAppMetadata(inMemCache.appMetadata)
        };
    }
}
function ownKeys$4(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$4(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source6 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$4(Object(source6), true).forEach(function(key10) {
                _defineProperty$1(target, key10, source6[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source6));
        } else {
            ownKeys$4(Object(source6)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source6, key10));
            });
        }
    }
    return target;
}
class NodeStorage1 extends CacheManager {
    constructor(logger1, clientId3, cryptoImpl1){
        super(clientId3, cryptoImpl1);
        this.cache = {
        };
        this.changeEmitters = [];
        this.logger = logger1;
    }
    registerChangeEmitter(func) {
        this.changeEmitters.push(func);
    }
    emitChange() {
        this.changeEmitters.forEach((func)=>func.call(null)
        );
    }
    cacheToInMemoryCache(cache) {
        const inMemoryCache = {
            accounts: {
            },
            idTokens: {
            },
            accessTokens: {
            },
            refreshTokens: {
            },
            appMetadata: {
            }
        };
        for(const key10 in cache){
            if (cache[key10] instanceof AccountEntity) {
                inMemoryCache.accounts[key10] = cache[key10];
            } else if (cache[key10] instanceof IdTokenEntity) {
                inMemoryCache.idTokens[key10] = cache[key10];
            } else if (cache[key10] instanceof AccessTokenEntity) {
                inMemoryCache.accessTokens[key10] = cache[key10];
            } else if (cache[key10] instanceof RefreshTokenEntity) {
                inMemoryCache.refreshTokens[key10] = cache[key10];
            } else if (cache[key10] instanceof AppMetadataEntity) {
                inMemoryCache.appMetadata[key10] = cache[key10];
            } else {
                continue;
            }
        }
        return inMemoryCache;
    }
    inMemoryCacheToCache(inMemoryCache) {
        let cache = this.getCache();
        cache = _objectSpread$4(_objectSpread$4(_objectSpread$4(_objectSpread$4(_objectSpread$4({
        }, inMemoryCache.accounts), inMemoryCache.idTokens), inMemoryCache.accessTokens), inMemoryCache.refreshTokens), inMemoryCache.appMetadata);
        return cache;
    }
    getInMemoryCache() {
        this.logger.verbose("Getting in-memory cache");
        const inMemoryCache = this.cacheToInMemoryCache(this.getCache());
        return inMemoryCache;
    }
    setInMemoryCache(inMemoryCache) {
        this.logger.verbose("Setting in-memory cache");
        const cache = this.inMemoryCacheToCache(inMemoryCache);
        this.setCache(cache);
        this.emitChange();
    }
    getCache() {
        this.logger.verbose("Getting cache key-value store");
        return this.cache;
    }
    setCache(cache) {
        this.logger.verbose("Setting cache key value store");
        this.cache = cache;
        this.emitChange();
    }
    getItem(key) {
        this.logger.verbosePii(`Item key: ${key}`);
        const cache = this.getCache();
        return cache[key];
    }
    setItem(key, value) {
        this.logger.verbosePii(`Item key: ${key}`);
        const cache = this.getCache();
        cache[key] = value;
        this.setCache(cache);
    }
    getAccount(accountKey) {
        const account = this.getItem(accountKey);
        if (AccountEntity.isAccountEntity(account)) {
            return account;
        }
        return null;
    }
    setAccount(account) {
        const accountKey = account.generateAccountKey();
        this.setItem(accountKey, account);
    }
    getIdTokenCredential(idTokenKey) {
        const idToken = this.getItem(idTokenKey);
        if (IdTokenEntity.isIdTokenEntity(idToken)) {
            return idToken;
        }
        return null;
    }
    setIdTokenCredential(idToken) {
        const idTokenKey = idToken.generateCredentialKey();
        this.setItem(idTokenKey, idToken);
    }
    getAccessTokenCredential(accessTokenKey) {
        const accessToken = this.getItem(accessTokenKey);
        if (AccessTokenEntity.isAccessTokenEntity(accessToken)) {
            return accessToken;
        }
        return null;
    }
    setAccessTokenCredential(accessToken) {
        const accessTokenKey = accessToken.generateCredentialKey();
        this.setItem(accessTokenKey, accessToken);
    }
    getRefreshTokenCredential(refreshTokenKey) {
        const refreshToken = this.getItem(refreshTokenKey);
        if (RefreshTokenEntity.isRefreshTokenEntity(refreshToken)) {
            return refreshToken;
        }
        return null;
    }
    setRefreshTokenCredential(refreshToken) {
        const refreshTokenKey = refreshToken.generateCredentialKey();
        this.setItem(refreshTokenKey, refreshToken);
    }
    getAppMetadata(appMetadataKey) {
        const appMetadata = this.getItem(appMetadataKey);
        if (AppMetadataEntity.isAppMetadataEntity(appMetadataKey, appMetadata)) {
            return appMetadata;
        }
        return null;
    }
    setAppMetadata(appMetadata) {
        const appMetadataKey = appMetadata.generateAppMetadataKey();
        this.setItem(appMetadataKey, appMetadata);
    }
    getServerTelemetry(serverTelemetrykey) {
        const serverTelemetryEntity = this.getItem(serverTelemetrykey);
        if (serverTelemetryEntity && ServerTelemetryEntity.isServerTelemetryEntity(serverTelemetrykey, serverTelemetryEntity)) {
            return serverTelemetryEntity;
        }
        return null;
    }
    setServerTelemetry(serverTelemetryKey, serverTelemetry) {
        this.setItem(serverTelemetryKey, serverTelemetry);
    }
    getAuthorityMetadata(key) {
        const authorityMetadataEntity = this.getItem(key);
        if (authorityMetadataEntity && AuthorityMetadataEntity.isAuthorityMetadataEntity(key, authorityMetadataEntity)) {
            return authorityMetadataEntity;
        }
        return null;
    }
    getAuthorityMetadataKeys() {
        return this.getKeys().filter((key10)=>{
            return this.isAuthorityMetadata(key10);
        });
    }
    setAuthorityMetadata(key, metadata) {
        this.setItem(key, metadata);
    }
    getThrottlingCache(throttlingCacheKey) {
        const throttlingCache = this.getItem(throttlingCacheKey);
        if (throttlingCache && ThrottlingEntity.isThrottlingEntity(throttlingCacheKey, throttlingCache)) {
            return throttlingCache;
        }
        return null;
    }
    setThrottlingCache(throttlingCacheKey, throttlingCache) {
        this.setItem(throttlingCacheKey, throttlingCache);
    }
    removeItem(key) {
        this.logger.verbosePii(`Item key: ${key}`);
        let result = false;
        const cache = this.getCache();
        if (!!cache[key]) {
            delete cache[key];
            result = true;
        }
        if (result) {
            this.setCache(cache);
            this.emitChange();
        }
        return result;
    }
    containsKey(key) {
        return this.getKeys().includes(key);
    }
    getKeys() {
        this.logger.verbose("Retrieving all cache keys");
        const cache = this.getCache();
        return [
            ...Object.keys(cache)
        ];
    }
    clear() {
        this.logger.verbose("Clearing cache entries created by MSAL");
        const cacheKeys = this.getKeys();
        cacheKeys.forEach((key10)=>{
            this.removeItem(key10);
        });
        this.emitChange();
    }
    static generateInMemoryCache(cache) {
        return Deserializer.deserializeAllCache(Deserializer.deserializeJSONBlob(cache));
    }
    static generateJsonCache(inMemoryCache) {
        return Serializer.serializeAllCache(inMemoryCache);
    }
}
function ownKeys$3(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$3(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source7 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$3(Object(source7), true).forEach(function(key10) {
                _defineProperty$1(target, key10, source7[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source7));
        } else {
            ownKeys$3(Object(source7)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source7, key10));
            });
        }
    }
    return target;
}
const defaultSerializedCache = {
    Account: {
    },
    IdToken: {
    },
    AccessToken: {
    },
    RefreshToken: {
    },
    AppMetadata: {
    }
};
class TokenCache1 {
    constructor(storage, logger2, cachePlugin){
        this.cacheHasChanged = false;
        this.storage = storage;
        this.storage.registerChangeEmitter(this.handleChangeEvent.bind(this));
        if (cachePlugin) {
            this.persistence = cachePlugin;
        }
        this.logger = logger2;
    }
    hasChanged() {
        return this.cacheHasChanged;
    }
    serialize() {
        this.logger.verbose("Serializing in-memory cache");
        let finalState = Serializer.serializeAllCache(this.storage.getInMemoryCache());
        if (!StringUtils.isEmpty(this.cacheSnapshot)) {
            this.logger.verbose("Reading cache snapshot from disk");
            finalState = this.mergeState(JSON.parse(this.cacheSnapshot), finalState);
        } else {
            this.logger.verbose("No cache snapshot to merge");
        }
        this.cacheHasChanged = false;
        return JSON.stringify(finalState);
    }
    deserialize(cache) {
        this.logger.verbose("Deserializing JSON to in-memory cache");
        this.cacheSnapshot = cache;
        if (!StringUtils.isEmpty(this.cacheSnapshot)) {
            this.logger.verbose("Reading cache snapshot from disk");
            const deserializedCache = Deserializer.deserializeAllCache(this.overlayDefaults(JSON.parse(this.cacheSnapshot)));
            this.storage.setInMemoryCache(deserializedCache);
        } else {
            this.logger.verbose("No cache snapshot to deserialize");
        }
    }
    getKVStore() {
        return this.storage.getCache();
    }
    async getAllAccounts() {
        this.logger.verbose("getAllAccounts called");
        let cacheContext;
        try {
            if (this.persistence) {
                cacheContext = new TokenCacheContext1(this, false);
                await this.persistence.beforeCacheAccess(cacheContext);
            }
            return this.storage.getAllAccounts();
        } finally{
            if (this.persistence && cacheContext) {
                await this.persistence.afterCacheAccess(cacheContext);
            }
        }
    }
    async getAccountByHomeId(homeAccountId) {
        const allAccounts = await this.getAllAccounts();
        if (!StringUtils.isEmpty(homeAccountId) && allAccounts && allAccounts.length) {
            return allAccounts.filter((accountObj)=>accountObj.homeAccountId === homeAccountId
            )[0] || null;
        } else {
            return null;
        }
    }
    async getAccountByLocalId(localAccountId) {
        const allAccounts = await this.getAllAccounts();
        if (!StringUtils.isEmpty(localAccountId) && allAccounts && allAccounts.length) {
            return allAccounts.filter((accountObj)=>accountObj.localAccountId === localAccountId
            )[0] || null;
        } else {
            return null;
        }
    }
    async removeAccount(account) {
        this.logger.verbose("removeAccount called");
        let cacheContext;
        try {
            if (this.persistence) {
                cacheContext = new TokenCacheContext1(this, true);
                await this.persistence.beforeCacheAccess(cacheContext);
            }
            this.storage.removeAccount(AccountEntity.generateAccountCacheKey(account));
        } finally{
            if (this.persistence && cacheContext) {
                await this.persistence.afterCacheAccess(cacheContext);
            }
        }
    }
    handleChangeEvent() {
        this.cacheHasChanged = true;
    }
    mergeState(oldState, currentState) {
        this.logger.verbose("Merging in-memory cache with cache snapshot");
        const stateAfterRemoval = this.mergeRemovals(oldState, currentState);
        return this.mergeUpdates(stateAfterRemoval, currentState);
    }
    mergeUpdates(oldState, newState) {
        Object.keys(newState).forEach((newKey)=>{
            const newValue = newState[newKey];
            if (!oldState.hasOwnProperty(newKey)) {
                if (newValue !== null) {
                    oldState[newKey] = newValue;
                }
            } else {
                const newValueNotNull = newValue !== null;
                const newValueIsObject = typeof newValue === "object";
                const newValueIsNotArray = !Array.isArray(newValue);
                const oldStateNotUndefinedOrNull = typeof oldState[newKey] !== "undefined" && oldState[newKey] !== null;
                if (newValueNotNull && newValueIsObject && newValueIsNotArray && oldStateNotUndefinedOrNull) {
                    this.mergeUpdates(oldState[newKey], newValue);
                } else {
                    oldState[newKey] = newValue;
                }
            }
        });
        return oldState;
    }
    mergeRemovals(oldState, newState) {
        this.logger.verbose("Remove updated entries in cache");
        const accounts = oldState.Account ? this.mergeRemovalsDict(oldState.Account, newState.Account) : oldState.Account;
        const accessTokens = oldState.AccessToken ? this.mergeRemovalsDict(oldState.AccessToken, newState.AccessToken) : oldState.AccessToken;
        const refreshTokens = oldState.RefreshToken ? this.mergeRemovalsDict(oldState.RefreshToken, newState.RefreshToken) : oldState.RefreshToken;
        const idTokens = oldState.IdToken ? this.mergeRemovalsDict(oldState.IdToken, newState.IdToken) : oldState.IdToken;
        const appMetadata = oldState.AppMetadata ? this.mergeRemovalsDict(oldState.AppMetadata, newState.AppMetadata) : oldState.AppMetadata;
        return _objectSpread$3(_objectSpread$3({
        }, oldState), {
        }, {
            Account: accounts,
            AccessToken: accessTokens,
            RefreshToken: refreshTokens,
            IdToken: idTokens,
            AppMetadata: appMetadata
        });
    }
    mergeRemovalsDict(oldState, newState) {
        const finalState = _objectSpread$3({
        }, oldState);
        Object.keys(oldState).forEach((oldKey)=>{
            if (!newState || !newState.hasOwnProperty(oldKey)) {
                delete finalState[oldKey];
            }
        });
        return finalState;
    }
    overlayDefaults(passedInCache) {
        this.logger.verbose("Overlaying input cache with the default cache");
        return {
            Account: _objectSpread$3(_objectSpread$3({
            }, defaultSerializedCache.Account), passedInCache.Account),
            IdToken: _objectSpread$3(_objectSpread$3({
            }, defaultSerializedCache.IdToken), passedInCache.IdToken),
            AccessToken: _objectSpread$3(_objectSpread$3({
            }, defaultSerializedCache.AccessToken), passedInCache.AccessToken),
            RefreshToken: _objectSpread$3(_objectSpread$3({
            }, defaultSerializedCache.RefreshToken), passedInCache.RefreshToken),
            AppMetadata: _objectSpread$3(_objectSpread$3({
            }, defaultSerializedCache.AppMetadata), passedInCache.AppMetadata)
        };
    }
}
const name13 = "@azure/msal-node";
const version2 = "1.1.0";
function ownKeys$2(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$2(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source8 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$2(Object(source8), true).forEach(function(key10) {
                _defineProperty$1(target, key10, source8[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source8));
        } else {
            ownKeys$2(Object(source8)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source8, key10));
            });
        }
    }
    return target;
}
class ClientApplication1 {
    constructor(configuration8){
        this.config = buildAppConfiguration1(configuration8);
        this.cryptoProvider = new CryptoProvider1();
        this.logger = new Logger1(this.config.system.loggerOptions, name13, version2);
        this.storage = new NodeStorage1(this.logger, this.config.auth.clientId, this.cryptoProvider);
        this.tokenCache = new TokenCache1(this.storage, this.logger, this.config.cache.cachePlugin);
    }
    async getAuthCodeUrl(request) {
        this.logger.info("getAuthCodeUrl called");
        const validRequest = _objectSpread$2(_objectSpread$2(_objectSpread$2({
        }, request), this.initializeBaseRequest(request)), {
        }, {
            responseMode: request.responseMode || ResponseMode1.QUERY,
            authenticationScheme: AuthenticationScheme.BEARER
        });
        const authClientConfig = await this.buildOauthClientConfiguration(validRequest.authority);
        this.logger.verbose("Auth client config generated");
        const authorizationCodeClient = new AuthorizationCodeClient(authClientConfig);
        return authorizationCodeClient.getAuthCodeUrl(validRequest);
    }
    async acquireTokenByCode(request) {
        this.logger.info("acquireTokenByCode called");
        const validRequest = _objectSpread$2(_objectSpread$2(_objectSpread$2({
        }, request), this.initializeBaseRequest(request)), {
        }, {
            authenticationScheme: AuthenticationScheme.BEARER
        });
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByCode, validRequest.correlationId);
        try {
            const authClientConfig = await this.buildOauthClientConfiguration(validRequest.authority, serverTelemetryManager);
            this.logger.verbose("Auth client config generated");
            const authorizationCodeClient = new AuthorizationCodeClient(authClientConfig);
            return authorizationCodeClient.acquireToken(validRequest);
        } catch (e) {
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        }
    }
    async acquireTokenByRefreshToken(request) {
        this.logger.info("acquireTokenByRefreshToken called");
        const validRequest = _objectSpread$2(_objectSpread$2(_objectSpread$2({
        }, request), this.initializeBaseRequest(request)), {
        }, {
            authenticationScheme: AuthenticationScheme.BEARER
        });
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByRefreshToken, validRequest.correlationId);
        try {
            const refreshTokenClientConfig = await this.buildOauthClientConfiguration(validRequest.authority, serverTelemetryManager);
            this.logger.verbose("Auth client config generated");
            const refreshTokenClient = new RefreshTokenClient(refreshTokenClientConfig);
            return refreshTokenClient.acquireToken(validRequest);
        } catch (e) {
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        }
    }
    async acquireTokenSilent(request) {
        const validRequest = _objectSpread$2(_objectSpread$2(_objectSpread$2({
        }, request), this.initializeBaseRequest(request)), {
        }, {
            forceRefresh: request.forceRefresh || false
        });
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenSilent, validRequest.correlationId, validRequest.forceRefresh);
        try {
            const silentFlowClientConfig = await this.buildOauthClientConfiguration(validRequest.authority, serverTelemetryManager);
            const silentFlowClient = new SilentFlowClient(silentFlowClientConfig);
            return silentFlowClient.acquireToken(validRequest);
        } catch (e) {
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        }
    }
    getTokenCache() {
        this.logger.info("getTokenCache called");
        return this.tokenCache;
    }
    getLogger() {
        return this.logger;
    }
    setLogger(logger) {
        this.logger = logger;
    }
    async buildOauthClientConfiguration(authority, serverTelemetryManager, azureRegionConfiguration) {
        this.logger.verbose("buildOauthClientConfiguration called");
        this.logger.verbose(`building oauth client configuration with the authority: ${authority}`);
        const discoveredAuthority = await this.createAuthority(authority, azureRegionConfiguration);
        return {
            authOptions: {
                clientId: this.config.auth.clientId,
                authority: discoveredAuthority,
                clientCapabilities: this.config.auth.clientCapabilities
            },
            loggerOptions: {
                loggerCallback: this.config.system.loggerOptions.loggerCallback,
                piiLoggingEnabled: this.config.system.loggerOptions.piiLoggingEnabled
            },
            cryptoInterface: this.cryptoProvider,
            networkInterface: this.config.system.networkClient,
            storageInterface: this.storage,
            serverTelemetryManager: serverTelemetryManager,
            clientCredentials: {
                clientSecret: this.clientSecret,
                clientAssertion: this.clientAssertion ? this.getClientAssertion(discoveredAuthority) : undefined
            },
            libraryInfo: {
                sku: Constants$1.MSAL_SKU,
                version: version2,
                cpu: process.arch || "",
                os: process.platform || ""
            },
            persistencePlugin: this.config.cache.cachePlugin,
            serializableCache: this.tokenCache
        };
    }
    getClientAssertion(authority) {
        return {
            assertion: this.clientAssertion.getJwt(this.cryptoProvider, this.config.auth.clientId, authority.tokenEndpoint),
            assertionType: Constants$1.JWT_BEARER_ASSERTION_TYPE
        };
    }
    initializeBaseRequest(authRequest) {
        this.logger.verbose("initializeRequestScopes called");
        if (authRequest.authenticationScheme && authRequest.authenticationScheme === AuthenticationScheme.POP) {
            this.logger.verbose("Authentication Scheme 'pop' is not supported yet, setting Authentication Scheme to 'Bearer' for request");
        }
        authRequest.authenticationScheme = AuthenticationScheme.BEARER;
        return _objectSpread$2(_objectSpread$2({
        }, authRequest), {
        }, {
            scopes: [
                ...authRequest && authRequest.scopes || [],
                ...OIDC_DEFAULT_SCOPES
            ],
            correlationId: authRequest && authRequest.correlationId || this.cryptoProvider.createNewGuid(),
            authority: authRequest.authority || this.config.auth.authority
        });
    }
    initializeServerTelemetryManager(apiId, correlationId, forceRefresh) {
        const telemetryPayload = {
            clientId: this.config.auth.clientId,
            correlationId: correlationId,
            apiId: apiId,
            forceRefresh: forceRefresh || false
        };
        return new ServerTelemetryManager(telemetryPayload, this.storage);
    }
    async createAuthority(authorityString, azureRegionConfiguration) {
        this.logger.verbose("createAuthority called");
        const authorityOptions2 = {
            protocolMode: this.config.auth.protocolMode,
            knownAuthorities: this.config.auth.knownAuthorities,
            cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
            authorityMetadata: this.config.auth.authorityMetadata,
            azureRegionConfiguration
        };
        return await AuthorityFactory.createDiscoveredInstance(authorityString, this.config.system.networkClient, this.storage, authorityOptions2);
    }
}
function ownKeys$1(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread$1(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source9 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys$1(Object(source9), true).forEach(function(key10) {
                _defineProperty$1(target, key10, source9[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source9));
        } else {
            ownKeys$1(Object(source9)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source9, key10));
            });
        }
    }
    return target;
}
class PublicClientApplication1 extends ClientApplication1 {
    constructor(configuration9){
        super(configuration9);
    }
    async acquireTokenByDeviceCode(request) {
        this.logger.info("acquireTokenByDeviceCode called");
        const validRequest = Object.assign(request, this.initializeBaseRequest(request));
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByDeviceCode, validRequest.correlationId);
        try {
            const deviceCodeConfig = await this.buildOauthClientConfiguration(validRequest.authority, serverTelemetryManager);
            this.logger.verbose("Auth client config generated");
            const deviceCodeClient = new DeviceCodeClient(deviceCodeConfig);
            return deviceCodeClient.acquireToken(validRequest);
        } catch (e) {
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        }
    }
    async acquireTokenByUsernamePassword(request) {
        this.logger.info("acquireTokenByUsernamePassword called");
        const validRequest = _objectSpread$1(_objectSpread$1({
        }, request), this.initializeBaseRequest(request));
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByUsernamePassword, validRequest.correlationId);
        try {
            const usernamePasswordClientConfig = await this.buildOauthClientConfiguration(validRequest.authority, serverTelemetryManager);
            this.logger.verbose("Auth client config generated");
            const usernamePasswordClient = new UsernamePasswordClient(usernamePasswordClientConfig);
            return usernamePasswordClient.acquireToken(validRequest);
        } catch (e) {
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        }
    }
}
class ClientAssertion1 {
    static fromAssertion(assertion) {
        const clientAssertion = new ClientAssertion1();
        clientAssertion.jwt = assertion;
        return clientAssertion;
    }
    static fromCertificate(thumbprint, privateKey, publicCertificate) {
        const clientAssertion = new ClientAssertion1();
        clientAssertion.privateKey = privateKey;
        clientAssertion.thumbprint = thumbprint;
        if (publicCertificate) {
            clientAssertion.publicCertificate = this.parseCertificate(publicCertificate);
        }
        return clientAssertion;
    }
    getJwt(cryptoProvider, issuer, jwtAudience) {
        if (this.privateKey && this.thumbprint) {
            if (this.jwt && !this.isExpired() && issuer === this.issuer && jwtAudience === this.jwtAudience) {
                return this.jwt;
            }
            return this.createJwt(cryptoProvider, issuer, jwtAudience);
        }
        if (this.jwt) {
            return this.jwt;
        }
        throw ClientAuthError1.createInvalidAssertionError();
    }
    createJwt(cryptoProvider, issuer, jwtAudience) {
        this.issuer = issuer;
        this.jwtAudience = jwtAudience;
        const issuedAt = TimeUtils.nowSeconds();
        this.expirationTime = issuedAt + 600;
        const header = {
            [JwtConstants.ALGORITHM]: JwtConstants.RSA_256,
            [JwtConstants.X5T]: EncodingUtils.base64EncodeUrl(this.thumbprint, "hex")
        };
        if (this.publicCertificate) {
            Object.assign(header, {
                [JwtConstants.X5C]: this.publicCertificate
            });
        }
        const payload = {
            [JwtConstants.AUDIENCE]: this.jwtAudience,
            [JwtConstants.EXPIRATION_TIME]: this.expirationTime,
            [JwtConstants.ISSUER]: this.issuer,
            [JwtConstants.SUBJECT]: this.issuer,
            [JwtConstants.NOT_BEFORE]: issuedAt,
            [JwtConstants.JWT_ID]: cryptoProvider.createNewGuid()
        };
        this.jwt = sign(payload, this.privateKey, {
            header: header
        });
        return this.jwt;
    }
    isExpired() {
        return this.expirationTime < TimeUtils.nowSeconds();
    }
    static parseCertificate(publicCertificate) {
        const regexToFindCerts = /-----BEGIN CERTIFICATE-----\n(.+?)\n-----END CERTIFICATE-----/gs;
        const certs = [];
        let matches;
        while((matches = regexToFindCerts.exec(publicCertificate)) !== null){
            certs.push(matches[1].replace(/\n/, ""));
        }
        return certs;
    }
}
function ownKeys(object1, enumerableOnly) {
    var keys = Object.keys(object1);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object1);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object1, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _objectSpread(target) {
    for(var i7 = 1; i7 < arguments.length; i7++){
        var source10 = arguments[i7] != null ? arguments[i7] : {
        };
        if (i7 % 2) {
            ownKeys(Object(source10), true).forEach(function(key10) {
                _defineProperty$1(target, key10, source10[key10]);
            });
        } else if (Object.getOwnPropertyDescriptors) {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(source10));
        } else {
            ownKeys(Object(source10)).forEach(function(key10) {
                Object.defineProperty(target, key10, Object.getOwnPropertyDescriptor(source10, key10));
            });
        }
    }
    return target;
}
class ConfidentialClientApplication1 extends ClientApplication1 {
    constructor(configuration10){
        super(configuration10);
        this.setClientCredential(this.config);
    }
    async acquireTokenByClientCredential(request) {
        this.logger.info("acquireTokenByClientCredential called");
        const validRequest = _objectSpread(_objectSpread({
        }, request), this.initializeBaseRequest(request));
        const azureRegionConfiguration = {
            azureRegion: validRequest.azureRegion,
            environmentRegion: process.env[REGION_ENVIRONMENT_VARIABLE]
        };
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByClientCredential, validRequest.correlationId, validRequest.skipCache);
        try {
            const clientCredentialConfig = await this.buildOauthClientConfiguration(validRequest.authority, serverTelemetryManager, azureRegionConfiguration);
            this.logger.verbose("Auth client config generated");
            const clientCredentialClient = new ClientCredentialClient(clientCredentialConfig);
            return clientCredentialClient.acquireToken(validRequest);
        } catch (e) {
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        }
    }
    async acquireTokenOnBehalfOf(request) {
        this.logger.info("acquireTokenOnBehalfOf called");
        const validRequest = _objectSpread(_objectSpread({
        }, request), this.initializeBaseRequest(request));
        const clientCredentialConfig = await this.buildOauthClientConfiguration(validRequest.authority);
        this.logger.verbose("Auth client config generated");
        const oboClient = new OnBehalfOfClient(clientCredentialConfig);
        return oboClient.acquireToken(validRequest);
    }
    setClientCredential(configuration) {
        const clientSecretNotEmpty = !StringUtils.isEmpty(configuration.auth.clientSecret);
        const clientAssertionNotEmpty = !StringUtils.isEmpty(configuration.auth.clientAssertion);
        const certificate = configuration.auth.clientCertificate;
        const certificateNotEmpty = !StringUtils.isEmpty(certificate.thumbprint) || !StringUtils.isEmpty(certificate.privateKey);
        if (clientSecretNotEmpty && clientAssertionNotEmpty || clientAssertionNotEmpty && certificateNotEmpty || clientSecretNotEmpty && certificateNotEmpty) {
            throw ClientAuthError1.createInvalidCredentialError();
        }
        if (clientSecretNotEmpty) {
            this.clientSecret = configuration.auth.clientSecret;
            return;
        }
        if (clientAssertionNotEmpty) {
            this.clientAssertion = ClientAssertion1.fromAssertion(configuration.auth.clientAssertion);
            return;
        }
        if (!certificateNotEmpty) {
            throw ClientAuthError1.createInvalidCredentialError();
        } else {
            this.clientAssertion = ClientAssertion1.fromCertificate(certificate.thumbprint, certificate.privateKey, configuration.auth.clientCertificate?.x5c);
        }
    }
}
export { AuthError1 as AuthError, AuthErrorMessage1 as AuthErrorMessage, ClientApplication1 as ClientApplication, ClientAssertion1 as ClientAssertion, ClientAuthError1 as ClientAuthError, ClientAuthErrorMessage1 as ClientAuthErrorMessage, ClientConfigurationError1 as ClientConfigurationError, ClientConfigurationErrorMessage1 as ClientConfigurationErrorMessage, ConfidentialClientApplication1 as ConfidentialClientApplication, CryptoProvider1 as CryptoProvider, InteractionRequiredAuthError1 as InteractionRequiredAuthError, LogLevel1 as LogLevel, Logger1 as Logger, NodeStorage1 as NodeStorage, PromptValue1 as PromptValue, ProtocolMode1 as ProtocolMode, PublicClientApplication1 as PublicClientApplication, ResponseMode1 as ResponseMode, ServerError1 as ServerError, TokenCache1 as TokenCache, TokenCacheContext1 as TokenCacheContext, buildAppConfiguration1 as buildAppConfiguration };
