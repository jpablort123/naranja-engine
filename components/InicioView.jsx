"use client";
import { Mic, Mail, Lightbulb, Brain, Plus, ArrowRight } from "lucide-react";

const O = "#EA580C", OL = "#FFF7ED", MU = "#78716A";

function Card({ icon: Icon, title, children, onClick, variant = "default" }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-stone-200 bg-white p-5 hover:border-orange-200 hover:shadow-sm transition-all group"
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
      {children}
    </button>
  );
}

export default function InicioView({ eps, draftLearnings, onOpenEpisode, onGo, onOpenUpload }) {
  const latestEp = eps?.[0];

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
              <p className="text-xs text-stone-500">
                Próximo: <span className="text-stone-400 italic">pendiente</span>
              </p>
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
          <p className="text-sm text-stone-400 italic">Aún sin ediciones</p>
          <p className="text-xs text-stone-400 mt-1">El flujo de newsletter llega pronto</p>
        </Card>

        {/* IDEAS CALIENTES (FIXTURE) */}
        <Card icon={Lightbulb} title="Ideas calientes" onClick={() => onGo("fixture")}>
          <p className="text-sm text-stone-400 italic">Abrí el Fixture para verlas</p>
          <p className="text-xs text-stone-400 mt-1">Banco de ideas y temperatura</p>
        </Card>

        {/* REQUIERE TU ATENCIÓN */}
        <Card icon={Brain} title="Requiere tu atención" onClick={() => onGo("learnings")}>
          {draftLearnings > 0 ? (
            <>
              <p className="text-sm text-stone-700">
                <span className="text-2xl font-bold align-middle mr-1.5" style={{ color: O }}>{draftLearnings}</span>
                <span className="text-stone-600">aprendizaje{draftLearnings === 1 ? "" : "s"} pendiente{draftLearnings === 1 ? "" : "s"}</span>
              </p>
              <p className="text-xs text-stone-400 mt-1">Revisar y aplicar al protocolo correspondiente</p>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-400 italic">Nada pendiente por ahora</p>
              <p className="text-xs text-stone-400 mt-1">Los aprendizajes draft aparecerán acá</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
