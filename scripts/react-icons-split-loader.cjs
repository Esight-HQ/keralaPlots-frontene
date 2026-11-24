/* Webpack pre-loader used by next.config.mjs in production builds.
 * Rewrites
 *     import { RiA, RiB } from "react-icons/ri";
 * into
 *     import RiA from "<project>/.react-icons-split/ri/RiA.js";
 *     import RiB from "<project>/.react-icons-split/ri/RiB.js";
 * so each page bundles only the icons it uses. See split-react-icons.mjs.
 */
const IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*["']react-icons\/(\w+)["'];?/g;

module.exports = function reactIconsSplitLoader(source) {
    const { outDir, sets } = this.getOptions();
    if (!source.includes("react-icons/")) return source;

    return source.replace(IMPORT_RE, (full, names, set) => {
        if (!sets.includes(set)) return full;
        return names
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean)
            .map((n) => {
                const [imported, local = imported] = n.split(/\s+as\s+/).map((x) => x.trim());
                return `import ${local} from ${JSON.stringify(`${outDir}/${set}/${imported}.js`)};`;
            })
            .join(" ");
    });
};
