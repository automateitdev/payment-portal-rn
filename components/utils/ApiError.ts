export type AppError = {
  status?: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
  listErrors?: string[];
  /** Business-level status from payload.data.status (e.g. "error" | "warning") */
  businessStatus?: string;
  raw?: unknown; // keep original error for debugging
};
