'use client';
import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import CardSearch from '../../components/CardSearch';
import BulkImportModal from '../../components/BulkImportModal';
import ArtSelectorModal from '../../components/ArtSelectorModal';
import api from '../../lib/api';

export default function GuestBuilderPage() {
  const { user, isClient } = useAuth();
  const router = useRouter();
  const [deckCards, setDeckCards] = useState([]);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [artCard, setArtCard] = useState(null);

  // Añade 1 copia de una carta. Si ya existe, aumenta la cantidad.
  const handleAddCard = useCallback((card) => {
    setDeckCards(prev => {
      const existing = prev.find(c => c.scryfallId === card.scryfallId);
      if (existing) {
        setError('');
        return prev.map(c =>
          c.scryfallId === card.scryfallId
            ? { ...c, quantity: (c.quantity || 1) + 1 }
            : c
        );
      }
      setError('');
      return [...prev, { ...card, isCommander: false, quantity: 1 }];
    });
  }, []);

  // Quita 1 copia; elimina la carta si llega a 0.
  const handleRemoveCard = useCallback((card) => {
    setDeckCards(prev =>
      prev
        .map(c =>
          c.scryfallId === card.scryfallId
            ? { ...c, quantity: (c.quantity || 1) - 1 }
            : c
        )
        .filter(c => (c.quantity || 1) > 0)
    );
  }, []);

  // Cambio manual de cantidad desde la lista del mazo (botones + / −)
  const handleQuantityChange = useCallback((scryfallId, delta) => {
    setDeckCards(prev =>
      prev
        .map(c =>
          c.scryfallId === scryfallId
            ? { ...c, quantity: Math.max(0, (c.quantity || 1) + delta) }
            : c
        )
        .filter(c => (c.quantity || 1) > 0)
    );
  }, []);

  const handleRemoveAll = useCallback((scryfallId) => {
    setDeckCards(prev => prev.filter(c => c.scryfallId !== scryfallId));
  }, []);

  const handleSetCommander = useCallback((scryfallId) => {
    setDeckCards(prev =>
      prev.map(c => ({
        ...c,
        isCommander: c.scryfallId === scryfallId ? !c.isCommander : false,
      }))
    );
  }, []);

  // Importación masiva: fusiona con cartas ya existentes sumando cantidades
  const handleBulkImport = useCallback((cards) => {
    setDeckCards(prev => {
      const byId = Object.fromEntries(prev.map(c => [c.scryfallId, c]));
      cards.forEach(c => {
        if (byId[c.scryfallId]) {
          byId[c.scryfallId] = {
            ...byId[c.scryfallId],
            quantity: (byId[c.scryfallId].quantity || 1) + (c.quantity || 1),
          };
        } else {
          byId[c.scryfallId] = { ...c, isCommander: false, quantity: c.quantity || 1 };
        }
      });
      return Object.values(byId);
    });
  }, []);

  const handleArtConfirm = useCallback((updatedCard) => {
    setDeckCards(prev =>
      prev.map(c =>
        c.scryfallId === artCard?.scryfallId
          ? { ...c, ...updatedCard, quantity: c.quantity, isCommander: c.isCommander }
          : c
      )
    );
    setArtCard(null);
  }, [artCard]);

  const handleExportPdf = async () => {
    if (deckCards.length === 0) {
      setError('Añade cartas al mazo antes de exportar');
      return;
    }
    setExportingPdf(true);
    try {
      // Expandir las copias múltiples en entradas individuales para el PDF
      const expanded = deckCards.flatMap(c =>
        Array(c.quantity || 1).fill({
          scryfallId: c.scryfallId,
          name: c.name,
          imageUrl: c.imageUrl || '',
        })
      );

      const response = await api.post(
        '/api/decks/guest/export',
        { cards: expanded },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'proxy.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Error al exportar el PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  // Total de cartas contando copias
  const totalCards = deckCards.reduce((s, c) => s + (c.quantity || 1), 0);
  const commander = deckCards.find(c => c.isCommander);
  const existingNames = deckCards.map(c => c.name);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      {!user && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-amber-300 text-base">
              Estás usando el modo visitante. Tu mazo no se guardará al cerrar la página.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/login')}
                className="text-amber-400 hover:text-amber-300 text-sm font-semibold underline"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => router.push('/register')}
                className="bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold px-3 py-1 rounded-lg transition-colors"
              >
                Registrarse para guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="main-content" className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Constructor de mazo</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {totalCards}/100 cartas
              {commander && (
                <span className="text-amber-400 ml-2">· Comandante: {commander.name}</span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Botón de importación masiva */}
            <button
              onClick={() => setShowBulkImport(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              📋 Importar lista
            </button>
            {isClient && (
              <button
                onClick={() => router.push('/decks')}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Mis mazos guardados
              </button>
            )}
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf || deckCards.length === 0}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {exportingPdf ? 'Generando PDF...' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-base">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de búsqueda */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Buscar cartas</h2>
            <CardSearch
              onAddCard={handleAddCard}
              onRemoveCard={handleRemoveCard}
              deckCards={deckCards}
            />
          </div>

          {/* Panel del mazo */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">
                Mazo ({totalCards} carta{totalCards !== 1 ? 's' : ''})
              </h2>
              {deckCards.length > 0 && (
                <button
                  onClick={() => setDeckCards([])}
                  className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                >
                  Vaciar mazo
                </button>
              )}
            </div>

            {deckCards.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-4xl mb-3">🃏</p>
                <p>Busca cartas o importa una lista</p>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="mt-4 text-amber-400 hover:text-amber-300 text-sm underline"
                >
                  Importar lista de mazo
                </button>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[580px] pr-1">
                {deckCards.map(card => (
                  <div
                    key={card.scryfallId}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                      card.isCommander
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-700 bg-gray-800'
                    }`}
                  >
                    {card.imageUrlSmall && (
                      <img
                        src={card.imageUrlSmall}
                        alt={card.name}
                        className="w-8 h-11 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{card.name}</p>
                      <p className="text-gray-400 text-xs truncate">{card.typeLine}</p>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleQuantityChange(card.scryfallId, -1)}
                        aria-label={`Quitar una copia de ${card.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-white text-sm font-bold transition-colors"
                      >
                        −
                      </button>
                      <span className="text-white text-sm font-bold w-5 text-center">
                        {card.quantity || 1}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(card.scryfallId, +1)}
                        aria-label={`Añadir otra copia de ${card.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-amber-600 text-gray-300 hover:text-white text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Comandante y eliminar */}
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleSetCommander(card.scryfallId)}
                        title="Marcar como comandante"
                        aria-label={card.isCommander ? `Quitar comandante: ${card.name}` : `Marcar como comandante: ${card.name}`}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          card.isCommander
                            ? 'bg-amber-500 text-gray-900'
                            : 'bg-gray-700 text-gray-400 hover:text-amber-400'
                        }`}
                      >
                        ★
                      </button>
                      <button
                        onClick={() => handleRemoveAll(card.scryfallId)}
                        aria-label={`Eliminar ${card.name} del mazo`}
                        className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de importación masiva */}
      {showBulkImport && (
        <BulkImportModal
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
          existingCardNames={existingNames}
        />
      )}

      {/* Modal de selección de arte */}
      {artCard && (
        <ArtSelectorModal
          card={artCard}
          onConfirm={handleArtConfirm}
          onClose={() => setArtCard(null)}
        />
      )}
    </div>
  );
}
