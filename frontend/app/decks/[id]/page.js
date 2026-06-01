'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import CardSearch from '../../../components/CardSearch';
import ArtSelectorModal from '../../../components/ArtSelectorModal';
import api from '../../../lib/api';

// ─── Helpers de estadísticas (client-side, sin llamada extra) ───────────────

/** Calcula el CMC a partir del coste de maná de Scryfall ({2}{U}{U} → 4) */
function parseCmc(manaCost) {
  if (!manaCost) return 0;
  let cmc = 0;
  const tokens = manaCost.match(/\{[^}]+\}/g) || [];
  for (const token of tokens) {
    const inner = token.slice(1, -1);
    if (/^\d+$/.test(inner)) cmc += parseInt(inner, 10);
    else if (/^[XYZ]$/.test(inner)) cmc += 0; // variable
    else cmc += 1; // colores, híbridos, Phyrexian, C, S…
  }
  return cmc;
}

/** Extrae los colores del coste de maná */
function parseColors(manaCost) {
  if (!manaCost) return [];
  const found = new Set();
  const tokens = manaCost.match(/\{[^}]+\}/g) || [];
  for (const token of tokens) {
    const inner = token.slice(1, -1);
    for (const c of ['W', 'U', 'B', 'R', 'G']) {
      if (inner.includes(c)) found.add(c);
    }
  }
  return [...found];
}

const isLandCard  = (c) => (c.typeLine || '').includes('Land');
const isCreature  = (c) => (c.typeLine || '').includes('Creature');

const SYNERGY_KW = {
  'Cementerio':   ['graveyard', 'flashback', 'unearth', 'delve', 'escape', 'dredge', 'embalm'],
  '+1/+1':        ['+1/+1 counter'],
  'Tokens':       ['create a ', 'create two', 'create three', ' token'],
  'Robo cartas':  ['draw a card', 'draw two cards', 'draw three', 'draw cards'],
  'Rampa':        ['search your library for a basic land', 'search your library for a land'],
  'Remoción':     ['destroy target', 'exile target'],
  'Vida':         ['gain life', 'lifelink'],
  'Sacrificio':   ['sacrifice a ', 'sacrifice another'],
  'Copiar':       ['copy of that spell', 'copy target'],
  'Equipamiento': ['equip {', 'equipped creature'],
};

function computeDeckStats(deckCards) {
  const total    = deckCards.length;
  const lands    = deckCards.filter(isLandCard);
  const nonLands = deckCards.filter(c => !isLandCard(c));

  // Curva de maná
  const curve = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6+': 0 };
  nonLands.forEach(c => {
    const cmc = parseCmc(c.manaCost);
    const key = cmc >= 6 ? '6+' : String(cmc);
    curve[key]++;
  });

  // Colores
  const colorCount = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  deckCards.forEach(c => {
    parseColors(c.manaCost).forEach(col => { colorCount[col]++; });
  });
  const incoloro = deckCards.filter(c => parseColors(c.manaCost).length === 0 && !isLandCard(c)).length;

  // Tipos
  const types = {
    Criaturas: deckCards.filter(isCreature).length,
    Instantáneos: deckCards.filter(c => (c.typeLine || '').includes('Instant')).length,
    Conjuros: deckCards.filter(c => (c.typeLine || '').includes('Sorcery')).length,
    Encantamientos: deckCards.filter(c => (c.typeLine || '').includes('Enchantment') && !isCreature(c)).length,
    Artefactos: deckCards.filter(c => (c.typeLine || '').includes('Artifact') && !isCreature(c)).length,
    Planeswalkers: deckCards.filter(c => (c.typeLine || '').includes('Planeswalker')).length,
    Tierras: lands.length,
  };

  // CMC promedio (solo no-tierras)
  const avgCmc = nonLands.length > 0
    ? +(nonLands.reduce((s, c) => s + parseCmc(c.manaCost), 0) / nonLands.length).toFixed(2)
    : 0;

  // Velocidad
  let speed, speedLabel, speedColor;
  if      (avgCmc < 2.0) { speed = 'fast';     speedLabel = 'Agresivo';    speedColor = 'text-green-400'; }
  else if (avgCmc < 2.8) { speed = 'medium';   speedLabel = 'Equilibrado'; speedColor = 'text-yellow-400'; }
  else if (avgCmc < 3.8) { speed = 'control';  speedLabel = 'Control';     speedColor = 'text-orange-400'; }
  else                   { speed = 'combo';    speedLabel = 'Combo / Big'; speedColor = 'text-red-400'; }

  // Sinergias (mínimo 2 cartas para contar)
  const synergies = {};
  Object.entries(SYNERGY_KW).forEach(([theme, kws]) => {
    const count = deckCards.filter(c => {
      const txt = (c.oracleText || '').toLowerCase();
      return kws.some(kw => txt.includes(kw));
    }).length;
    if (count >= 2) synergies[theme] = count;
  });

  return { total, landCount: lands.length, avgCmc, speed, speedLabel, speedColor, curve, colorCount, incoloro, types, synergies };
}

