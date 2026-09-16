export class AppError extends Error {
    status: number;
    code: string;

    constructor(
        message: string,
        status = 400,
        code = "APP_ERROR"
    ) {
        super(message);

        this.status = status;
        this.code = code;

        Object.setPrototypeOf(this, AppError.prototype);
    }
}