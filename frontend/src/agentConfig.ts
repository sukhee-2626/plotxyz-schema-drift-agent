export type FieldType = "text" | "textarea" | "number" | "checkbox";

export interface AgentField {
  name: string;
  label: string;
  type: FieldType;
  rows?: number;
  placeholder?: string;
}

export interface AgentConfig {
  slug: string;
  title: string;
  tagline: string;
  purpose: string;
  accent: string;
  features: string[];
  limitations: string[];
  fields: AgentField[];
  sample: Record<string, string | number | boolean>;
  repo: string;
}

export const agent: AgentConfig = {
  "slug": "plotxyz-schema-drift-agent",
  "title": "Schema Drift",
  "tagline": "Know which schema change will break consumers.",
  "purpose": "Compares two declared schemas and classifies added, removed, and type-changed columns, with breaking-change flags.",
  "accent": "#f472b6",
  "features": [
    "Column-level drift detection",
    "Breaking-change classification",
    "Consumer-impact summary"
  ],
  "limitations": [
    "Type compatibility is compared textually.",
    "It does not read live database catalogs."
  ],
  "fields": [
    {
      "name": "old_schema",
      "label": "Old schema (JSON)",
      "type": "textarea",
      "rows": 6,
      "placeholder": ""
    },
    {
      "name": "new_schema",
      "label": "New schema (JSON)",
      "type": "textarea",
      "rows": 6,
      "placeholder": ""
    }
  ],
  "sample": {
    "old_schema": "{\"id\":\"integer\",\"email\":\"text\",\"age\":\"integer\"}",
    "new_schema": "{\"id\":\"integer\",\"email\":\"text\",\"age\":\"text\",\"country\":\"text\"}"
  },
  "repo": "https://github.com/sukhee-2626/plotxyz-schema-drift-agent"
};
