export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface SuccessResponse<T> {
  error: undefined;
  data: T;
}

export type ApiResponse<T> = ErrorResponse | SuccessResponse<T>;
