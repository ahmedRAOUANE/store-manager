import { AppError } from "./base.error";

export class ProductNotFoundError extends AppError {
    constructor() {
        super(
            "Product not found",
            404,
            "PRODUCT_NOT_FOUND"
        );
    }
}

export class ProductAlreadyExistsError extends AppError {
    constructor() {
        super(
            "Product already exists",
            409,
            "PRODUCT_ALREADY_EXISTS"
        );
    }
}