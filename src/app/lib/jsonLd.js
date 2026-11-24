/* Serialize JSON-LD for a <script type="application/ld+json"> tag.
   Escapes characters that could close the script tag or break HTML parsing,
   so CMS/API-supplied schema can never inject markup (e.g. "</script><script>…").
   Strings are parsed first; invalid JSON is dropped instead of being injected raw. */
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

export function jsonLdHtml(schema) {
    let value = schema;
    if (typeof schema === "string") {
        try {
            value = JSON.parse(schema);
        } catch {
            return "";
        }
    }
    if (!value || typeof value !== "object") return "";
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(LINE_SEP, "\\u2028")
        .replace(PARA_SEP, "\\u2029");
}
