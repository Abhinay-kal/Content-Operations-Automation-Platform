export class ApiError extends Error {
    code: string;
    statusCode: number;

    constructor(code: string, message: string, statusCode: number = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}
