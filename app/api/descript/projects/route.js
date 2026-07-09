import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/descript';

// GET /api/descript/projects — lista proyectos del Drive vinculado al token.
// Fallback cuando el usuario no tiene el link a mano.
export async function GET() {
  try {
    const r = await listProjects();
    const projects = Array.isArray(r?.projects) ? r.projects : Array.isArray(r) ? r : [];
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
