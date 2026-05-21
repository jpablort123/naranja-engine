"use client";
import { useState, useEffect } from "react";
import { Lightbulb, Plus, Loader2 } from "lucide-react";

const O = "#EA580C", OL = "#FFF7ED", OB = "#FED7AA", MU = "#78716A";

const COLUMNS = [
  { key: "newsletter", label: "Newsletter", emoji: "📨", hint: "Ideas largas para escribir" },
  { key: "contenido", label: "Contenido", emoji: "📱", hint: "LinkedIn + Reel" },
  { key: "undecided", label: "Sin definir", emoji: "💭", hint: "Por decidir formato" },
];

export default function FixtureBoard() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ideas")
      .then(r => r.json())
      .then(data => { setIdeas(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setIdeas([]); setLoading(false); });
  }, []);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = ideas.filter(i => (i.category || "undecided") === col.key);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2"><Lightbulb size={20} color={O} /> Banco de ideas</h1>
          <p className="text-xs text-stone-500 mt-1">Fixture editorial. Calienta lo que importa, archiva el resto.</p>
        </div>
        <button disabled className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-400 border border-stone-200 bg-white cursor-not-allowed" title="Próximamente">
          <Plus size={14} /> Nueva idea
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-stone-400 py-12 justify-center">
          <Loader2 size={14} className="animate-spin" /> Cargando ideas...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const items = grouped[col.key] || [];
            return (
              <div key={col.key} className="rounded-xl border border-stone-200 bg-white p-4 min-h-[60vh] flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{col.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{col.label}</p>
                      <p className="text-[10px] text-stone-400 truncate">{col.hint}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <p className="text-xs text-stone-400">Sin ideas en {col.label.toLowerCase()} todavía</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map(idea => (
                      <div key={idea.id} className="rounded-xl border border-stone-200 p-3 hover:border-orange-200 transition-colors cursor-pointer bg-white">
                        <p className="text-sm font-medium text-stone-800">{idea.title}</p>
                        {idea.description && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{idea.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
