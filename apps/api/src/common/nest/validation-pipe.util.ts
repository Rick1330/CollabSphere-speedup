import { HttpException, HttpStatus } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { createValidationErrorDetails } from "../errors/validation-errors.js";

const flattenValidationErrors = (
  errors: ValidationError[],
  parentPath = "",
): Array<{ field: string; message: string; rule: string }> => {
  const issues: Array<{ field: string; message: string; rule: string }> = [];

  for (const error of errors) {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      const rules = Object.keys(error.constraints);
      const rule = rules[0] ?? "invalid";
      const message = error.constraints[rule] ?? "Validation failed";
      issues.push({ field, message, rule });
    }

    if (error.children?.length) {
      issues.push(...flattenValidationErrors(error.children, field));
    }
  }

  return issues;
};

export const createValidationPipeExceptionFactory = () => (errors: ValidationError[]) => {
  const details = createValidationErrorDetails(flattenValidationErrors(errors));

  throw new HttpException(
    {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details,
    },
    HttpStatus.BAD_REQUEST,
  );
};
