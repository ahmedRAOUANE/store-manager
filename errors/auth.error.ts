import { AppError } from "./base.error";

export class AuthenticationError extends AppError {
    constructor() {
        super(
            "Authentication failed",
            401,
            "AUTHENTICATION_ERROR"
        );
    }
}

export class AuthorizationError extends AppError {
    constructor() {
        super(
            "You are not authorized to perform this action",
            403,
            "AUTHORIZATION_ERROR"
        );
    }
}
