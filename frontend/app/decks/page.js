'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';

export default function DecksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [decks, setDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [newDeckName, setNewDeckName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/builder');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (user) fetchDecks();
  }, [user]);

  const fetchDecks = async () => {
    try {
      const { data } = await api.get('/api/decks');
      setDecks(data.decks);
    } catch {
      setError('Error al cargar los mazos');
    } finally {
      setLoadingDecks(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/api/decks', { name: newDeckName.trim() });
      router.push(`/decks/${data.deck.id}`);
    } catch {
      setError('Error al crear el mazo');
      setCreating(false);
    }
  };

  const startEditing = (deck) => {
    setEditingId(deck.id);
    setEditingName(deck.name);
  };

  const handleRename = async (deckId) => {
    const trimmed = editingName.trim();
    if (!trimmed) { setEditingId(null); return; }
    try {
      await api.put(`/api/decks/${deckId}`, { name: trimmed });
      setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: trimmed } : d));
    } catch {
      setError('Error al renombrar el mazo');
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (deckId) => {
    if (!confirm('¿Eliminar este mazo? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/api/decks/${deckId}`);
      setDecks(prev => prev.filter(d => d.id !== deckId));
    } catch {
      setError('Error al eliminar el mazo');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Mazos</h1>
            <span className="text-gray-400 text-sm">{decks.length} mazo{decks.length !== 1 ? 's' : ''}</span>
          </div>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Nombre del nuevo mazo..."
              maxLength={100}
              className="w-56 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
            <button
              type="submit"
              disabled={creating || !newDeckName.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              {creating ? 'Creando...' : '+ Crear mazo'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-base">
            {error}
          </div>
        )}

        {loadingDecks ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">🃏</p>
            <p>No tienes mazos todavía. ¡Crea uno para empezar!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map(deck => (
              <div
                key={deck.id}
                className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex items-center justify-between hover:border-amber-500 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  {editingId === deck.id ? (
                    <input
                      type="text"
                      value={editingName}
                      autoFocus
                      maxLength={100}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRename(deck.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(deck.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="bg-gray-800 border border-amber-500 rounded-lg px-3 py-1 text-white text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  ) : (
                    <h2
                      className="text-white font-medium cursor-pointer hover:text-amber-400 transition-colors group flex items-center gap-1.5"
                      onClick={() => startEditing(deck)}
                      title="Clic para renombrar"
                    >
                      {deck.name}
                      <span className="text-gray-600 group-hover:text-amber-500 text-xs">✎</span>
                    </h2>
                  )}
                  <p className="text-gray-400 text-sm mt-0.5">
                    {deck._count.cards} / 100 cartas · Commander
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/decks/${deck.id}`}
                    className="bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    className="bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-red-300 text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
