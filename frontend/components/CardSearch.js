'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import CardItem from './CardItem';

export default function CardSearch({ onAddCard, deckCards }) {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const searchCards = useCallback(async (searchQuery, searchPage = 1) => {
    if (searchQuery.trim().length < 2) {
      setCards([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/api/cards/search', {
        params: { q: searchQuery, page: searchPage }
      });

      if (searchPage === 1) {
        setCards(data.cards);
      } else {
        setCards(prev => [...prev, ...data.cards]);
      }
      setHasMore(data.hasMore);
    } catch (err) {
      setError('Error al buscar cartas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce: esperar 400ms tras el ultimo keystroke
  useEffect(() => {
    if (query.trim().length < 2) {
      setCards([]);
      return;
    }
    setPage(1);
    const timer = setTimeout(() => {
      searchCards(query, 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, searchCards]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    searchCards(query, nextPage);
  };

  const getCardCount = (scryfallId) => {
    return deckCards.filter(c => c.scryfallId === scryfallId).length;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cartas... (ej: Dragon, Lightning Bolt)"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Buscar cartas de Magic"
        />
        {query.length > 0 && query.length < 2 && (
          <p className="text-gray-500 text-xs mt-1">Escribe al menos 2 caracteres</p>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading && cards.length === 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl aspect-[63/88] animate-pulse" />
          ))}
        </div>
      )}

      {cards.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto flex-1">
            {cards.map(card => (
              <CardItem
                key={card.scryfallId}
                card={card}
                onAdd={onAddCard}
                isInDeck={getCardCount(card.scryfallId) > 0}
                count={getCardCount(card.scryfallId)}
              />
            ))}
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

      {!loading && query.length >= 2 && cards.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No se encontraron cartas para "{query}"
        </div>
      )}

      {query.length === 0 && (
        <div className="text-center text-gray-600 py-12">
          <p className="text-4xl mb-3">🃏</p>
          <p>Busca cartas para añadir a tu mazo</p>
        </div>
      )}
    </div>
  );
}
