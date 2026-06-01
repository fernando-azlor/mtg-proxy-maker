'use client';
import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import CardSearch from '../../components/CardSearch';
import api from '../../lib/api';

export default function GuestBuilderPage() {
  const { user, isClient } = useAuth();
  const router = useRouter();
  const [deckCards, setDeckCards] = useState([]);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleAddCard = useCallback((card) => {
    setDeckCards(prev => {
      if (prev.length >= 100) {
        setError('El mazo ya tiene 100 cartas (límite Commander)');
        return prev;
      }
      const exists = prev.find(c => c.name === card.name);
      if (exists) {
        setError('Esta carta ya está en el mazo (Commander es singleton)');
        return prev;
      }
      setError('');
      return [...prev, { ...card, isCommander: false }];
    });
  }, []);

  const handleRemoveCard = (scryfallId) => {
    setDeckCards(prev => prev.filter(c => c.scryfallId !== scryfallId));
  };

  const handleSetCommander = (scryfallId) => {
    setDeckCards(prev => prev.map(c => ({
      ...c,
      isCommander: c.scryfallId === scryfallId ? !c.isCommander : false,
    })));
  };

  const handleExportPdf = async () => {
    if (deckCards.length === 0) {
      setError('Añade cartas al mazo antes de exportar');
      return;
    }
    setExportingPdf(true);
    try {
      const cardsPayload = deckCards.map(({ scryfallId, name, imageUrl }) => ({ scryfallId, name, imageUrl }));
      const response = await api.post(
        '/api/decks/guest/export',
        { cards: cardsPayload },
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

  const commander = deckCards.find(c => c.isCommander);

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

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Constructor de mazo</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {deckCards.length}/100 cartas
              {commander && <span className="text-amber-400 ml-2">· Comandante: {commander.name}</span>}
            </p>
          </div>
          <div className="flex gap-3">
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
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Buscar cartas</h2>
            <CardSearch onAddCard={handleAddCard} deckCards={deckCards} />
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">
              Mazo ({deckCards.length}/100)
            </h2>
            {deckCards.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p>Busca cartas y añádelas aquí</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[600px]">
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
                        className="w-8 h-11 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{card.name}</p>
                      <p className="text-gray-400 text-xs truncate">{card.typeLine}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSetCommander(card.scryfallId)}
                        title="Marcar como comandante"
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          card.isCommander
                            ? 'bg-amber-500 text-gray-900'
                            : 'bg-gray-700 text-gray-400 hover:text-amber-400'
                        }`}
                      >
                        ★
                      </button>
                      <button
                        onClick={() => handleRemoveCard(card.scryfallId)}
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
    </div>
  );
}
