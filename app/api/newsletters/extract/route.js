import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

// POST /api/newsletters/extract
// FormData con campo `file` (.docx). Devuelve { text } con el contenido plano.
export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'archivo requerido en campo "file"' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { value } = await mammoth.extractRawText({ buffer });
    const text = (value || '').trim();

    if (!text) {
      return NextResponse.json({ error: 'no se pudo extraer texto del archivo' }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'error procesando archivo' }, { status: 500 });
  }
}
