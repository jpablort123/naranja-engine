'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Copy, Check, ChevronDown, ChevronUp, Edit3,
  Save, X, Clock, ArrowLeft, Loader2, History, Brain,
  FileText, Sparkles, AlertCircle, RefreshCw, CheckCircle2
} from 'lucide-react';

const SLUG_ICONS = {
  'adn': '🧬',
  'mapa-angulos': '🗺️',
  'titulos': '📝',
  'intros': '🎙️',
  'minado': '⛏️',
  'reels': '🎬',
  'linkedin': '💼',
};

export default function ProtocolosViewer({ onBack }) {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showLearnings, setShowLearnings] = useState(false);
  const [toast, setToast] = useState(null);

  const loadProtocols = useCallback(async () => {
    try {
      const res = await fetch('/api/protocolos');
      const data = await res.json();
      setProtocols(Array.isArray(data) ? data : []);
      if (!activeId && data.length > 0) {
        setActiveId(data[0].id);
      }
    } catch (err) {
      console.error('Load protocols error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => { loadProtocols(); }, []);

  const active = protocols.find(p => p.id === activeId);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const copyFullProtocol = () => {
    if (!active) return;
    let full = active.content;
    if (active.approved_learnings?.length > 0) {
      full += '\n\n[APRENDIZAJES]\n' + active.approved_learnings.map(l =>
        `• ${l.proposed_change || l.feedback}`
      ).join('\n');
    }
    copyToClipboard(full, 'protocol');
  };

  const startEdit = () => {
    setEditing(true);
    setEditContent(active.content);
    setEditReason('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditContent('');
    setEditReason('');
  };

  const saveEdit = async () => {
    if (!editContent.trim() || !active) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/protocolos/${active.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent, reason: editReason }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEditing(false);
      setToast('Protocolo actualizado');
      setTimeout(() => setToast(null), 3000);
      loadProtocols();
    } catch (err) {
      setToast('Error: ' + err.message);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    if (!active) return;
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/protocolos/${active.id}/history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('History error:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#FAFAF9' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#EA580C' }} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex" style={{ background: '#FAFAF9', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
          style={{ background: '#1C1917', color: 'white' }}>
          {toast}
        </div>
      )}

      {/* Protocol sidebar list */}
      <div className="w-72 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: '#E7E5E4', background: 'white' }}>
        <div className="p-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors"
            style={{ color: '#78716A' }}
            onMouseOver={e => e.currentTarget.style.color = '#EA580C'}
            onMouseOut={e => e.currentTarget.style.color = '#78716A'}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <h2 className="font-bold text-lg mb-1" style={{ color: '#1C1917' }}>
            Protocolos
          </h2>
          <p className="text-xs mb-4" style={{ color: '#78716A' }}>
            {protocols.length} protocolos del sistema
          </p>
        </div>

        <div className="space-y-0.5 px-2 pb-4">
          {protocols.map(p => {
            const isActive = p.id === activeId;
            const icon = SLUG_ICONS[p.slug] || '📄';
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActiveId(p.id);
                  setEditing(false);
                  setShowHistory(false);
                  setShowLearnings(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5"
                style={{
                  background: isActive ? '#FFF7ED' : 'transparent',
                  border: isActive ? '1px solid #FED7AA' : '1px solid transparent',
                }}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: isActive ? '#EA580C' : '#1C1917' }}>
                    {p.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: '#A8A29E' }}>v{p.version}</span>
                    {p.approved_learnings_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                        <Brain className="w-3 h-3" />
                        {p.approved_learnings_count}
                      </span>
                    )}
                    {p.draft_learnings_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                        {p.draft_learnings_count} pendiente{p.draft_learnings_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Protocol detail */}
      <div className="flex-1 overflow-y-auto">
        {active ? (
          <div className="max-w-3xl mx-auto px-8 py-8">
            {/* Protocol header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{SLUG_ICONS[active.slug] || '📄'}</span>
                  <h1 className="text-xl font-bold" style={{ color: '#1C1917' }}>
                    {active.name}
                  </h1>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: '#78716A' }}>
                  <span>Versión {active.version}</span>
                  <span>·</span>
                  <span>{active.content?.length?.toLocaleString()} caracteres</span>
                  <span>·</span>
                  <span>Slug: {active.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadHistory}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: '#F5F5F4', color: '#44403C' }}
                >
                  <History className="w-3.5 h-3.5" />
                  Historial
                </button>
                <button
                  onClick={copyFullProtocol}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}
                >
                  {copied === 'protocol' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'protocol' ? 'Copiado' : 'Copiar protocolo'}
                </button>
                {!editing && (
                  <button
                    onClick={startEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{ background: '#EA580C', color: 'white' }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>
            </div>

            {/* Version history panel */}
            {showHistory && (
              <div className="mb-6 rounded-xl p-5" style={{ background: 'white', border: '1px solid #E7E5E4' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm" style={{ color: '#1C1917' }}>
                    Historial de versiones
                  </h3>
                  <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-stone-100">
                    <X className="w-4 h-4" style={{ color: '#78716A' }} />
                  </button>
                </div>
                {loadingHistory ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#EA580C' }} />
                    <span className="text-sm" style={{ color: '#78716A' }}>Cargando...</span>
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm py-3" style={{ color: '#78716A' }}>
                    No hay cambios registrados aún.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {history.map((h, i) => (
                      <div key={h.id || i} className="flex gap-3 pb-3" style={{ borderBottom: i < history.length - 1 ? '1px solid #F5F5F4' : 'none' }}>
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                            <Clock className="w-3 h-3" style={{ color: '#EA580C' }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: '#1C1917' }}>
                            {h.summary || 'Cambio sin descripción'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#A8A29E' }}>
                            {new Date(h.created_at).toLocaleDateString('es-CO', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                            {h.learning_ids?.length > 0 && ` · ${h.learning_ids.length} aprendizaje${h.learning_ids.length !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Edit mode */}
            {editing ? (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden" style={{ border: '2px solid #EA580C' }}>
                  <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#FFF7ED' }}>
                    <span className="text-xs font-medium" style={{ color: '#EA580C' }}>Editando protocolo</span>
                    <span className="text-xs" style={{ color: '#A8A29E' }}>{editContent.length.toLocaleString()} chars</span>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full p-4 text-sm leading-relaxed resize-none focus:outline-none"
                    style={{
                      color: '#1C1917',
                      minHeight: '400px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '13px',
                      lineHeight: '1.6',
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: '#78716A' }}>
                    Razón del cambio (opcional)
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    placeholder="Ej: Ajustar tono de las descripciones..."
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ border: '1px solid #E7E5E4', color: '#1C1917' }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving || !editContent.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: '#EA580C', color: 'white' }}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-stone-100"
                    style={{ color: '#78716A' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Protocol content (read mode) */}
                <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #E7E5E4' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#A8A29E' }}>
                      Contenido del protocolo
                    </h3>
                    <button
                      onClick={() => copyToClipboard(active.content, 'content')}
                      className="inline-flex items-center gap-1 text-xs transition-colors"
                      style={{ color: '#78716A' }}
                    >
                      {copied === 'content' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === 'content' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <pre
                    className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{
                      color: '#1C1917',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '13.5px',
                      lineHeight: '1.7',
                    }}
                  >
                    {active.content}
                  </pre>
                </div>

                {/* Injected learnings */}
                {active.approved_learnings?.length > 0 && (
                  <div className="mt-4 rounded-xl p-5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" style={{ color: '#16A34A' }} />
                        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#16A34A' }}>
                          Aprendizajes inyectados ({active.approved_learnings.length})
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowLearnings(!showLearnings)}
                        className="text-xs flex items-center gap-1"
                        style={{ color: '#16A34A' }}
                      >
                        {showLearnings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {showLearnings ? 'Ocultar' : 'Ver detalle'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {active.approved_learnings.map((l, i) => (
                        <div key={l.id || i}>
                          <p className="text-sm" style={{ color: '#166534' }}>
                            • {l.proposed_change || l.feedback}
                          </p>
                          {showLearnings && l.feedback && l.feedback !== l.proposed_change && (
                            <p className="text-xs ml-4 mt-0.5" style={{ color: '#4ADE80' }}>
                              Feedback original: {l.feedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const text = active.approved_learnings.map(l => `• ${l.proposed_change || l.feedback}`).join('\n');
                        copyToClipboard(text, 'learnings');
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs transition-colors"
                      style={{ color: '#16A34A' }}
                    >
                      {copied === 'learnings' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === 'learnings' ? 'Copiado' : 'Copiar aprendizajes'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: '#78716A' }}>Seleccioná un protocolo</p>
          </div>
        )}
      </div>
    </div>
  );
}
