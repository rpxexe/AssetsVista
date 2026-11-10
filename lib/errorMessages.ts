export interface ParsedErrorInfo {
  message: string;
  hint?: string;
  status: number;
}

const FIELD_LABELS: Record<string, string> = {
  auth0Id: "legacy authentication ID",
  clerkId: "user account ID",
  email: "Email address",
  username: "Username",
  asset_tag: "Asset Tag",
  serial_number: "Serial Number",
  name: "Name",
  model_no: "Model Number",
  company: "Company",
  location: "Location",
  department: "Department",
  category: "Category",
  status: "Status",
  supplier: "Supplier",
  manufacturer: "Manufacturer",
  asset_model: "Asset Model",
};

function humanizeField(field: string): string {
  const clean = field.replace(/_\d+$/, "").trim();
  if (FIELD_LABELS[clean]) return FIELD_LABELS[clean];
  return clean
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanDupValue(raw: unknown): string {
  if (raw === null || raw === undefined) return "empty";
  const str = String(raw).trim().replace(/^["']|["']$/g, "");
  if (!str || str === "null" || str === "undefined") return "empty";
  return str;
}

function parseDuplicateKeyError(rawMsg: string, errObj?: Record<string, any>): ParsedErrorInfo {
  let field = "";
  let value = "";

  if (errObj?.keyValue && typeof errObj.keyValue === "object") {
    const firstKey = Object.keys(errObj.keyValue)[0];
    if (firstKey) {
      field = firstKey;
      value = cleanDupValue(errObj.keyValue[firstKey]);
    }
  }

  if (!field) {
    const dupMatch = rawMsg.match(/dup key:\s*\{\s*([^:\s}]+)\s*:\s*([^}]+)\}/i);
    if (dupMatch) {
      field = dupMatch[1].trim();
      value = cleanDupValue(dupMatch[2]);
    }
  }

  if (!field) {
    const indexMatch = rawMsg.match(/index:\s*([^\s]+)/i);
    if (indexMatch) {
      field = indexMatch[1].replace(/_\d+$/, "");
    }
  }

  const label = humanizeField(field || "record");

  if (field === "auth0Id" || field === "auth0Id_1") {
    return {
      status: 409,
      message:
        "A stale database index on users (`auth0Id`) blocked creating the user profile. We automatically cleared it—please click Complete Setup & Launch again.",
      hint: "If this persists, verify the `users` collection does not have a custom unique index on `auth0Id`.",
    };
  }

  if (field === "clerkId") {
    return {
      status: 409,
      message:
        "Your signed-in account is already linked to another user record with a different email address.",
      hint: "Use the same email address as your signed-in account or update the existing user in People -> Role & Access Management.",
    };
  }

  if (field === "email") {
    return {
      status: 409,
      message: `An account or record with email "${value}" already exists.`,
      hint: "Try using a different email address or updating the existing record.",
    };
  }

  if (field === "username") {
    return {
      status: 409,
      message: `The username "${value}" is already taken.`,
      hint: "Please choose a different username.",
    };
  }

  if (field === "asset_tag") {
    return {
      status: 409,
      message: `Asset Tag "${value}" is already assigned to another asset.`,
      hint: "Enter a unique Asset Tag.",
    };
  }

  if (field === "serial_number") {
    return {
      status: 409,
      message: `Serial Number "${value}" is already registered on another item.`,
      hint: "Enter a unique Serial Number.",
    };
  }

  if (field === "name") {
    return {
      status: 409,
      message: `${label} "${value}" already exists.`,
      hint: "Please choose a unique name.",
    };
  }

  return {
    status: 409,
    message:
      value && value !== "empty"
        ? `A duplicate entry already exists for ${label} ("${value}").`
        : `A duplicate ${label} record already exists in the database.`,
  };
}

/**
 * Converts low-level Mongoose, MongoDB, JSON, or runtime errors into user-understandable messages.
 */
export function parseReadableError(
  error: unknown,
  fallbackMessage = "Something went wrong while saving your changes."
): ParsedErrorInfo {
  const errObj =
    typeof error === "object" && error !== null ? (error as Record<string, any>) : undefined;
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof errObj?.message === "string"
      ? errObj.message
      : typeof error === "string"
      ? error
      : "";

  // 1. MongoDB duplicate key (E11000)
  if (
    errObj?.code === 11000 ||
    errObj?.cause?.code === 11000 ||
    /E11000\s+duplicate key error/i.test(rawMessage)
  ) {
    return parseDuplicateKeyError(rawMessage, errObj);
  }

  // 2. Mongoose ValidationError
  if (errObj?.name === "ValidationError" && errObj.errors && typeof errObj.errors === "object") {
    const details = Object.values(errObj.errors)
      .map((item: any) => {
        if (!item?.message) return null;
        return String(item.message)
          .replace(/^Path\s+`([^`]+)`\s+/i, (_, p) => `${humanizeField(p)} `)
          .trim();
      })
      .filter(Boolean);

    return {
      status: 400,
      message: details[0] || "Some required fields are missing or invalid.",
      hint: details.length > 1 ? details.slice(1).join(" ") : undefined,
    };
  }

  // 3. Mongoose CastError (invalid ObjectId, number, or date)
  if (errObj?.name === "CastError") {
    const fieldLabel = errObj.path ? humanizeField(String(errObj.path)) : "selected field";
    return {
      status: 400,
      message: `Invalid format provided for ${fieldLabel}.`,
    };
  }

  // 4. MongoDB connection / network / timeout errors
  if (
    errObj?.name === "MongoServerSelectionError" ||
    errObj?.name === "MongoNetworkError" ||
    /MONGODB_URI|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Server selection timed out|Client must be connected/i.test(
      rawMessage
    )
  ) {
    return {
      status: 503,
      message:
        "Unable to connect to the MongoDB database. Please check that the database service is running and MONGODB_URI is valid.",
      hint: "Verify your network connection, MongoDB Atlas IP allowlist, or .env.local configuration.",
    };
  }

  // 5. Invalid JSON payload
  if (error instanceof SyntaxError && /JSON/i.test(rawMessage)) {
    return {
      status: 400,
      message: "Invalid data format sent to the server. Please refresh and try again.",
    };
  }

  // 6. Strip verbose Mongo plan-executor boilerplate if any leaked into generic Error
  if (rawMessage) {
    const cleaned = rawMessage
      .replace(/^Plan executor error during [^:]+::\s*caused by\s*::\s*/i, "")
      .replace(/^MongoServerError:\s*/i, "")
      .trim();

    if (cleaned) {
      return {
        status: 500,
        message: cleaned,
      };
    }
  }

  return {
    status: 500,
    message: fallbackMessage,
  };
}

/**
 * Extracts a clean, readable error string from Axios/fetch/unknown client errors.
 */
export function getClientErrorMessage(
  error: unknown,
  fallbackMessage = "Request failed. Please try again."
): string {
  const errObj =
    typeof error === "object" && error !== null ? (error as Record<string, any>) : undefined;

  // Axios offline / network failure
  if (errObj?.code === "ERR_NETWORK" || errObj?.message === "Network Error") {
    return "Cannot reach the server. Please check your connection and confirm the app server is running.";
  }
  if (errObj?.code === "ECONNABORTED") {
    return "The request timed out before finishing. Please try again.";
  }

  const serverMessage = errObj?.response?.data?.message;
  const serverHint = errObj?.response?.data?.hint;

  if (typeof serverMessage === "string" && serverMessage.trim()) {
    const parsed = parseReadableError(serverMessage, fallbackMessage);
    return serverHint ? `${parsed.message} ${serverHint}` : parsed.message;
  }

  const httpStatus = errObj?.response?.status;
  if (httpStatus === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (httpStatus === 403) {
    return "You do not have permission to perform this action.";
  }
  if (httpStatus === 404) {
    return "The requested record or endpoint could not be found.";
  }

  return parseReadableError(error, fallbackMessage).message;
}

