import "server-only";
import sanitize from "sanitize-html";

/* Allow-list HTML sanitizer for CMS content (blog bodies).
   Runs on the server only, so the sanitizer never ships to the browser.
   Anything not listed here — scripts, styles, iframes, forms, event
   handlers, javascript:/data: links, SVG/MathML tricks — is removed. */
const OPTIONS = {
    allowedTags: [
        "p", "br", "hr", "h2", "h3", "h4", "h5", "h6",
        "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
        "ul", "ol", "li", "blockquote", "code", "pre",
        "a", "img", "figure", "figcaption",
        "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
        "span", "div",
    ],
    allowedAttributes: {
        a: ["href", "title", "rel", "target"],
        img: ["src", "alt", "title", "width", "height", "loading"],
        th: ["scope", "colspan", "rowspan"],
        td: ["colspan", "rowspan"],
        "*": ["id"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    // A blog page already has one <h1> (the article title); demote any in the body.
    transformTags: {
        h1: "h2",
        a: (tagName, attribs) => {
            const href = attribs.href || "";
            const external = /^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?keralaplots\.com/i.test(href);
            const { target: _ignored, ...rest } = attribs;
            return {
                tagName,
                attribs: external ? { ...rest, target: "_blank", rel: "noopener noreferrer nofollow" } : rest,
            };
        },
        img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
    },
};

export function sanitizeCmsHtml(html) {
    if (!html) return "";
    return sanitize(String(html), OPTIONS);
}

export const HTML_CONTENT_PATTERN = /<\/?(p|h[1-6]|ul|ol|li|strong|b|em|i|u|s|a|blockquote|br|table|mark)\b/i;
