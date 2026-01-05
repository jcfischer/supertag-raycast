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
import { useState, useEffect } from "react";
import {
  listSupertags,
  getSupertag,
  createTanaNode,
  getFieldOptions,
  getNodesBySupertag,
  getNodeChildren,
  FIELD_OPTION_SOURCES,
  type SupertagInfo,
  type SupertagSchema,
  type SupertagField,
  type FieldOption,
} from "./lib/cli";
import { SchemaCache } from "./lib/schema-cache";

/**
 * Get schema from cache or CLI (fast operation)
 */
function getSchemaSync(tagName: string): SupertagSchema | null {
  const cache = new SchemaCache();
  const cachedSchema = cache.getSupertag(tagName);

  if (cachedSchema) {
    return {
      tagId: cachedSchema.id,
      tagName: cachedSchema.name,
      fields: cachedSchema.fields.map((f) => ({
        fieldName: f.name,
        fieldLabelId: f.attributeId,
        originTagName: f.originTagName || cachedSchema.name,
        depth: f.depth ?? 0,
        inferredDataType: f.dataType as SupertagField["inferredDataType"],
        targetSupertagId: f.targetSupertag?.id,
        targetSupertagName: f.targetSupertag?.name,
      })),
    };
  }
  return null;
}

/**
 * First screen: Simple name input
 * Preloads schema (fast) while user types so form renders instantly
 */
function NameInputForm({ supertag }: { supertag: SupertagInfo }) {
  const [name, setName] = useState("");
  const [schema, setSchema] = useState<SupertagSchema | null>(null);
  const { push } = useNavigation();

  // Always load from CLI - cache has incorrect data types
  useEffect(() => {
    getSupertag(supertag.tagName).then((result) => {
      if (result.success && result.data) {
        setSchema(result.data);
      }
    });
  }, [supertag.tagName]);

  const handleSubmit = () => {
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Name required",
        message: "Please enter a name for the node",
      });
      return;
    }

    // Navigate to full form with preloaded schema
    // FullNodeForm will show its own loading indicators
    push(
      <FullNodeForm
        supertag={supertag}
        initialName={name}
        preloadedSchema={schema}
      />,
    );
  };

  return (
    <Form
      isLoading={!schema}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder={`Enter ${supertag.tagName} name...`}
        value={name}
        onChange={setName}
        autoFocus
      />
      {!schema && <Form.Description text="Loading field definitions..." />}
    </Form>
  );
}

/**
 * Load options for a single field
 */
async function loadFieldOptions(
  field: SupertagField,
): Promise<{ fieldName: string; options: FieldOption[] }> {
  // Check if this field has a custom option source
  const customSource = FIELD_OPTION_SOURCES[field.fieldName];

  if (customSource) {
    if (customSource.type === "node" && customSource.nodeId) {
      const optResult = await getNodeChildren(customSource.nodeId);
      return { fieldName: field.fieldName, options: optResult.data || [] };
    }
    if (customSource.type === "supertags" && customSource.supertags) {
      const tagResults = await Promise.all(
        customSource.supertags.map((tag) => getNodesBySupertag(tag, 50)),
      );
      const allOptions: FieldOption[] = [];
      for (const optResult of tagResults) {
        if (optResult.data) {
          allOptions.push(...optResult.data);
        }
      }
      const seen = new Set<string>();
      const unique = allOptions.filter((opt) => {
        if (seen.has(opt.id)) return false;
        seen.add(opt.id);
        return true;
      });
      return { fieldName: field.fieldName, options: unique };
    }
  }

  if (field.inferredDataType === "options") {
    const optResult = await getFieldOptions(field.fieldName);
    return { fieldName: field.fieldName, options: optResult.data || [] };
  }

  if (field.inferredDataType === "reference" && field.targetSupertagName) {
    const optResult = await getNodesBySupertag(field.targetSupertagName);
    return { fieldName: field.fieldName, options: optResult.data || [] };
  }

  return { fieldName: field.fieldName, options: [] };
}

/**
 * Second screen: Full form that loads data lazily
 * Schema is preloaded from NameInputForm for instant rendering
 */
