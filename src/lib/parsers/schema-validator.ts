import type { SchemaIssue } from "@/lib/types";

/**
 * Required and recommended properties per schema.org type.
 *
 * Based on Google's structured data guidelines and schema.org specs.
 * "required" fields trigger errors; "recommended" fields trigger warnings.
 */
const TYPE_RULES: Record<
  string,
  { required: string[]; recommended: string[] }
> = {
  Article: {
    required: ["headline", "author"],
    recommended: [
      "datePublished",
      "dateModified",
      "image",
      "publisher",
      "description",
    ],
  },
  NewsArticle: {
    required: ["headline", "author", "datePublished"],
    recommended: ["dateModified", "image", "publisher", "description"],
  },
  BlogPosting: {
    required: ["headline", "author"],
    recommended: [
      "datePublished",
      "dateModified",
      "image",
      "publisher",
      "description",
    ],
  },
  Product: {
    required: ["name"],
    recommended: ["image", "description", "offers", "brand", "review"],
  },
  Organization: {
    required: ["name"],
    recommended: ["url", "logo", "contactPoint", "sameAs"],
  },
  LocalBusiness: {
    required: ["name", "address"],
    recommended: [
      "telephone",
      "openingHoursSpecification",
      "geo",
      "image",
      "url",
    ],
  },
  Person: {
    required: ["name"],
    recommended: ["url", "image", "jobTitle", "sameAs"],
  },
  WebPage: {
    required: ["name"],
    recommended: ["url", "description", "breadcrumb"],
  },
  WebSite: {
    required: ["name", "url"],
    recommended: ["potentialAction", "description"],
  },
  BreadcrumbList: {
    required: ["itemListElement"],
    recommended: [],
  },
  FAQPage: {
    required: ["mainEntity"],
    recommended: [],
  },
  HowTo: {
    required: ["name", "step"],
    recommended: ["image", "totalTime", "estimatedCost"],
  },
  Event: {
    required: ["name", "startDate", "location"],
    recommended: ["endDate", "image", "description", "offers", "performer"],
  },
  Recipe: {
    required: ["name"],
    recommended: [
      "image",
      "author",
      "recipeIngredient",
      "recipeInstructions",
      "nutrition",
    ],
  },
  Review: {
    required: ["itemReviewed", "reviewRating"],
    recommended: ["author", "datePublished", "reviewBody"],
  },
  VideoObject: {
    required: ["name", "uploadDate", "thumbnailUrl"],
    recommended: ["description", "contentUrl", "duration", "embedUrl"],
  },
  ImageObject: {
    required: ["contentUrl"],
    recommended: ["name", "description", "author"],
  },
  ItemList: {
    required: ["itemListElement"],
    recommended: [],
  },
};

/**
 * Validate a single schema.org item and return any issues found.
 */
export function validateSchemaItem(
  raw: Record<string, unknown>,
  type: string,
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  // 1. Check for @context
  if (!raw["@context"]) {
    issues.push({
      severity: "warning",
      message: "Missing @context (should be \"https://schema.org\")",
      path: "@context",
    });
  } else {
    const ctx = String(raw["@context"]);
    if (
      !ctx.includes("schema.org") &&
      !ctx.includes("schema.googleapis.com")
    ) {
      issues.push({
        severity: "warning",
        message: `Unexpected @context value: "${ctx}"`,
        path: "@context",
      });
    }
  }

  // 2. Check for @type
  if (!raw["@type"]) {
    issues.push({
      severity: "error",
      message: "Missing @type property",
      path: "@type",
    });
  }

  // 3. Type-specific validation
  const rules = TYPE_RULES[type];
  if (rules) {
    for (const field of rules.required) {
      if (!hasProperty(raw, field)) {
        issues.push({
          severity: "error",
          message: `Missing required property "${field}"`,
          path: field,
        });
      } else if (isEmptyValue(raw[field])) {
        issues.push({
          severity: "error",
          message: `Property "${field}" is empty`,
          path: field,
        });
      }
    }

    for (const field of rules.recommended) {
      if (!hasProperty(raw, field)) {
        issues.push({
          severity: "warning",
          message: `Missing recommended property "${field}"`,
          path: field,
        });
      }
    }
  }

  // 4. Validate nested objects have @type
  validateNestedTypes(raw, issues, "");

  // 5. Validate URL fields
  validateUrls(raw, issues, "");

  // 6. Validate date fields
  validateDates(raw, issues, "");

  return issues;
}

