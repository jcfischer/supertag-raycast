import {
  List,
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useRef, memo, useCallback } from "react";
import {
  listSupertags,
  getSupertag,
  createTanaNode,
  getFieldOptions,
  getNodesBySupertag,
  type SupertagInfo,
  type SupertagSchema,
  type SupertagField,
  type FieldOption,
} from "./lib/cli";
import { SchemaCache } from "./lib/schema-cache";

/**
 * Map field data type to Raycast form component type
 */
function getFieldIcon(dataType: string): Icon {
  switch (dataType) {
    case "date":
      return Icon.Calendar;
    case "reference":
      return Icon.Link;
    case "options":
      return Icon.List;
    case "checkbox":
      return Icon.Checkmark;
    case "number":
      return Icon.Hashtag;
    default:
      return Icon.Text;
  }
}

/**
 * Isolated name field component that doesn't re-render when parent state changes
 */
const NameField = memo(({
  supertag,
  onNameChange
}: {
  supertag: SupertagInfo;
  onNameChange: (name: string) => void;
}) => {
  const [name, setName] = useState("");

  const handleChange = (newName: string) => {
    setName(newName);
    onNameChange(newName);
  };

  return (
    <Form.TextField
      id="name"
      title="Name"
      placeholder={`Enter ${supertag.tagName} name...`}
      value={name}
      onChange={handleChange}
      autoFocus={false}
    />
  );
});

/**
 * Dynamic form for creating a node with the selected supertag
 */
function NodeForm({ supertag }: { supertag: SupertagInfo }) {
  const [schema, setSchema] = useState<SupertagSchema | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldOptions, setFieldOptions] = useState<Record<string, FieldOption[]>>({});

  // Use ref to store name value - stable across re-renders
  const nameRef = useRef("");

  // Initialize visibleFields with empty array to prevent structure changes
  const [visibleFields, setVisibleFields] = useState<SupertagField[]>([]);

  // Stable callback for name changes - wrapped in useCallback so NameField doesn't re-render
  const handleNameChange = useCallback((newName: string) => {
    nameRef.current = newName;
  }, []);

  useEffect(() => {
    async function loadSchema() {
      // Load schema in background without blocking user input

      // Spec 081 T-3.1, T-3.2: Try SchemaCache first, fallback to CLI
      const cache = new SchemaCache();
      const cachedSchema = cache.getSupertag(supertag.tagName);

      let schemaData: SupertagSchema | null = null;
      let cacheHit = false;

      if (cachedSchema) {
        // Spec 081 T-3.4: Cache hit - log for development
        if (process.env.NODE_ENV === "development") {
          console.log("[SchemaCache] Cache HIT:", supertag.tagName);
        }
        cacheHit = true;

        // Convert cached schema to SupertagSchema format
        schemaData = {
          tagId: cachedSchema.id,
          tagName: cachedSchema.name,
          fields: cachedSchema.fields.map((f) => ({
            fieldName: f.name,
            fieldLabelId: f.attributeId,
            originTagName: f.originTagName || cachedSchema.name,
            depth: f.depth ?? 0,
            inferredDataType: f.dataType as any,
            targetSupertagId: f.targetSupertag?.id,
            targetSupertagName: f.targetSupertag?.name,
          })),
        };
      } else {
        // Spec 081 T-3.2: Cache miss - fallback to CLI
        if (process.env.NODE_ENV === "development") {
          console.log("[SchemaCache] Cache MISS, using CLI:", supertag.tagName);
        }
        const result = await getSupertag(supertag.tagName);
        if (result.success && result.data) {
          schemaData = result.data;
        }
      }

      if (schemaData) {
        setSchema(schemaData);

        // Filter fields
        const filtered = schemaData.fields.filter((f) => {
          // Skip very deep inherited fields
          if (f.depth > 2) return false;
          return true;
        });

        // Delay rendering fields to let name field settle and prevent text selection
        setTimeout(() => {
          setVisibleFields(filtered);
        }, 100);

        // Initialize field values - only set once to preserve user input
        setFieldValues((prev) => {
          const initial: Record<string, string> = {};
          for (const field of filtered) {
            // Preserve existing value if user already started typing
            initial[field.fieldName] = prev[field.fieldName] || "";
          }
          return initial;
        });

        // Load options in background (doesn't block user input)
        const optionsFields = schemaData.fields.filter(
          (f) => f.inferredDataType === "options" || f.inferredDataType === "reference"
        );
        const optionsPromises = optionsFields.map(async (field) => {
          if (field.inferredDataType === "options") {
            // Regular options field - get from field values
            const optResult = await getFieldOptions(field.fieldName);
            return { fieldName: field.fieldName, options: optResult.data || [] };
          } else {
            // Spec 081 T-3.3: Reference field - use cached targetSupertagName
            if (field.targetSupertagName) {
              const optResult = await getNodesBySupertag(field.targetSupertagName);
              return { fieldName: field.fieldName, options: optResult.data || [] };
            }
            return { fieldName: field.fieldName, options: [] };
          }
        });
        const optionsResults = await Promise.all(optionsPromises);
        const optionsMap: Record<string, FieldOption[]> = {};
        for (const { fieldName, options } of optionsResults) {
          optionsMap[fieldName] = options;
          if (process.env.NODE_ENV === "development") {
            console.log(`[FieldOptions] ${fieldName}: ${options.length} options`);
          }
        }
        setFieldOptions(optionsMap);
      } else {
        setIsLoading(false);
      }
    }
    loadSchema();
  }, [supertag.tagName]);

  async function handleSubmit() {
    const nodeName = nameRef.current.trim();

    if (!nodeName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name required",
        message: "Please enter a name for the node",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating node...",
    });

    // Build field values - supertag-cli now handles creating tagged nodes for reference fields
    const fields: Record<string, string> = {};

    for (const [key, value] of Object.entries(fieldValues)) {
      if (!value.trim()) continue;

      // Check if this is a "create new" value from the text field
      if (value.startsWith("NEW:")) {
        const newName = value.substring(4).trim();
        if (newName) {
          // Pass the name directly - supertag-cli will create a tagged node
          fields[key] = newName;
        }
      } else {
        fields[key] = value.trim();
      }
    }

    const result = await createTanaNode(
      supertag.tagName,
      nodeName,
      Object.keys(fields).length > 0 ? fields : undefined
    );

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Created in Tana!";
      toast.message = `#${supertag.tagName}: ${nodeName}`;
      await popToRoot();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create";
      toast.message = result.error;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Node" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <NameField
        key="node-name-field"
        supertag={supertag}
        onNameChange={handleNameChange}
      />

      <Form.Separator />

      {visibleFields.map((field, index) => (
        <FieldInput
          key={field.fieldLabelId}
          field={field}
          value={fieldValues[field.fieldName] || ""}
          options={fieldOptions[field.fieldName]}
          onChange={(value) =>
            setFieldValues((prev) => ({ ...prev, [field.fieldName]: value }))
          }
          autoFocus={index === 0}
        />
      ))}
    </Form>
  );
}

