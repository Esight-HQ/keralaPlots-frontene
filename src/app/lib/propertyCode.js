/* Public property ID shown to visitors, e.g. "KP822".
   Uses the code from the API when it sends one, otherwise "KP" + the listing
   id — the same format the property detail page shows ("ID: KP822"). */
export function getPropertyCode(property) {
    if (!property) return "";
    if (typeof property !== "object") return property ? `KP${property}` : "";

    const code = property.code || property.property_code || property.propertyCode;
    if (code) return String(code);

    const id = property.property_id ?? property.propertyId ?? property.id;
    return id !== undefined && id !== null && id !== "" ? `KP${id}` : "";
}