function FullNodeForm({
  supertag,
  initialName,
  preloadedSchema,
}: {
  supertag: SupertagInfo;
  initialName: string;
  preloadedSchema: SupertagSchema | null;
}) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [schema, setSchema] = useState<SupertagSchema | null>(preloadedSchema);
  const [fieldOptions, setFieldOptions] = useState<
    Record<string, FieldOption[]>
  >({});
  // Initialize loading fields synchronously from preloaded schema
  const [loadingFields, setLoadingFields] = useState<Set<string>>(() => {
    if (preloadedSchema) {
      const optionsFields = preloadedSchema.fields.filter(
        (f) =>
          (f.inferredDataType === "options" ||
            f.inferredDataType === "reference") &&
          f.depth <= 2,
      );
      return new Set(optionsFields.map((f) => f.fieldName));
    }
    return new Set();
  });

  // Load schema if not preloaded, then load field options
  useEffect(() => {
    async function init() {
      let schemaData = schema;

      // If schema wasn't preloaded, load it now
      if (!schemaData) {
        schemaData = getSchemaSync(supertag.tagName);
        if (!schemaData) {
          const result = await getSupertag(supertag.tagName);
          if (result.success && result.data) {
            schemaData = result.data;
          }
        }
        setSchema(schemaData);
      }

      // Start loading options for all option/reference fields
      if (schemaData) {
        const optionsFields = schemaData.fields.filter(
          (f) =>
            (f.inferredDataType === "options" ||
              f.inferredDataType === "reference") &&
            f.depth <= 2,
        );

        // Mark all as loading
        setLoadingFields(new Set(optionsFields.map((f) => f.fieldName)));

        // Load each field's options independently (they update as they arrive)
        for (const field of optionsFields) {
          loadFieldOptions(field).then(({ fieldName, options }) => {
            setFieldOptions((prev) => ({ ...prev, [fieldName]: options }));
            setLoadingFields((prev) => {
              const next = new Set(prev);
              next.delete(fieldName);
              return next;
            });
          });
        }
      }
    }
    init();
  }, [supertag.tagName, schema]);

  const visibleFields = schema
    ? schema.fields.filter((f) => f.depth <= 2)
    : [];

  async function handleSubmit() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating node...",
    });

    const fields: Record<string, string> = {};

    for (const [key, value] of Object.entries(fieldValues)) {
      if (!value.trim()) continue;

      if (value.startsWith("NEW:")) {
        const newName = value.substring(4).trim();
        if (newName) {
          fields[key] = newName;
        }
      } else {
        fields[key] = value.trim();
      }
    }

    const result = await createTanaNode(
      supertag.tagName,
      initialName,
      Object.keys(fields).length > 0 ? fields : undefined,
    );

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Created in Tana!";
      toast.message = `#${supertag.tagName}: ${initialName}`;
      await popToRoot();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create";
      toast.message = result.error;
    }
  }

  const loadingCount = loadingFields.size;

  return (
    <Form
      isLoading={!schema || loadingCount > 0}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Node" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Name"
        text={loadingCount > 0 ? `${initialName}  ·  Loading ${loadingCount} fields...` : initialName}
      />

      <Form.Separator />

      {visibleFields.map((field, index) => (
        <FieldInput
          key={field.fieldLabelId}
          field={field}
          value={fieldValues[field.fieldName] || ""}
          options={fieldOptions[field.fieldName]}
          isLoading={loadingFields.has(field.fieldName)}
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
  isLoading,
  onChange,
  autoFocus = false,
}: {
  field: SupertagField;
  value: string;
  options?: FieldOption[];
  isLoading?: boolean;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const title = isLoading ? `${field.fieldName} (loading...)` : field.fieldName;
  const placeholder =
    field.originTagName !== field.fieldName
      ? `From ${field.originTagName}`
      : undefined;

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
      if (field.inferredDataType === "reference") {
        const isNewValue = value.startsWith("NEW:");
        const dropdownValue = isNewValue ? "" : value;
        const textValue = isNewValue ? value.substring(4) : "";

        return (
          <>
            <Form.Dropdown
              id={field.fieldLabelId}
              title={title}
              value={dropdownValue}
              onChange={(newValue) => onChange(newValue)}
            >
              <Form.Dropdown.Item
                value=""
                title={
                  isLoading
                    ? "Loading options..."
                    : "(select existing or create new below)"
                }
              />
              {options?.map((opt) => (
                <Form.Dropdown.Item
                  key={opt.id}
                  value={opt.id}
                  title={opt.text}
                />
              )) || []}
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

      if (options && options.length > 0) {
        return (
          <Form.Dropdown
            id={field.fieldLabelId}
            title={title}
            value={value}
            onChange={onChange}
          >
            <Form.Dropdown.Item
              value=""
              title={isLoading ? "Loading options..." : "(none)"}
            />
            {options.map((opt) => (
              <Form.Dropdown.Item
                key={opt.id}
                value={opt.text}
                title={opt.text}
              />
            ))}
          </Form.Dropdown>
        );
      }

      // Show loading or fallback to text field
      if (isLoading) {
        return (
          <Form.Dropdown id={field.fieldLabelId} title={title} value="">
            <Form.Dropdown.Item value="" title="Loading options..." />
          </Form.Dropdown>
        );
      }

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
    <List isLoading={isLoading} searchBarPlaceholder="Search supertags...">
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
                onAction={() => push(<NameInputForm supertag={tag} />)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
