import { AppError } from "./base.error";

export class DatabaseError extends AppError {
    constructor(message: string, cause: Record<string, unknown>) {
        super(
            message ?? "Database operation failed",
            500,
            "DATABASE_ERROR",
        );
        this.cause = cause
    }
}