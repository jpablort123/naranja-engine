"use client";
import { Mic, Mail, Lightbulb, Brain, Plus, ArrowRight, Calendar, AlertCircle } from "lucide-react";

const O = "#EA580C", OL = "#FFF7ED", MU = "#78716A";
const SHOW_PARRILLA = false;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Devuelve una frase relativa: "hoy", "mañana", "el sábado", "en 3 días", "el 12/06"
function relativeDate(iso) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  const diffDays = Math.round((target - today) / DAY_MS);
  if (diffDays < 0) return null;
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "mañana";
  if (diffDays <= 6) return `el ${DIAS[target.getDay()]}`;
  if (diffDays <= 13) return `en ${diffDays} días`;
  return `el ${String(target.getDate()).padStart(2, "0")}/${String(target.getMonth() + 1).padStart(2, "0")}`;
}

function Card({ icon: Icon, title, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-stone-200 bg-white p-5 hover:border-orange-200 hover:shadow-sm transition-all group flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: OL }}>
            <Icon size={16} color={O} />
          </div>
          <span className="text-sm font-semibold text-stone-800">{title}</span>
        </div>
        <ArrowRight size={14} color={MU} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex-1">{children}</div>
    </button>
  );
}

export default function InicioView({
  eps, nls, ideas, upcomingParrilla, draftLearnings,
  onOpenEpisode, onOpenNl, onGo, onOpenUpload, onOpenNlUpload,
}) {
  const latestEp = eps?.[0];
  const latestNl = nls?.[0];

  // ── Próximos agendados desde la parrilla ──
  const nextEp = (upcomingParrilla || [])
    .filter(p => p.content_type === "episodio")
    .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""))[0];
  const nextNl = (upcomingParrilla || [])
    .filter(p => p.content_type === "newsletter")
    .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""))[0];

  // ── Ideas calientes desde el Fixture ──
  const hotIdeas = (ideas || [])
    .filter(i => i.temperature === "spotlight" && i.status === "draft")
    .slice(0, 3);

  // ── Señales para "Requiere tu atención" (orden: aprendizajes primero, luego newsletters estancadas) ──
  const now = Date.now();
  const stuckNls = (nls || []).filter(n => {
    if (n.status === "complete") return false;
    const t = n.created_at ? new Date(n.created_at).getTime() : null;
    return t && now - t >= FIVE_DAYS_MS;
  });

  const attentionItems = [];
  if (draftLearnings > 0) {
    attentionItems.push({
      key: "learnings",
      count: draftLearnings,
      label: `${draftLearnings} aprendizaje${draftLearnings === 1 ? "" : "s"} pendiente${draftLearnings === 1 ? "" : "s"}`,
      sub: "Revisar y aplicar al protocolo correspondiente",
      go: () => onGo("learnings"),
    });
  }
  if (stuckNls.length > 0) {
    attentionItems.push({
      key: "stuck_nls",
      count: stuckNls.length,
      label: `${stuckNls.length} newsletter${stuckNls.length === 1 ? "" : "s"} estancada${stuckNls.length === 1 ? "" : "s"} 5+ días`,
      sub: "En borrador, esperan revisión",
      go: () => onGo("newsletter"),
    });
  }

  // ── Hint condicional "Programá desde la Parrilla" — solo si hay pieza completa Y nada agendado ──
  const showEpHint = !nextEp && latestEp?.status === "complete";
  const showNlHint = !nextNl && latestNl?.status === "complete";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Inicio</h1>
        <p className="text-sm text-stone-500">Tu cuartel de operaciones de contenido</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PODCAST */}
        <Card icon={Mic} title="Podcast" onClick={() => onGo("podcast")}>
          {latestEp ? (
            <>
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-1">Último episodio</p>
              <p
                className="text-sm font-medium text-stone-800 mb-3 line-clamp-2 hover:text-orange-600 transition-colors"
                onClick={(e) => { e.stopPropagation(); onOpenEpisode(0); }}
              >
                {latestEp.name}
              </p>
              {SHOW_PARRILLA && nextEp ? (
                <p className="text-xs text-stone-500">
                  Próximo: <span className="font-medium text-stone-700">{nextEp.title}</span>
                  <span className="text-stone-400"> · {relativeDate(nextEp.scheduled_date)}</span>
                </p>
              ) : SHOW_PARRILLA && showEpHint ? (
                <p className="text-xs text-stone-500">
                  Próximo: <span className="text-stone-400">pendiente</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); onGo("parrilla"); }}
                    className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    <Calendar size={10} /> Programá uno desde la Parrilla →
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500 mb-3">Aún no cargaste ningún episodio.</p>
              <span
                onClick={(e) => { e.stopPropagation(); onOpenUpload(); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                style={{ background: O }}
              >
                <Plus size={12} /> Cargá tu primer episodio
              </span>
            </>
          )}
        </Card>

        {/* NEWSLETTER */}
        <Card icon={Mail} title="Newsletter" onClick={() => onGo("newsletter")}>
          {latestNl ? (
            <>
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-1">Última edición</p>
              <p
                className="text-sm font-medium text-stone-800 mb-3 line-clamp-2 hover:text-orange-600 transition-colors"
                onClick={(e) => { e.stopPropagation(); onOpenNl?.(0); }}
              >
                {latestNl.name}
              </p>
              {SHOW_PARRILLA && nextNl ? (
                <p className="text-xs text-stone-500">
                  Próxima: <span className="font-medium text-stone-700">{nextNl.title}</span>
                  <span className="text-stone-400"> · {relativeDate(nextNl.scheduled_date)}</span>
                </p>
              ) : SHOW_PARRILLA && showNlHint ? (
                <p className="text-xs text-stone-500">
                  Próxima: <span className="text-stone-400">pendiente</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); onGo("parrilla"); }}
                    className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    <Calendar size={10} /> Programá una desde la Parrilla →
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500 mb-3">Aún no hay ediciones.</p>
              <span
                onClick={(e) => { e.stopPropagation(); onOpenNlUpload?.(); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                style={{ background: O }}
              >
                <Plus size={12} /> Nueva edición
              </span>
            </>
          )}
        </Card>

        {/* IDEAS CALIENTES (FIXTURE) */}
        <Card icon={Lightbulb} title="Ideas calientes" onClick={() => onGo("fixture")}>
          {hotIdeas.length > 0 ? (
            <div className="space-y-1.5">
              {hotIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-stone-50"
                >
                  <p className="text-sm text-stone-800 truncate min-w-0 flex-1">{idea.title}</p>
                  <span
                    onClick={(e) => { e.stopPropagation(); onGo("fixture"); }}
                    className="text-[11px] font-medium text-orange-600 hover:text-orange-700 shrink-0 cursor-pointer"
                  >
                    Desarrollar →
                  </span>
                </div>
              ))}
              {hotIdeas.length === 3 && (
                <p className="text-[11px] text-stone-400 pt-1">Y más en el Fixture</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-400 italic">No hay ideas calientes ahora mismo</p>
              <p className="text-xs text-stone-400 mt-1">Subí una idea a 💡 Quiere ver la luz en el Fixture</p>
            </>
          )}
        </Card>

        {/* REQUIERE TU ATENCIÓN */}
        <Card
          icon={Brain}
          title="Requiere tu atención"
          onClick={() => attentionItems[0]?.go ? attentionItems[0].go() : onGo("learnings")}
        >
          {attentionItems.length > 0 ? (
            <div className="space-y-1.5">
              {attentionItems.map((it) => (
                <div
                  key={it.key}
                  onClick={(e) => { e.stopPropagation(); it.go(); }}
                  className="flex items-start gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-orange-50 cursor-pointer"
                >
                  <AlertCircle size={14} color={O} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 truncate">{it.label}</p>
                    <p className="text-[11px] text-stone-500 truncate">{it.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-400 italic">Nada pendiente por ahora</p>
              <p className="text-xs text-stone-400 mt-1">Aprendizajes y newsletters estancadas aparecerán acá</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
