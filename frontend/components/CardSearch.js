'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import CardItem from './CardItem';
import ArtSelectorModal from './ArtSelectorModal';
import { useAuth } from '../context/AuthContext';

const COLOR_OPTIONS = [
  { code: 'W', label: 'Blanco', bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300', activeBg: 'bg-yellow-200' },
  { code: 'U', label: 'Azul',   bg: 'bg-blue-600',   text: 'text-white',      border: 'border-blue-400',   activeBg: 'bg-blue-500'   },
  { code: 'B', label: 'Negro',  bg: 'bg-gray-700',   text: 'text-gray-200',   border: 'border-gray-500',   activeBg: 'bg-gray-600'   },
  { code: 'R', label: 'Rojo',   bg: 'bg-red-600',    text: 'text-white',      border: 'border-red-400',    activeBg: 'bg-red-500'    },
  { code: 'G', label: 'Verde',  bg: 'bg-green-600',  text: 'text-white',      border: 'border-green-400',  activeBg: 'bg-green-500'  },
  { code: 'C', label: 'Incolor',bg: 'bg-gray-400',   text: 'text-gray-900',   border: 'border-gray-300',   activeBg: 'bg-gray-300'   },
];

function CardPreviewModal({ card, onClose, onAdd, onSelectArt, isInDeck }) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Previsualización de ${card.name}`}
    >
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-2xl p-5 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl leading-none"
          aria-label="Cerrar previsualización"
        >
          ✕
        </button>

        {/* Imagen grande */}
        <div className="flex justify-center mb-4">
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              className="rounded-xl w-56 shadow-lg"
            />
          ) : (
            <div className="w-56 aspect-[63/88] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 text-sm">
              Sin imagen
            </div>
          )}
        </div>

        {/* Info */}
        <h3 className="text-white font-bold text-lg">{card.name}</h3>
        {card.manaCost && (
          <p className="text-amber-400 text-sm mt-0.5">{card.manaCost}</p>
        )}
        <p className="text-gray-400 text-sm mt-1">{card.typeLine}</p>
        {card.oracleText && (
          <p className="text-gray-300 text-xs mt-2 leading-relaxed border-t border-gray-700 pt-2">
            {card.oracleText}
          </p>
        )}
        {card.legalities?.commander === 'not_legal' && (
          <p className="text-red-400 text-xs mt-2">⚠ No legal en Commander</p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { onAdd(card); onClose(); }}
            disabled={isInDeck}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-900 font-semibold py-2 rounded-lg transition-colors text-sm"
          >
            {isInDeck ? 'Ya está en el mazo' : '+ Añadir al mazo'}
          </button>
          {onSelectArt && !isInDeck && (
            <button
              onClick={() => onSelectArt(card)}
              title="Elegir edición / arte"
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-3 py-2 rounded-lg transition-colors text-sm"
            >
              🎨
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CardSearch({ onAddCard, onRemoveCard, deckCards }) {
  const { isClient } = useAuth();
  const [query, setQuery]                   = useState('');
  const [selectedColors, setSelectedColors] = useState([]);
  const [cmc, setCmc]                       = useState('');
  const [cards, setCards]                   = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [hasMore, setHasMore]               = useState(false);
  const [page, setPage]                     = useState(1);
  const [previewCard, setPreviewCard]       = useState(null);
  const [artCard, setArtCard]               = useState(null); // carta pendiente de selección de arte

  const hasActiveFilters = selectedColors.length > 0 || cmc !== '';
  const shouldSearch = query.trim().length >= 2 || hasActiveFilters;

  const searchCards = useCallback(async (searchQuery, searchPage, colors, cmcValue) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: searchPage };
      if (searchQuery.trim().length >= 2) params.q = searchQuery.trim();
      if (colors.length > 0) params.colors = colors.join(',');
      if (cmcValue !== '') params.cmc = cmcValue;

      const { data } = await api.get('/api/cards/search', { params });

      if (searchPage === 1) {
        setCards(data.cards);
      } else {
        setCards(prev => [...prev, ...data.cards]);
      }
      setHasMore(data.hasMore);
    } catch {
      setError('Error al buscar cartas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldSearch) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setPage(1);
    const delay = query.trim().length >= 2 ? 400 : 0;
    const timer = setTimeout(() => {
      searchCards(query, 1, selectedColors, cmc);
    }, delay);
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => clearTimeout(timer);
  }, [query, selectedColors, cmc]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleCards = shouldSearch ? cards : [];

  const toggleColor = (code) =>
    setSelectedColors(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    searchCards(query, next, selectedColors, cmc);
  };

  const clearFilters = () => { setSelectedColors([]); setCmc(''); };

  const isCardInDeck = (name) => deckCards.some(c => c.name === name);
  // Devuelve la cantidad total de copias de esa carta en el mazo
  const getCardCount = (name) => deckCards.find(c => c.name === name)?.quantity || 0;

  return (
    <div className="flex flex-col">

      {/* Texto */}
      <div className="mb-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cartas... (ej: Dragon, Lightning Bolt)"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Buscar cartas de Magic"
        />
        {query.length > 0 && query.length < 2 && !hasActiveFilters && (
          <p className="text-gray-500 text-xs mt-1">Escribe al menos 2 caracteres o usa los filtros</p>
        )}
      </div>

      {/* Filtros en una sola fila */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        {/* Label Color */}
        <span className="text-gray-400 text-xs font-medium whitespace-nowrap">Color</span>
        {/* Botones de color */}
        <div className="flex gap-1.5">
          {COLOR_OPTIONS.map(({ code, label, bg, text, border, activeBg }) => {
            const active = selectedColors.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleColor(code)}
                title={label}
                aria-pressed={active}
                className={`w-7 h-7 rounded-full border-2 font-bold text-xs transition-all
                  ${active
                    ? `${activeBg} ${text} ${border} ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-900 scale-110`
                    : `${bg} ${text} ${border} opacity-60 hover:opacity-100`
                  }`}
              >
                {code}
              </button>
            );
          })}
        </div>

        {/* Separador */}
        <span className="text-gray-600 text-xs">|</span>

        {/* Coste de maná */}
        <label htmlFor="cmc-filter" className="text-gray-400 text-xs font-medium whitespace-nowrap">
          Maná
        </label>
        <input
          id="cmc-filter"
          type="number"
          min="0"
          max="20"
          value={cmc}
          onChange={(e) => setCmc(e.target.value === '' ? '' : e.target.value)}
          placeholder="—"
          className="w-16 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
        />

        {/* Limpiar */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-gray-400 hover:text-white text-xs underline ml-auto"
          >
            Limpiar
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading && visibleCards.length === 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl aspect-[63/88] animate-pulse" />
          ))}
        </div>
      )}

      {visibleCards.length > 0 && (
        <>
          {/* Scroll en un div separado del grid para que aspect-ratio funcione correctamente */}
          <div className="overflow-y-auto max-h-[520px] mt-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {visibleCards.map(card => (
                <CardItem
                  key={card.scryfallId}
                  card={card}
                  onAdd={onAddCard}
                  onRemove={onRemoveCard}
                  onPreview={setPreviewCard}
                  onSelectArt={isClient ? setArtCard : undefined}
                  isInDeck={isCardInDeck(card.name)}
                  count={getCardCount(card.name)}
                />
              ))}
            </div>
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Cargando...' : 'Cargar más'}
            </button>
          )}
        </>
      )}

      {!loading && shouldSearch && visibleCards.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No se encontraron cartas con esos criterios
        </div>
      )}

      {!shouldSearch && (
        <div className="text-center text-gray-600 py-12">
          <p className="text-4xl mb-3">🃏</p>
          <p>Busca cartas o usa los filtros para explorar</p>
        </div>
      )}

      {/* Modal de previsualización */}
      {previewCard && (
        <CardPreviewModal
          card={previewCard}
          onClose={() => setPreviewCard(null)}
          onAdd={onAddCard}
          onSelectArt={isClient ? (card) => { setPreviewCard(null); setArtCard(card); } : undefined}
          isInDeck={isCardInDeck(previewCard.name)}
        />
      )}

      {/* Modal de selección de arte (solo usuarios logueados) */}
      {artCard && (
        <ArtSelectorModal
          card={artCard}
          onConfirm={onAddCard}
          onClose={() => setArtCard(null)}
        />
      )}
    </div>
  );
}
