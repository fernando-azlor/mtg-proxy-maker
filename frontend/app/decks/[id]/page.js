'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import CardSearch from '../../../components/CardSearch';
import api from '../../../lib/api';

export default function DeckBuilderPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && id) fetchDeck();
  }, [user, id]);

  const fetchDeck = async () => {
    try {
      const { data } = await api.get(`/api/decks/${id}`);
      setDeck(data.deck);
      setDeckCards(data.deck.cards);
    } catch (err) {
      if (err.response?.status === 403) {
        router.push('/decks');
      } else {
        setError('Error al cargar el mazo');
      }
    } finally {
      setLoadingDeck(false);
    }
  };

  const handleAddCard = useCallback((card) => {
    setDeckCards(prev => {
      if (prev.length >= 100) {
        setError('El mazo ya tiene 100 cartas (límite Commander)');
        return prev;
      }
      const exists = prev.find(c => c.scryfallId === card.scryfallId);
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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/decks/${id}`, {
        name: deck.name,
        cards: deckCards,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (deckCards.length === 0) {
      setError('Añade cartas al mazo antes de exportar');
      return;
    }
    setExportingPdf(true);
    try {
      const response = await api.get(`/api/decks/${id}/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${deck.name}.pdf`);
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

  if (loading || loadingDeck) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{deck?.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {deckCards.length}/100 cartas
              {commander && <span className="text-amber-400 ml-2">· Comandante: {commander.name}</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
            </button>
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
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
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
