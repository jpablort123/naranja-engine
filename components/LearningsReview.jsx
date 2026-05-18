'use client';

import { useState, useEffect } from 'react';
import {
  Brain, CheckCircle2, XCircle, Clock, Loader2, ChevronDown,
  ChevronUp, AlertTriangle, Sparkles, ArrowLeft, Check, X,
  MinusCircle, RefreshCw
} from 'lucide-react';

const CONFIDENCE_BADGES = {
  high: { label: 'Alta confianza', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  medium: { label: 'Media', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { label: 'Baja', bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200' },
};

export default function LearningsReview({ onBack, onApplied }) {
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [decisions, setDecisions] = useState({}); // { synthesisKey: 'approved' | 'rejected' | 'circumstantial' }
  const [expandedFeedbacks, setExpandedFeedbacks] = useState({});
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState(null);

  const synthesize = async () => {
    setSynthesizing(true);
    setError(null);
    try {
      const res = await fetch('/api/learnings/synthesize', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGroups(data.groups || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setSynthesizing(false);
      setLoading(false);
    }
  };

  useEffect(() => { synthesize(); }, []);

  const getSynthesisKey = (groupIdx, synthIdx) => `${groupIdx}-${synthIdx}`;

  const setDecision = (key, status) => {
    setDecisions(prev => {
      if (prev[key] === status) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: status };
    });
  };

  const toggleFeedbacks = (key) => {
    setExpandedFeedbacks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalDecisions = Object.keys(decisions).length;
  const totalSyntheses = groups.reduce((acc, g) => acc + g.syntheses.length, 0);
  const allDecided = totalDecisions === totalSyntheses && totalSyntheses > 0;

  const applyBatch = async () => {
    setApplying(true);
    try {
      // Build actions from decisions
      const actions = [];
      groups.forEach((group, gi) => {
        group.syntheses.forEach((synth, si) => {
          const key = getSynthesisKey(gi, si);
          const status = decisions[key];
          if (status && synth.learning_ids?.length) {
            actions.push({
              learning_ids: synth.learning_ids,
              status,
              synthesis_text: `${synth.pattern}: ${synth.detail}`,
            });
          }
        });
      });

      const res = await fetch('/api/learnings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setApplied(true);
      if (onApplied) onApplied(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  // --- EMPTY / LOADING / ERROR STATES ---

  if (loading || synthesizing) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#FAFAF9' }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: '#FFF7ED' }}>
            <Brain className="w-6 h-6 animate-pulse" style={{ color: '#EA580C' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#1C1917', fontFamily: 'DM Sans, sans-serif' }}>
              Sintetizando aprendizajes...
            </p>
            <p className="text-sm mt-1" style={{ color: '#78716A' }}>
              La IA está agrupando tus feedbacks por protocolo e identificando patrones
            </p>
          </div>
          <div className="w-48 h-1 rounded-full mx-auto overflow-hidden" style={{ background: '#E7E5E4' }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: '#EA580C', width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (applied) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#FAFAF9' }}>
        <div className="text-center space-y-4 max-w-md">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: '#F0FDF4' }}>
            <CheckCircle2 className="w-7 h-7" style={{ color: '#16A34A' }} />
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: '#1C1917', fontFamily: 'DM Sans, sans-serif' }}>
              Aprendizajes aplicados
            </p>
            <p className="text-sm mt-2" style={{ color: '#78716A' }}>
              Los aprendizajes aprobados se inyectarán automáticamente en los protocolos correspondientes
              la próxima vez que generes contenido. Los rechazados se descartaron. Los circunstanciales
              se guardan como referencia pero no se inyectan.
            </p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: '#EA580C', color: 'white',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al workspace
          </button>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#FAFAF9' }}>
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: '#FFF7ED' }}>
            <Brain className="w-6 h-6" style={{ color: '#EA580C' }} />
          </div>
          <p className="font-semibold" style={{ color: '#1C1917', fontFamily: 'DM Sans, sans-serif' }}>
            No hay aprendizajes pendientes
          </p>
          <p className="text-sm" style={{ color: '#78716A' }}>
            Cuando des feedback sobre el contenido generado, los aprendizajes aparecerán acá para que los revises.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: '#F5F5F4', color: '#44403C', fontFamily: 'DM Sans, sans-serif' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#FAFAF9' }}>
      <div className="max-w-4xl mx-auto px-6 py-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm mb-3 transition-colors"
              style={{ color: '#78716A' }}
              onMouseOver={e => e.currentTarget.style.color = '#EA580C'}
              onMouseOut={e => e.currentTarget.style.color = '#78716A'}
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al workspace
            </button>
            <h1 className="text-2xl font-bold" style={{ color: '#1C1917' }}>
              Revisión de aprendizajes
            </h1>
            <p className="text-sm mt-1" style={{ color: '#78716A' }}>
              {total} feedback{total !== 1 ? 's' : ''} agrupado{total !== 1 ? 's' : ''} en {groups.length} protocolo{groups.length !== 1 ? 's' : ''} — {totalSyntheses} patrón{totalSyntheses !== 1 ? 'es' : ''} identificado{totalSyntheses !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={synthesize}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: '#F5F5F4', color: '#44403C' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-sintetizar
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#991B1B' }}>Error</p>
              <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Protocol groups */}
        <div className="space-y-8">
          {groups.map((group, gi) => (
            <div key={gi}>
              {/* Protocol header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                  <Sparkles className="w-4 h-4" style={{ color: '#EA580C' }} />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: '#1C1917' }}>
                    {group.protocol_name || 'General'}
                  </h2>
                  <p className="text-xs" style={{ color: '#78716A' }}>
                    {group.total_feedbacks} feedback{group.total_feedbacks !== 1 ? 's' : ''} → {group.syntheses.length} patrón{group.syntheses.length !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>

              {/* Syntheses cards */}
              <div className="space-y-4">
                {group.syntheses.map((synth, si) => {
                  const key = getSynthesisKey(gi, si);
                  const decision = decisions[key];
                  const showFeedbacks = expandedFeedbacks[key];
                  const conf = CONFIDENCE_BADGES[synth.confidence] || CONFIDENCE_BADGES.medium;

                  return (
                    <div
                      key={si}
                      className="rounded-xl transition-all"
                      style={{
                        background: 'white',
                        border: decision === 'approved'
                          ? '2px solid #16A34A'
                          : decision === 'rejected'
                          ? '2px solid #DC2626'
                          : decision === 'circumstantial'
                          ? '2px solid #D97706'
                          : '1px solid #E7E5E4',
                        padding: decision ? '15px 19px' : '16px 20px',
                      }}
                    >
                      {/* Pattern + confidence */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm" style={{ color: '#1C1917' }}>
                              {synth.pattern}
                            </h3>
                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${conf.bg} ${conf.text} ${conf.border}`}>
                              {conf.label}
                            </span>
                            {synth.is_contradictory && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                Contradictorio
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: '#44403C' }}>
                            {synth.detail}
                          </p>
                        </div>
                      </div>

                      {/* Proposed change */}
                      {synth.proposed_change && (
                        <div className="rounded-lg p-3 mb-3" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                          <p className="text-xs font-medium mb-1" style={{ color: '#EA580C' }}>
                            Cambio propuesto para el protocolo:
                          </p>
                          <p className="text-sm" style={{ color: '#44403C' }}>
                            {synth.proposed_change}
                          </p>
                        </div>
                      )}

                      {/* Expand raw feedbacks */}
                      <button
                        onClick={() => toggleFeedbacks(key)}
                        className="inline-flex items-center gap-1.5 text-xs mb-3 transition-colors"
                        style={{ color: '#78716A' }}
                        onMouseOver={e => e.currentTarget.style.color = '#EA580C'}
                        onMouseOut={e => e.currentTarget.style.color = '#78716A'}
                      >
                        {showFeedbacks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Ver {synth.learning_ids?.length || 0} feedback{(synth.learning_ids?.length || 0) !== 1 ? 's' : ''} original{(synth.learning_ids?.length || 0) !== 1 ? 'es' : ''}
                      </button>

                      {showFeedbacks && (
                        <div className="space-y-2 mb-3 pl-3" style={{ borderLeft: '2px solid #E7E5E4' }}>
                          {(synth.learning_ids || []).map((lid, fi) => {
                            const rawL = group.raw_learnings?.find(r => r.id === lid);
                            if (!rawL) return null;
                            return (
                              <div key={fi} className="text-xs space-y-0.5" style={{ color: '#57534E' }}>
                                <p><span className="font-medium" style={{ color: '#78716A' }}>Sección:</span> {rawL.section}</p>
                                {rawL.original_content && (
                                  <p className="truncate max-w-xl">
                                    <span className="font-medium" style={{ color: '#78716A' }}>Original:</span> {rawL.original_content.substring(0, 150)}...
                                  </p>
                                )}
                                <p><span className="font-medium" style={{ color: '#78716A' }}>Feedback:</span> {rawL.feedback}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDecision(key, 'approved')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            decision === 'approved'
                              ? 'bg-green-600 text-white'
                              : 'hover:bg-green-50'
                          }`}
                          style={decision !== 'approved' ? { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' } : {}}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => setDecision(key, 'rejected')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            decision === 'rejected'
                              ? 'bg-red-600 text-white'
                              : 'hover:bg-red-50'
                          }`}
                          style={decision !== 'rejected' ? { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' } : {}}
                        >
                          <X className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                        <button
                          onClick={() => setDecision(key, 'circumstantial')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            decision === 'circumstantial'
                              ? 'bg-amber-600 text-white'
                              : 'hover:bg-amber-50'
                          }`}
                          style={decision !== 'circumstantial' ? { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' } : {}}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                          Circunstancial
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        {totalSyntheses > 0 && (
          <div className="sticky bottom-0 mt-8 -mx-6 px-6 py-4" style={{ background: 'linear-gradient(to top, #FAFAF9 80%, transparent)' }}>
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'white', border: '1px solid #E7E5E4', boxShadow: '0 -2px 10px rgba(0,0,0,0.04)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1C1917' }}>
                  {totalDecisions} de {totalSyntheses} decidido{totalDecisions !== 1 ? 's' : ''}
                </p>
                <p className="text-xs" style={{ color: '#78716A' }}>
                  {Object.values(decisions).filter(d => d === 'approved').length} aprobado{Object.values(decisions).filter(d => d === 'approved').length !== 1 ? 's' : ''} · {Object.values(decisions).filter(d => d === 'rejected').length} rechazado{Object.values(decisions).filter(d => d === 'rejected').length !== 1 ? 's' : ''} · {Object.values(decisions).filter(d => d === 'circumstantial').length} circunstancial{Object.values(decisions).filter(d => d === 'circumstantial').length !== 1 ? 'es' : ''}
                </p>
              </div>
              <button
                onClick={applyBatch}
                disabled={!allDecided || applying}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: allDecided ? '#EA580C' : '#D6D3D1',
                  color: 'white',
                }}
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Aplicar decisiones
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
