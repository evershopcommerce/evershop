export interface ErrorResponse {
  error: {
    status: number;
    message: string;
  };
}

export interface SuccessResponse<T> {
  error: undefined;
  data: T;
}

export type ApiResponse<T> = ErrorResponse | SuccessResponse<T>;
