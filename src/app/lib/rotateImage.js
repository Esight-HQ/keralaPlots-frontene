/* Rotate an image 90° (clockwise by default) and return a new File.
   Works for local uploads (File objects) and for already-uploaded
   images on imagedelivery.net, which are served with CORS headers. */

const loadBitmap = async (source) => {
    const blob = source instanceof Blob
        ? source
        : await fetch(source, { mode: "cors", cache: "no-store" }).then((res) => {
            if (!res.ok) throw new Error(`Image request failed (${res.status})`);
            return res.blob();
        });

    if (typeof createImageBitmap === "function") {
        try {
            // Respect EXIF orientation so phone photos rotate from what the user sees.
            return { bitmap: await createImageBitmap(blob, { imageOrientation: "from-image" }), type: blob.type };
        } catch {
            // fall through to <img> decoding
        }
    }

    const url = URL.createObjectURL(blob);
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Could not decode image"));
            el.src = url;
        });
        return { bitmap: img, type: blob.type };
    } finally {
        URL.revokeObjectURL(url);
    }
};

export async function rotateImage({ file, url, name }, direction = "cw") {
    const { bitmap, type } = await loadBitmap(file instanceof Blob ? file : url);
    const width = bitmap.width;
    const height = bitmap.height;

    const canvas = document.createElement("canvas");
    canvas.width = height;
    canvas.height = width;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(((direction === "ccw" ? -90 : 90) * Math.PI) / 180);
    ctx.drawImage(bitmap, -width / 2, -height / 2);
    bitmap.close?.();

    const outType = type === "image/png" || type === "image/webp" ? type : "image/jpeg";
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not export image"))), outType, 0.92);
    });

    const ext = outType === "image/png" ? "png" : outType === "image/webp" ? "webp" : "jpg";
    const baseName = String(name || "photo").replace(/\.[a-z0-9]+$/i, "") || "photo";
    return new File([blob], `${baseName}.${ext}`, { type: outType, lastModified: Date.now() });
}
