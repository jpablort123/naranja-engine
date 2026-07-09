import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { parseDescriptLink, exportTranscript, getProject } from '@/lib/descript';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ═══ POST /api/descript/import ═══
// Body:
//   { name: string, descript_link: string }
//   { episode_id: string, descript_link: string }  // adjuntar a episodio existente
//
// Extrae project_id + composition_id del link, pide transcript (SRT + txt) a Descript
// y crea/actualiza el episodio con: transcript, transcript_srt, descript_project_id,
// descript_composition_id, descript_episode_number.
//
// El transcript_srt tiene los timestamps verbatim (anclas para cortes); el `transcript`
// texto plano es el que consumen las fases existentes (Fase 1 y minado).
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, episode_id, descript_link } = body;

    if (!descript_link) {
      return NextResponse.json({ error: 'descript_link requerido' }, { status: 400 });
    }

    const { project_id, composition_id } = parseDescriptLink(descript_link);
    if (!project_id) {
      return NextResponse.json({ error: 'No pude extraer project_id del link' }, { status: 400 });
    }

    // Verificar que el proyecto existe y traer detalle (nombre de composición madre, etc.)
    let projectDetail = null;
    try {
      projectDetail = await getProject(project_id);
    } catch (e) {
      return NextResponse.json({ error: `Descript /projects/${project_id}: ${e.message}` }, { status: 400 });
    }

    // Nombre de la composición madre — si el link trae composition_id, ubicarla;
    // si no, tomar la primera composición del proyecto.
    const compositions = Array.isArray(projectDetail?.compositions) ? projectDetail.compositions : [];
    let composicion_madre = null;
    let composicion_madre_id = composition_id;
    if (composition_id) {
      composicion_madre = compositions.find(c => c?.id === composition_id) || null;
    }
    if (!composicion_madre && compositions.length > 0) {
      composicion_madre = compositions[0];
      composicion_madre_id = composicion_madre.id;
    }
    const composicion_madre_nombre = composicion_madre?.name || projectDetail?.name || 'Episodio';

    // Traer transcript en dos formatos (SPEC §3.3).
    // Si sólo devuelven una URL de export, usamos esa URL para leer el contenido.
    async function pullTranscript(format) {
      const r = await exportTranscript({ project_id, format });
      // La API puede devolver { transcript: "..." } o { url: "https://..." }.
      if (typeof r?.transcript === 'string') return r.transcript;
      if (typeof r?.text === 'string') return r.text;
      if (typeof r?.content === 'string') return r.content;
      if (typeof r?.url === 'string') {
        const fr = await fetch(r.url);
        return await fr.text();
      }
      // Como fallback, devolvemos JSON stringificado — al menos algo se guarda.
      return typeof r === 'string' ? r : JSON.stringify(r);
    }

    const [srt, txt] = await Promise.all([
      pullTranscript('srt').catch(() => ''),
      pullTranscript('txt').catch(() => ''),
    ]);

    if (!srt && !txt) {
      return NextResponse.json({ error: 'Descript no devolvió transcript' }, { status: 502 });
    }

    // El transcript "texto para IA" preferimos txt limpio; si no hay, derivar del SRT.
    const transcriptPlano = txt && txt.trim() ? txt : srtToPlain(srt);

    const payload = {
      transcript: transcriptPlano,
      transcript_srt: srt || null,
      descript_project_id: project_id,
      descript_composition_id: composicion_madre_id || null,
      descript_composition_name: composicion_madre_nombre,
      updated_at: new Date().toISOString(),
    };

    let ep;
    if (episode_id) {
      // Adjuntar a episodio existente
      const { data, error } = await db.from('episodes').update(payload).eq('id', episode_id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      ep = data;
    } else {
      const insert = {
        name: name || composicion_madre_nombre,
        status: 'draft',
        ...payload,
      };
      const { data, error } = await db.from('episodes').insert(insert).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      ep = data;
    }

    return NextResponse.json({
      episode: ep,
      project: {
        id: project_id,
        name: projectDetail?.name || null,
        composicion_madre_id,
        composicion_madre_nombre,
        composiciones: compositions.map(c => ({ id: c?.id, name: c?.name, duration: c?.duration || null })),
      },
    });
  } catch (e) {
    console.error('descript/import error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Deriva texto plano de SRT (para fases que hoy esperan `transcript`).
function srtToPlain(srt) {
  if (!srt) return '';
  return srt
    .split(/\r?\n/)
    .filter(line => {
      if (!line.trim()) return false;
      if (/^\d+$/.test(line.trim())) return false;
      if (/-->/i.test(line)) return false;
      return true;
    })
    .join('\n');
}
