class ApiError extends Error {
    constructor(
        statusCode,
        message = 'Something went wrong',
        errors = [],
        stack = '')
    { // overwriting the constructor of the Error class
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;
        
        // if the stack is not provided, we will capture the stack trace
        // stack trace is the path of the function calls that led to the error
        // it is used to debug the code and find the error
        // it is also used to find the line of code, the function, the file, the column, the line number, the column number that caused the error
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor); // capturing the stack trace
        }
    }
}

export default ApiError;