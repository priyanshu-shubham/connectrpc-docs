import protobuf from "protobufjs";

export interface ProtoSchema {
  services: ServiceInfo[];
}

export interface ServiceInfo {
  name: string;
  fullName: string;
  comment: string;
  methods: MethodInfo[];
}

export interface MethodInfo {
  name: string;
  path: string;
  comment: string;
  requestType: MessageInfo;
  responseType: MessageInfo;
}

export interface MessageInfo {
  name: string;
  comment: string;
  fields: FieldInfo[];
  oneofs: OneofInfo[];
}

export interface OneofInfo {
  name: string;
  fieldNames: string[];
}

export interface FieldInfo {
  name: string;
  type: string;
  repeated: boolean;
  map: boolean;
  mapKeyType?: string;
  comment: string;
  messageType?: MessageInfo;
  enumValues?: { name: string; value: number; comment: string }[];
  oneofName?: string;
}

function extractMessageInfo(
  type: protobuf.Type,
  seen: Set<string> = new Set()
): MessageInfo {
  if (seen.has(type.fullName)) {
    return { name: type.name, comment: "", fields: [], oneofs: [] };
  }
  seen.add(type.fullName);

  const fields: FieldInfo[] = [];
  for (const field of type.fieldsArray) {
    field.resolve();
    const info: FieldInfo = {
      name: field.name,
      type: field.type,
      repeated: field.repeated,
      map: field instanceof protobuf.MapField,
      comment: field.comment || "",
    };

    if (field instanceof protobuf.MapField) {
      info.mapKeyType = field.keyType;
    }

    if (field.partOf) {
      info.oneofName = field.partOf.name;
    }

    if (field.resolvedType instanceof protobuf.Type) {
      info.messageType = extractMessageInfo(field.resolvedType, new Set(seen));
    } else if (field.resolvedType instanceof protobuf.Enum) {
      const enumType = field.resolvedType;
      const enumComments = (enumType as unknown as { comments: Record<string, string> }).comments ?? {};
      info.enumValues = Object.entries(enumType.values).map(
        ([name, value]) => ({ name, value, comment: enumComments[name] ?? "" })
      );
    }

    fields.push(info);
  }

  const oneofs: OneofInfo[] = [];
  if (type.oneofsArray) {
    for (const oneof of type.oneofsArray) {
      oneofs.push({
        name: oneof.name,
        fieldNames: oneof.fieldsArray.map((f) => f.name),
      });
    }
  }

  return { name: type.name, comment: type.comment || "", fields, oneofs };
}

const COMMON_WKT_FILES = [
  "google/protobuf/any.proto",
  "google/protobuf/duration.proto",
  "google/protobuf/empty.proto",
  "google/protobuf/field_mask.proto",
  "google/protobuf/struct.proto",
  "google/protobuf/timestamp.proto",
  "google/protobuf/wrappers.proto",
];

function loadWellKnownTypes(root: protobuf.Root) {
  const common = (protobuf as unknown as {
    common: { get(file: string): { nested?: protobuf.AnyNestedObject } | null };
  }).common;
  for (const file of COMMON_WKT_FILES) {
    const json = common.get(file);
    if (json?.nested) {
      root.addJSON(json.nested as { [k: string]: protobuf.AnyNestedObject });
    }
  }
}

export function parseProtos(files: Record<string, string>): ProtoSchema {
  const root = new protobuf.Root();
  loadWellKnownTypes(root);

  for (const content of Object.values(files)) {
    protobuf.parse(content, root, { keepCase: true, alternateCommentMode: true });
  }
  root.resolveAll();

  const services: ServiceInfo[] = [];

  function walk(ns: protobuf.NamespaceBase, prefix: string) {
    for (const nested of ns.nestedArray) {
      if (nested instanceof protobuf.Service) {
        const fullName = prefix ? `${prefix}.${nested.name}` : nested.name;
        const methods: MethodInfo[] = [];

        for (const method of nested.methodsArray) {
          method.resolve();
          methods.push({
            name: method.name,
            path: `/${fullName}/${method.name}`,
            comment: method.comment || "",
            requestType: extractMessageInfo(
              method.resolvedRequestType as protobuf.Type
            ),
            responseType: extractMessageInfo(
              method.resolvedResponseType as protobuf.Type
            ),
          });
        }

        services.push({
          name: nested.name,
          fullName,
          comment: nested.comment || "",
          methods,
        });
      } else if (nested instanceof protobuf.Namespace) {
        const nextPrefix = prefix
          ? `${prefix}.${nested.name}`
          : nested.name;
        walk(nested, nextPrefix);
      }
    }
  }

  walk(root, "");
  return { services };
}

function defaultForType(type: string): unknown {
  switch (type) {
    case "string":
      return "";
    case "bool":
      return false;
    case "bytes":
      return "";
    case "int32":
    case "uint32":
    case "sint32":
    case "fixed32":
    case "sfixed32":
    case "float":
    case "double":
      return 0;
    case "int64":
    case "uint64":
    case "sint64":
    case "fixed64":
    case "sfixed64":
      return "0";
    default:
      return "";
  }
}

export function generateTemplate(
  msg: MessageInfo,
  seen: Set<string> = new Set()
): Record<string, unknown> {
  if (seen.has(msg.name)) return {};
  seen.add(msg.name);

  const obj: Record<string, unknown> = {};
  const processedOneofs = new Set<string>();

  for (const field of msg.fields) {
    // For oneof fields, only include the first option
    if (field.oneofName) {
      if (processedOneofs.has(field.oneofName)) continue;
      processedOneofs.add(field.oneofName);
    }

    let value: unknown;
    if (field.enumValues && field.enumValues.length > 0) {
      value = field.enumValues[0]!.name;
    } else if (field.messageType) {
      value = generateTemplate(field.messageType, new Set(seen));
    } else {
      value = defaultForType(field.type);
    }

    if (field.repeated) {
      obj[field.name] = [value];
    } else if (field.map) {
      obj[field.name] = {};
    } else {
      obj[field.name] = value;
    }
  }

  return obj;
}

export function getTypeLabel(field: FieldInfo): string {
  if (field.map) {
    return `map<${field.mapKeyType}, ${field.type}>`;
  }
  let label = field.type;
  if (field.messageType) {
    label = field.messageType.name;
  } else if (field.enumValues) {
    label = `enum`;
  }
  if (field.repeated) {
    label = `${label}[]`;
  }
  return label;
}
