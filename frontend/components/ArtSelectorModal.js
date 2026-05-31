'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';

function printingLabel(p) {
  const tags = [];
  if (p.isFullArt) tags.push('Full Art');
  if (p.isBorderless) tags.push('Sin borde');
  if (p.isPromo) tags.push('Promo');
  if (p.frameEffects?.includes('extendedart')) tags.push('Arte extendido');
  if (p.frameEffects?.includes('showcase')) tags.push('Showcase');
  return tags.join(' · ') || null;
}

// ─── Overlay de zoom (por encima del propio modal) ───────────────────────────
function ZoomOverlay({ printing, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Vista ampliada de ${printing.name}`}
    >
      <div className="flex flex-col items-center gap-4 px-4" onClick={(e) => e.stopPropagation()}>
        {printing.imageUrl ? (
          <img
            src={printing.imageUrl}
            alt={`${printing.name} — ${printing.setName}`}
            className="rounded-2xl shadow-2xl"
            style={{ maxHeight: '80vh', maxWidth: '360px', width: '100%' }}
          />
        ) : (
          <div className="w-64 aspect-[63/88] bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500">
            Sin imagen
          </div>
        )}
        {/* Info debajo */}
        <div className="text-center">
          <p className="text-white font-bold">{printing.name}</p>
          <p className="text-gray-400 text-sm">{printing.setName} · {printing.setCode} #{printing.collectorNumber}</p>
          {printing.releasedAt && (
            <p className="text-gray-500 text-xs">{printing.releasedAt.slice(0, 4)}</p>
          )}
          {printingLabel(printing) && (
            <p className="text-amber-400 text-sm mt-0.5">{printingLabel(printing)}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ✕ Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Modal principal ─────────────────────────────────────────────────────────
export default function ArtSelectorModal({ card, onConfirm, onClose }) {
  const [printings, setPrintings] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selected, setSelected]   = useState(null);
  const [hovered, setHovered]     = useState(null);
  const [zoomed, setZoomed]       = useState(null); // carta ampliada

  useEffect(() => {
    const fetchPrintings = async () => {
      try {
        const { data } = await api.get(`/api/cards/${card.scryfallId}/printings`);
        setPrintings(data.printings);
        const current = data.printings.find(p => p.scryfallId === card.scryfallId);
        setSelected(current || data.printings[0] || null);
      } catch {
        setError('No se pudieron cargar las ediciones');
      } finally {
        setLoading(false);
      }
    };
    fetchPrintings();
  }, [card.scryfallId]);

  // Escape cierra el zoom primero; si no hay zoom, cierra el modal
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (zoomed) setZoomed(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, zoomed]);

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({
      ...card,
      scryfallId:    selected.scryfallId,
      imageUrl:      selected.imageUrl,
      imageUrlSmall: selected.imageUrlSmall,
    });
    onClose();
  };

  const preview = hovered || selected;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Seleccionar arte para ${card.name}`}
      >
        <div
          className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-3xl mx-4 shadow-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-bold text-lg">{card.name}</h2>
              <p className="text-gray-400 text-sm">
                {loading
                  ? 'Cargando ediciones...'
                  : `${printings.length} edición${printings.length !== 1 ? 'es' : ''} disponible${printings.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={onClose} aria-label="Cerrar"
              className="text-gray-400 hover:text-white text-xl leading-none ml-4">✕</button>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          {/* Grid + panel lateral */}
          <div className="flex gap-4 flex-1 min-h-0">

            {/* Grid de ediciones */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="aspect-[63/88] bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-1 pr-1">
                {printings.map((p) => {
                  const isSelected = selected?.scryfallId === p.scryfallId;
                  const isHovered  = hovered?.scryfallId  === p.scryfallId;
                  const label      = printingLabel(p);
                  return (
                    <div
                      key={p.scryfallId}
                      className="relative rounded-xl overflow-hidden"
                      onMouseEnter={() => setHovered(p)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {/* Botón principal: seleccionar edición */}
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="w-full text-left focus:outline-none"
                      >
                        {/* Borde de selección inset */}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-xl pointer-events-none z-10"
                               style={{ boxShadow: 'inset 0 0 0 3px rgb(251 191 36)' }} />
                        )}

                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={`${p.name} — ${p.setName}`}
                            className="w-full aspect-[63/88] object-cover rounded-xl"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full aspect-[63/88] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 text-xs p-2 text-center">
                            Sin imagen
                          </div>
                        )}

                        {/* Etiqueta inferior */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-2 rounded-b-xl">
                          <p className="text-white text-xs font-bold truncate">{p.setCode}</p>
                          {label && <p className="text-amber-400 text-xs truncate leading-tight">{label}</p>}
                        </div>

                        {/* Check */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-amber-400 rounded-full w-5 h-5 flex items-center justify-center z-20">
                            <span className="text-gray-900 text-xs font-bold">✓</span>
                          </div>
                        )}
                      </button>

                      {/* Botón lupa — aparece al hacer hover sobre la carta */}
                      {isHovered && p.imageUrl && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setZoomed(p); }}
                          title="Ampliar carta"
                          className="absolute top-2 left-2 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                          aria-label="Ampliar carta"
                        >
                          🔍
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Panel de preview lateral */}
            {!loading && preview && (
              <div className="w-44 flex-shrink-0 flex flex-col gap-2">
                {/* Imagen clicable para ampliar */}
                <button
                  type="button"
                  onClick={() => preview.imageUrl && setZoomed(preview)}
                  title="Ampliar carta"
                  className="relative group focus:outline-none"
                  disabled={!preview.imageUrl}
                >
                  {preview.imageUrl ? (
                    <>
                      <img
                        src={preview.imageUrl}
                        alt={preview.name}
                        className="w-full rounded-xl shadow-lg transition-transform group-hover:scale-[1.02]"
                      />
                      {/* Icono lupa encima al hover */}
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-2xl transition-opacity">🔍</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full aspect-[63/88] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 text-xs">
                      Sin imagen
                    </div>
                  )}
                </button>

                <div>
                  <p className="text-white text-xs font-bold">{preview.setName}</p>
                  <p className="text-gray-400 text-xs">{preview.setCode} · #{preview.collectorNumber}</p>
                  <p className="text-gray-500 text-xs">{preview.releasedAt?.slice(0, 4)}</p>
                  {printingLabel(preview) && (
                    <p className="text-amber-400 text-xs mt-0.5">{printingLabel(preview)}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Confirmar selección */}
          {selected && !loading && (
            <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">Seleccionado: {selected.setName}</p>
                <p className="text-gray-400 text-xs">{selected.setCode} · #{selected.collectorNumber} · {selected.releasedAt?.slice(0, 4)}</p>
                {printingLabel(selected) && (
                  <p className="text-amber-400 text-xs mt-0.5">{printingLabel(selected)}</p>
                )}
              </div>
              <button onClick={handleConfirm}
                className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex-shrink-0">
                Añadir esta edición
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay de zoom — z-[60], por encima del modal */}
      {zoomed && <ZoomOverlay printing={zoomed} onClose={() => setZoomed(null)} />}
    </>
  );
}
