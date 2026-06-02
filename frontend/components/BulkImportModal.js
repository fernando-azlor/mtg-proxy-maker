'use client';
import { useState } from 'react';
import api from '../lib/api';

// Parsea una lista de mazos en formato estándar (MTGO / Moxfield / Arena)
// Soporta: "4 Lightning Bolt", "4x Counterspell", secciones SIDEBOARD:, comentarios // y #
function parseDeckList(text) {
  const SECTION_HEADERS = /^(sideboard|mainboard|commander|mazo|tierras|criaturas|hechizos|lands|creatures|spells|instants|sorceries|artifacts|enchantments|planeswalkers|others?):?$/i;
  const lines = text.split('\n');
  const cards = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('//') || line.startsWith('#')) continue;
    if (SECTION_HEADERS.test(line)) continue;

    const withCount = line.match(/^(\d+)[xX]?\s+(.+)$/);
    if (withCount) {
      const quantity = Math.min(99, Math.max(1, parseInt(withCount[1], 10)));
      const name = withCount[2].trim();
      if (name) cards.push({ name, quantity });
      continue;
    }

    if (/[a-zA-ZÀ-ÿ]/.test(line)) {
      cards.push({ name: line, quantity: 1 });
    }
  }

  return cards;
}

export default function BulkImportModal({ onImport, onClose, existingCardNames = [] }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    const cards = parseDeckList(text);
    if (cards.length === 0) {
      setError('No se detectaron cartas. Comprueba el formato.');
      return;
    }
    if (cards.length > 300) {
      setError('Máximo 300 cartas por importación.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post('/api/cards/bulk-lookup', { cards });
      setResult(data);
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Demasiadas importaciones seguidas. Espera un momento.');
      } else {
        setError('Error al buscar las cartas. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    const toAdd = result.found.filter(c => !existingCardNames.includes(c.name));
    onImport(toAdd);
    onClose();
  };

  const alreadyInDeck = result
    ? result.found.filter(c => existingCardNames.includes(c.name)).length
    : 0;
  const toAdd = result ? result.found.length - alreadyInDeck : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Importar lista de cartas"
    >
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl leading-none"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h2 className="text-white font-bold text-lg mb-1">Importar lista de cartas</h2>
        <p className="text-gray-400 text-sm mb-4">
          Pega tu lista en formato estándar (una carta por línea):
        </p>

        <div className="bg-gray-800 rounded-lg px-3 py-2 mb-3 font-mono text-xs text-gray-400">
          <p>4 Lightning Bolt</p>
          <p>1x Sol Ring</p>
          <p>SIDEBOARD:</p>
          <p>2 Counterspell</p>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Pega tu lista aquí..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none flex-1 min-h-[160px] font-mono"
          spellCheck={false}
        />

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        {result && (
          <div className="mt-3 space-y-1.5">
            <p className="text-green-400 text-sm font-medium">
              ✓ {result.found.length} cartas encontradas
              {alreadyInDeck > 0 && (
                <span className="text-gray-400 font-normal"> ({alreadyInDeck} ya en el mazo)</span>
              )}
            </p>
            {result.notFound?.length > 0 && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
                <p className="text-red-400 text-xs font-medium mb-1">
                  ✕ {result.notFound.length} no encontradas:
                </p>
                <p className="text-red-300 text-xs">
                  {result.notFound.map(c => c.name).join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {!result ? (
            <button
              onClick={handleLookup}
              disabled={loading || !text.trim()}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold py-2 rounded-lg transition-colors text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-gray-900 border-t-transparent rounded-full" />
                  Buscando en Scryfall...
                </span>
              ) : (
                'Buscar cartas'
              )}
            </button>
          ) : (
            <>
              <button
                onClick={() => { setResult(null); setError(''); }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                ← Editar lista
              </button>
              <button
                onClick={handleConfirm}
                disabled={toAdd === 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                {toAdd === 0 ? 'Todas ya añadidas' : `Añadir ${toAdd} carta${toAdd !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
