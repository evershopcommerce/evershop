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

export const isErrorResponse = (
  response: ApiResponse<unknown>
): response is ErrorResponse => {
  return response.error !== undefined;
};

export const isSuccessResponse = <T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> => {
  return response.error === undefined;
};
