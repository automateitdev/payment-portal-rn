import { AppError } from "./ApiError";

/**
 * RTK Query error (current backend)
 */
const normalizeRtkQueryError = (error: unknown): AppError | null => {
  const e = error as {
    status?: number;
    data?: {
      message?: string;
      errors?: {
        request_error?: { field?: string; message?: string }[];
        system_error?: { message?: string }[];
        validation_error?: { field?: string | null; message?: string }[];
        not_found?: { field?: string | null; message?: string }[];
      };
      payload?: {
        data?: {
          validation_error?: { field: string; message: string }[];
        };
      };
    };
  };

  /* ===== payload.data.validation_error (422) ===== */
  const validation = e?.data?.payload?.data?.validation_error;
  if (Array.isArray(validation) && validation.length > 0) {
    return {
      status: e.status,
      message: "Validation error",
      fieldErrors: validation.reduce<Record<string, string[]>>((acc, curr) => {
        acc[curr.field] ??= [];
        acc[curr.field].push(curr.message);
        return acc;
      }, {}),
      raw: error,
    };
  }

  /* ===== data.errors.request_error[] ===== */
  const requestErrors = e?.data?.errors?.request_error;
  if (Array.isArray(requestErrors) && requestErrors.length > 0) {
    return {
      status: e.status,
      // If there's a specific message, use it instead of generic "Request validation failed"
      message: requestErrors[0]?.message ?? "Request validation failed",
      fieldErrors: requestErrors.reduce<Record<string, string[]>>(
        (acc, curr) => {
          if (!curr.field || !curr.message) return acc;
          acc[curr.field] ??= [];
          acc[curr.field].push(curr.message);
          return acc;
        },
        {},
      ),
      listErrors: requestErrors
        .map((e) => e.message)
        .filter((m): m is string => Boolean(m)),
      raw: error,
    };
  }

  /* ===== data.errors.validation_error[] (422 variant) ===== */
  const validationErrorsList = e?.data?.errors?.validation_error;
  if (Array.isArray(validationErrorsList) && validationErrorsList.length > 0) {
    return {
      status: e.status,
      message: validationErrorsList[0]?.message ?? "Validation failed",
      fieldErrors: validationErrorsList.reduce<Record<string, string[]>>(
        (acc, curr) => {
          if (!curr.field || !curr.message) return acc;
          acc[curr.field] ??= [];
          acc[curr.field].push(curr.message);
          return acc;
        },
        {},
      ),
      listErrors: validationErrorsList
        .map((e) => e.message)
        .filter((m): m is string => Boolean(m)),
      raw: error,
    };
  }

  /* ===== data.errors.not_found[] ===== */
  const notFoundErrors = e?.data?.errors?.not_found;
  if (Array.isArray(notFoundErrors) && notFoundErrors.length > 0) {
    return {
      status: e.status,
      message: notFoundErrors[0]?.message ?? "Not found",
      listErrors: notFoundErrors
        .map((e) => e.message)
        .filter((m): m is string => Boolean(m)),
      raw: error,
    };
  }

  /* ===== data.errors.system_error[] ===== */
  const systemErrors = e?.data?.errors?.system_error;
  if (Array.isArray(systemErrors) && systemErrors.length > 0) {
    return {
      status: e.status,
      message: systemErrors[0]?.message ?? "A system error occurred",
      listErrors: systemErrors
        .map((e) => e.message)
        .filter((m): m is string => Boolean(m)),
      raw: error,
    };
  }

  /* ===== HTTP-success body with payload.data.status === "error" =====
     Shape:
     { data: { payload: { data: {
         status: "error",
         message: "..." | { validation_error: [{ field, message }], ... }
     }}}} */
  const businessData =
    (
      error as {
        data?: {
          payload?: {
            data?: {
              status?: string;
              message?:
                | string
                | {
                    validation_error?: {
                      field?: string | null;
                      message?: string;
                    }[];
                    request_error?: {
                      field?: string | null;
                      message?: string;
                    }[];
                    system_error?: { message?: string }[];
                  };
            };
          };
        };
      }
    )?.data?.payload?.data || (error as any)?.payload?.data;

  if (businessData?.status === "error" || businessData?.status === "warning") {
    const msg = businessData.message;
    const resolvedStatus =
      e.status ??
      (e.data as any)?.status_code ??
      (error as any)?.status_code ??
      (businessData as any)?.statusCode;

    if (typeof msg === "string" && msg) {
      return {
        status: resolvedStatus ? Number(resolvedStatus) : undefined,
        message: msg,
        businessStatus: businessData.status,
        raw: error,
      };
    }

    if (msg && typeof msg === "object") {
      const buckets = [
        msg.validation_error,
        msg.request_error,
        msg.system_error,
      ];
      const fieldErrors: Record<string, string[]> = {};
      const listErrors: string[] = [];
      for (const list of buckets) {
        if (!Array.isArray(list)) continue;
        for (const entry of list) {
          if (!entry?.message) continue;
          listErrors.push(entry.message);
          const field =
            "field" in entry && typeof entry.field === "string"
              ? entry.field
              : null;
          if (field) {
            fieldErrors[field] ??= [];
            fieldErrors[field].push(entry.message);
          }
        }
      }
      if (listErrors.length) {
        return {
          status: e.status,
          message: listErrors[0],
          businessStatus: businessData.status,
          fieldErrors: Object.keys(fieldErrors).length
            ? fieldErrors
            : undefined,
          listErrors,
          raw: error,
        };
      }
    }
  }

  /* ===== generic backend message ===== */
  if (e?.data?.message) {
    return {
      status: e.status,
      message: e.data.message,
      raw: error,
    };
  }

  return null;
};

/**
 * Axios / REST error
 */
const normalizeAxiosError = (error: unknown): AppError | null => {
  const e = error as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
  };

  if (e?.response?.data?.message) {
    return {
      status: e.response.status,
      message: e.response.data.message,
      fieldErrors: e.response.data.errors,
      raw: error,
    };
  }

  return null;
};

/**
 * Master normalizer
 */
export const normalizeApiError = (error: unknown): AppError => {
  return (
    normalizeRtkQueryError(error) ||
    normalizeAxiosError(error) || {
      message: "Something went wrong",
      raw: error,
    }
  );
};
