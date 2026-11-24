/* Returns the URL only if it is safe to put in an href, otherwise "".
   Used for links whose value comes from other users or the API
   (enquiry page links, brochures, chat attachments). Blocks javascript:,
   vbscript:, data:text/html and similar, which could run code when clicked. */
// data: URLs are allowed for attachments, except types a browser could execute.
const UNSAFE_DATA = /^data:\s*(text\/(html|xml|javascript)|application\/(xhtml\+xml|xml|javascript|ecmascript)|image\/svg\+xml)/i;

export function safeHref(value, { allowData = false } = {}) {
    if (typeof value !== "string") return "";
    const url = value.trim();
    if (!url) return "";
    if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) return url;
    if (url.startsWith("blob:")) return url;
    if (/^data:/i.test(url)) return allowData && !UNSAFE_DATA.test(url) ? url : "";
    try {
        const parsed = new URL(url);
        return ["https:", "http:", "mailto:", "tel:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
        return "";
    }
}