/**
 * Validate a raw JSON-LD script content string for syntax issues.
 * Returns issues found before successful parsing, or empty if parseable.
 */
export function validateJsonLdSyntax(rawJson: string): SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  // Check for common syntax issues
  if (rawJson.includes("'")) {
    // Check if single quotes are used instead of double quotes for keys
    const singleQuoteKeys = rawJson.match(/'\w+'\s*:/g);
    if (singleQuoteKeys) {
      issues.push({
        severity: "error",
        message:
          "Single quotes used for property names (JSON requires double quotes)",
      });
    }
  }

  // Check for trailing commas (common copy-paste error)
  if (/,\s*[}\]]/.test(rawJson)) {
    issues.push({
      severity: "error",
      message: "Trailing comma detected (not valid JSON)",
    });
  }

  // Check for unescaped control characters
  if (/[\x00-\x1f]/.test(rawJson.replace(/\\["\\/bfnrt]|\\u[\da-fA-F]{4}/g, ""))) {
    issues.push({
      severity: "error",
      message: "Unescaped control characters detected in JSON string",
    });
  }

  return issues;
}

function hasProperty(obj: Record<string, unknown>, key: string): boolean {
  return key in obj && obj[key] !== undefined && obj[key] !== null;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && Object.keys(value as object).length === 0)
    return true;
  return false;
}

/**
 * Check nested objects for missing @type (common authoring mistake).
 */
function validateNestedTypes(
  obj: Record<string, unknown>,
  issues: SchemaIssue[],
  parentPath: string,
): void {
  const EXPECTS_TYPE = new Set([
    "author",
    "publisher",
    "offers",
    "location",
    "address",
    "geo",
    "contactPoint",
    "itemReviewed",
    "reviewRating",
    "nutrition",
    "performer",
    "brand",
  ]);

  for (const [key, value] of Object.entries(obj)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;

    const nested = value as Record<string, unknown>;
    const path = parentPath ? `${parentPath}.${key}` : key;

    if (EXPECTS_TYPE.has(key) && !nested["@type"]) {
      issues.push({
        severity: "warning",
        message: `Nested object "${key}" is missing @type`,
        path,
      });
    }
  }
}

/** Known URL-type properties in schema.org. */
const URL_FIELDS = new Set([
  "url",
  "image",
  "logo",
  "thumbnailUrl",
  "contentUrl",
  "embedUrl",
  "sameAs",
]);

function validateUrls(
  obj: Record<string, unknown>,
  issues: SchemaIssue[],
  parentPath: string,
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (!URL_FIELDS.has(key)) continue;

    const path = parentPath ? `${parentPath}.${key}` : key;
    const urls = Array.isArray(value) ? value : [value];

    for (const url of urls) {
      if (typeof url !== "string") continue;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        issues.push({
          severity: "warning",
          message: `"${key}" should be an absolute URL (starts with http:// or https://)`,
          path,
        });
      }
    }
  }
}

/** Known date-type properties. */
const DATE_FIELDS = new Set([
  "datePublished",
  "dateModified",
  "dateCreated",
  "startDate",
  "endDate",
  "uploadDate",
  "birthDate",
  "deathDate",
]);

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

function validateDates(
  obj: Record<string, unknown>,
  issues: SchemaIssue[],
  parentPath: string,
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (!DATE_FIELDS.has(key) || typeof value !== "string") continue;

    const path = parentPath ? `${parentPath}.${key}` : key;

    if (!ISO_DATE_RE.test(value)) {
      issues.push({
        severity: "warning",
        message: `"${key}" should be in ISO 8601 format (e.g. 2024-01-15T10:00:00Z)`,
        path,
      });
    }
  }
}
