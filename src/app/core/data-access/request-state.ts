export interface RecoverableError {
  kind: "network" | "permission" | "storage" | "invalid-response" | "unknown";
  message: string;
  retryable: boolean;
}
export type RequestState<T> =
  | { status: "initial" }
  | { status: "loading" }
  | { status: "data"; data: T }
  | { status: "empty" }
  | { status: "error"; error: RecoverableError };
export type OperationState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; reference?: string }
  | { status: "error"; error: RecoverableError };
export const invalidResponse = (
  message = "El servicio devolvió datos con un formato no válido.",
) => new Error(message);