// ─── Componentes de gráfico ──────────────────────────────────────────────────
const COLOR_META = {
  W: { bg: 'bg-yellow-200', label: 'Blanco',  symbol: '☀' },
  U: { bg: 'bg-blue-500',   label: 'Azul',    symbol: '💧' },
  B: { bg: 'bg-gray-700',   label: 'Negro',   symbol: '💀' },
  R: { bg: 'bg-red-500',    label: 'Rojo',    symbol: '🔥' },
  G: { bg: 'bg-green-500',  label: 'Verde',   symbol: '🌲' },
};
const TYPE_COLORS = {
  Criaturas: 'bg-green-500', Instantáneos: 'bg-blue-500', Conjuros: 'bg-red-400',
  Encantamientos: 'bg-purple-500', Artefactos: 'bg-gray-400', Planeswalkers: 'bg-yellow-400', Tierras: 'bg-amber-700',
};

function ManaCurveBar({ curve }) {
  const keys  = ['0','1','2','3','4','5','6+'];
  const maxV  = Math.max(...Object.values(curve), 1);
  return (
    <div>
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Curva de maná</p>
      <div className="flex items-end gap-1.5 h-20">
        {keys.map(k => {
          const v = curve[k] || 0;
          return (
            <div key={k} className="flex-1 flex flex-col items-center gap-0.5">
              {v > 0 && <span className="text-amber-400 text-xs font-bold leading-none">{v}</span>}
              <div className="w-full flex items-end" style={{ height: '52px' }}>
                <div className="w-full bg-amber-500 rounded-t-sm transition-all duration-300"
                     style={{ height: `${(v / maxV) * 100}%`, minHeight: v > 0 ? '3px' : '0' }} />
              </div>
              <span className="text-gray-500 text-xs leading-none">{k}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColorPips({ colorCount, incoloro }) {
  const active = Object.entries(colorCount).filter(([, v]) => v > 0);
  if (active.length === 0 && incoloro === 0) return (
    <p className="text-gray-600 text-xs">Sin datos de color</p>
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map(([c, v]) => {
        const m = COLOR_META[c];
        return (
          <div key={c} className={`flex items-center gap-1 px-2 py-1 rounded-full ${m.bg} text-gray-900`}>
            <span className="text-xs leading-none">{m.symbol}</span>
            <span className="text-xs font-bold">{v}</span>
          </div>
        );
      })}
      {incoloro > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-600 text-white">
          <span className="text-xs leading-none">◇</span>
          <span className="text-xs font-bold">{incoloro}</span>
        </div>
      )}
    </div>
  );
}

function TypeBars({ types }) {
  const entries = Object.entries(types).filter(([, v]) => v > 0);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-1.5">
      {entries.map(([t, v]) => (
        <div key={t} className="flex items-center gap-2">
          <span className="text-gray-400 text-xs w-24 shrink-0 truncate">{t}</span>
          <div className="flex-1 bg-gray-800 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${TYPE_COLORS[t] || 'bg-gray-500'}`}
                 style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="text-gray-400 text-xs w-4 text-right">{v}</span>
        </div>
      ))}
    </div>
  );
}

function StatsPanel({ stats }) {
  const { total, landCount, avgCmc, speedLabel, speedColor, curve, colorCount, incoloro, types, synergies } = stats;
  const synEntries = Object.entries(synergies).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Total',   value: total,    icon: '🃏' },
          { label: 'Tierras', value: `${landCount}/37`, icon: '🏔' },
          { label: 'CMC prom', value: avgCmc || '—', icon: '⚡' },
          { label: 'Velocidad', value: speedLabel, icon: '🏃', color: speedColor },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-gray-800 rounded-lg p-2.5 text-center">
            <p className="text-base">{icon}</p>
            <p className={`font-bold text-sm leading-tight mt-0.5 ${color || 'text-white'}`}>{value}</p>
            <p className="text-gray-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Curva de maná */}
      <ManaCurveBar curve={curve} />

      {/* Colores */}
      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Colores</p>
        <ColorPips colorCount={colorCount} incoloro={incoloro} />
      </div>

      {/* Tipos */}
      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Tipos</p>
        <TypeBars types={types} />
      </div>

      {/* Sinergias */}
      {synEntries.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Sinergias</p>
          <div className="flex flex-wrap gap-1.5">
            {synEntries.map(([theme, count]) => (
              <div key={theme} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-2.5 py-1">
                <span className="text-white text-xs">{theme}</span>
                <span className="bg-amber-500 text-gray-900 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <p className="text-gray-600 text-xs text-center py-4">Añade cartas para ver estadísticas</p>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DeckBuilderPage() {
  const { user, loading, isClient, isPremium } = useAuth();
  const router = useRouter();
  const { id } = useParams();

  const [deck, setDeck]           = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [previewCard, setPreviewCard]   = useState(null);
  const [artCard, setArtCard]           = useState(null);

  // Estadísticas en tiempo real — solo se recalculan cuando cambia deckCards
  const stats = useMemo(() => computeDeckStats(deckCards), [deckCards]);

  useEffect(() => {
    if (!loading && !user) router.push('/builder');
  }, [user, loading, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (user && id) fetchDeck();
  }, [user, id]);

  const fetchDeck = async () => {
    try {
      const { data } = await api.get(`/api/decks/${id}`);
      setDeck(data.deck);
      setDeckCards(data.deck.cards);
    } catch (err) {
      if (err.response?.status === 403) router.push('/decks');
      else setError('Error al cargar el mazo');
    } finally {
      setLoadingDeck(false);
    }
  };

  const handleAddCard = useCallback((card) => {
    setDeckCards(prev => {
      if (prev.length >= 100) { setError('El mazo ya tiene 100 cartas (límite Commander)'); return prev; }
      if (prev.find(c => c.name === card.name)) { setError('Esta carta ya está en el mazo (Commander es singleton)'); return prev; }
      setError('');
      return [...prev, { ...card, isCommander: false }];
    });
  }, []);

  const handleRemoveCard = (scryfallId) =>
    setDeckCards(prev => prev.filter(c => c.scryfallId !== scryfallId));

  const handleSetCommander = (scryfallId) =>
    setDeckCards(prev => prev.map(c => ({
      ...c,
      isCommander: c.scryfallId === scryfallId ? !c.isCommander : false,
    })));

  const handleChangeArt = useCallback((updatedCard) => {
    setDeckCards(prev => prev.map(c =>
      c.name === updatedCard.name
        ? { ...c, scryfallId: updatedCard.scryfallId, imageUrl: updatedCard.imageUrl, imageUrlSmall: updatedCard.imageUrlSmall }
        : c
    ));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/decks/${id}`, {
        name: deck.name,
        cards: deckCards.map(({ scryfallId, name, imageUrl, imageUrlSmall, manaCost, typeLine, oracleText, isCommander }) => ({
          scryfallId, name, imageUrl, imageUrlSmall, manaCost, typeLine, oracleText, isCommander,
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || data?.errors?.[0]?.msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (deckCards.length === 0) { setError('Añade cartas al mazo antes de exportar'); return; }
    setExportingPdf(true);
    try {
      // Exportamos el estado actual en memoria (no el guardado en BD)
      // para que el PDF refleje siempre las cartas que el usuario ve en pantalla
      const response = await api.post(
        '/api/decks/guest/export',
        {
          cards: deckCards.map(({ scryfallId, name, imageUrl }) => ({
            scryfallId, name, imageUrl,
          })),
        },
        { responseType: 'blob' }
      );
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${deck?.name ?? 'mazo'}.pdf`);
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
      <main className="max-w-screen-2xl mx-auto px-4 py-6">

        {/* Cabecera */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{deck?.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {deckCards.length}/100 cartas
              {commander && <span className="text-amber-400 ml-2">· Comandante: {commander.name}</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={handleSave} disabled={saving}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
            </button>
            <button onClick={handleExportPdf} disabled={exportingPdf || deckCards.length === 0}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {exportingPdf ? 'Generando…' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-base">
            {error}
          </div>
        )}

        {/* Layout principal: 2 columnas normales, 3 si isPremium */}
        <div className={`grid grid-cols-1 gap-6 ${isPremium ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>

          {/* Columna 1 — Buscador */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Buscar cartas</h2>
            <CardSearch onAddCard={handleAddCard} deckCards={deckCards} />
          </div>

          {/* Columna 2 — Lista del mazo */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex flex-col">
            <h2 className="text-white font-semibold mb-4">
              Mazo ({deckCards.length}/100)
            </h2>
            {deckCards.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 py-16">
                <p>Busca cartas y añádelas aquí</p>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto flex-1" style={{ maxHeight: '620px' }}>
                {deckCards.map(card => (
                  <div key={card.scryfallId}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      card.isCommander ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700 bg-gray-800'
                    }`}
                  >
                    {/* Miniatura clicable */}
                    <button onClick={() => setPreviewCard(card)}
                      className="flex-shrink-0 rounded overflow-hidden hover:ring-2 hover:ring-amber-400 transition-all"
                      title="Previsualizar">
                      {card.imageUrl || card.imageUrlSmall ? (
                        <img src={card.imageUrlSmall || card.imageUrl} alt={card.name} className="w-8 h-11 object-cover" />
                      ) : (
                        <div className="w-8 h-11 bg-gray-700 flex items-center justify-center text-gray-500 text-xs">?</div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{card.name}</p>
                      <p className="text-gray-400 text-xs truncate">{card.typeLine}</p>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      {/* Cambiar arte — disponible para todos los usuarios con cuenta */}
                      {isClient && (
                        <button onClick={() => setArtCard(card)} title="Cambiar edición / arte"
                          className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-400 hover:text-amber-400 transition-colors">
                          🎨
                        </button>
                      )}
                      <button onClick={() => handleSetCommander(card.scryfallId)} title="Marcar como comandante"
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          card.isCommander ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 text-gray-400 hover:text-amber-400'
                        }`}>
                        ★
                      </button>
                      <button onClick={() => handleRemoveCard(card.scryfallId)}
                        className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-400 hover:text-red-400 transition-colors">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna 3 — Estadísticas (solo PREMIUM) */}
          {isPremium && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-white font-semibold">Estadísticas</h2>
                <span className="bg-amber-500 text-gray-900 text-xs font-bold px-1.5 py-0.5 rounded">PRO</span>
              </div>
              <StatsPanel stats={stats} />
            </div>
          )}
        </div>
      </main>

      {/* Modal: previsualizar carta */}
      {previewCard && (
        <DeckCardPreview card={previewCard} onClose={() => setPreviewCard(null)}
          onSelectArt={isClient ? (c) => { setPreviewCard(null); setArtCard(c); } : undefined} />
      )}

      {/* Modal: selector de arte */}
      {artCard && (
        <ArtSelectorModal card={artCard} onConfirm={handleChangeArt} onClose={() => setArtCard(null)} />
      )}
    </div>
  );
}

// ─── Modal previsualización ───────────────────────────────────────────────────
function DeckCardPreview({ card, onClose, onSelectArt }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={`Previsualización de ${card.name}`}>
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-5 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Cerrar"
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl leading-none">✕</button>
        <div className="flex justify-center mb-4">
          {card.imageUrl
            ? <img src={card.imageUrl} alt={card.name} className="rounded-xl w-56 shadow-lg" />
            : <div className="w-56 aspect-[63/88] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 text-sm">Sin imagen</div>
          }
        </div>
        <h3 className="text-white font-bold text-lg">{card.name}</h3>
        {card.manaCost && <p className="text-amber-400 text-sm mt-0.5">{card.manaCost}</p>}
        <p className="text-gray-400 text-sm mt-1">{card.typeLine}</p>
        {card.oracleText && (
          <p className="text-gray-300 text-xs mt-2 leading-relaxed border-t border-gray-700 pt-2">{card.oracleText}</p>
        )}
        {onSelectArt && (
          <button onClick={() => onSelectArt(card)}
            className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm">
            🎨 Cambiar edición / arte
          </button>
        )}
      </div>
    </div>
  );
}