/**
 * Render appropriate input for field type
 */
function FieldInput({
  field,
  value,
  options,
  onChange,
  autoFocus = false,
}: {
  field: SupertagField;
  value: string;
  options?: FieldOption[];
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const title = field.fieldName;
  const placeholder = field.originTagName !== field.fieldName
    ? `From ${field.originTagName}`
    : undefined;

  // Format date in local timezone (not UTC) to avoid off-by-one errors
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  switch (field.inferredDataType) {
    case "date":
      return (
        <Form.DatePicker
          id={field.fieldLabelId}
          title={title}
          value={value ? new Date(value) : null}
          onChange={(date) => onChange(date ? formatDateLocal(date) : "")}
        />
      );

    case "checkbox":
      return (
        <Form.Checkbox
          id={field.fieldLabelId}
          title={title}
          label=""
          value={value === "true"}
          onChange={(checked) => onChange(checked ? "true" : "")}
        />
      );

    case "options":
    case "reference":
      if (process.env.NODE_ENV === "development") {
        console.log(`[FieldInput] ${field.fieldName}: ${options?.length || 0} options, type=${field.inferredDataType}`);
      }

      // For reference fields, allow creating new nodes by typing a name
      if (field.inferredDataType === "reference" && options && options.length > 0) {
        // Show dropdown with existing options AND a text field to create new
        // Value format: if starts with "NEW:", it's a new name to create; otherwise it's an existing ID
        const isNewValue = value.startsWith("NEW:");
        const dropdownValue = isNewValue ? "" : value;
        const textValue = isNewValue ? value.substring(4) : "";

        return (
          <>
            <Form.Dropdown
              id={field.fieldLabelId}
              title={title}
              value={dropdownValue}
              onChange={(newValue) => onChange(newValue)} // Clear "NEW:" prefix when dropdown selected
            >
              <Form.Dropdown.Item value="" title="(select existing or create new below)" />
              {options.map((opt) => (
                <Form.Dropdown.Item key={opt.id} value={opt.id} title={opt.text} />
              ))}
            </Form.Dropdown>
            <Form.TextField
              id={`${field.fieldLabelId}-new`}
              title={`Or create new ${field.targetSupertagName || field.fieldName}`}
              placeholder={`Type name to create new ${field.targetSupertagName || field.fieldName}...`}
              value={textValue}
              onChange={(newName) => onChange(newName ? `NEW:${newName}` : "")}
            />
          </>
        );
      }

      // For options fields or when no options available, just show text field
      return (
        <Form.TextField
          id={field.fieldLabelId}
          title={title}
          placeholder={placeholder || "Enter value"}
          value={value}
          onChange={onChange}
        />
      );

    default:
      return (
        <Form.TextField
          id={field.fieldLabelId}
          title={title}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
        />
      );
  }
}

/**
 * Main command: list supertags and navigate to form
 */
export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [supertags, setSupertags] = useState<SupertagInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    async function load() {
      const result = await listSupertags(200);
      if (result.success && result.data) {
        // Already sorted by usage from tags top
        setSupertags(result.data);
      } else {
        setError(result.error || "Failed to load supertags");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load supertags"
          description={error}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search supertags..."
    >
      {supertags.map((tag) => (
        <List.Item
          key={tag.tagId}
          title={tag.tagName}
          subtitle={`${tag.count} nodes`}
          icon={Icon.Tag}
          actions={
            <ActionPanel>
              <Action
                title="Create Node"
                icon={Icon.Plus}
                onAction={() => push(<NodeForm supertag={tag} />)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
