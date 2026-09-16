import { AppError } from "./base.error";

export class CategoryNotFoundError extends AppError {
    constructor() {
        super(
            "Category not found",
            404,
            "CATEGORY_NOT_FOUND"
        );
    }
}

export class CategoryAlreadyExistsError extends AppError {
    constructor() {
        super(
            "Category already exists",
            409,
            "CATEGORY_ALREADY_EXISTS"
        );
    }
}