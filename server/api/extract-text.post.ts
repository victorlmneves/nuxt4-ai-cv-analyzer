import mammoth from 'mammoth';

// ── Handler ───────────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
    const form = await readMultipartFormData(event);

    if (!form || form.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No file provided.' });
    }

    const fileField = form.find((f) => f.name === 'file');

    if (!fileField || !fileField.data) {
        throw createError({ statusCode: 400, statusMessage: 'No file field in form data.' });
    }

    const filename = fileField.filename ?? '';
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'txt') {
        return { text: fileField.data.toString('utf-8') };
    }

    if (ext === 'docx') {
        const { value } = await mammoth.extractRawText({ buffer: fileField.data });

        return { text: value };
    }

    if (ext === 'pdf') {
        // Dynamic import to avoid SSR issues with pdf-parse
        const pdfParse = await import('pdf-parse').then((m) => m.default ?? m);
        const data = await pdfParse(fileField.data);

        return { text: data.text };
    }

    throw createError({
        statusCode: 400,
        statusMessage: `Unsupported file type: .${ext}. Please upload .txt, .pdf or .docx.`,
    });
});
