'use client';

// onAdd: añade 1 unidad de la carta al mazo
// onRemove: quita 1 unidad (elimina si llega a 0)
// count: cuántas hay ya en el mazo (undefined si no está)
export default function CardItem({ card, onAdd, onRemove, onPreview, onSelectArt, isInDeck, count }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-500 transition-colors group">
      {/* Imagen con overlay de previsualización */}
      <div className="relative aspect-[63/88] bg-gray-800">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm p-4 text-center">
            {card.name}
          </div>
        )}

        {/* Overlay con botón de preview al hacer hover */}
        <button
          onClick={() => onPreview(card)}
          aria-label={`Previsualizar ${card.name}`}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
        >
          <span className="bg-gray-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-600">
            🔍 Ver carta
          </span>
        </button>

        {/* Badge de cantidad en el mazo */}
        {isInDeck && (
          <div className="absolute top-2 right-2 bg-amber-500 text-gray-900 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {count}
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-white text-sm font-medium truncate">{card.name}</p>
        <p className="text-gray-400 text-xs truncate mt-0.5">{card.typeLine}</p>
        {card.legalities?.commander === 'not_legal' && (
          <p className="text-red-400 text-xs mt-1">No legal en Commander</p>
        )}

        <div className="flex gap-1.5 mt-3">
          {/* Botón − solo visible cuando la carta ya está en el mazo */}
          {isInDeck && onRemove && (
            <button
              onClick={() => onRemove(card)}
              aria-label={`Quitar una copia de ${card.name}`}
              className="bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-white text-xs font-bold w-8 py-1.5 rounded-lg transition-colors"
            >
              −
            </button>
          )}

          <button
            onClick={() => onAdd(card)}
            aria-label={`Añadir ${card.name} al mazo`}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs font-semibold py-1.5 rounded-lg transition-colors"
          >
            {isInDeck ? '+ Otra copia' : '+ Añadir'}
          </button>

          {onSelectArt && (
            <button
              onClick={() => onSelectArt(card)}
              title="Elegir edición / arte"
              aria-label={`Elegir edición de ${card.name}`}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs px-2 py-1.5 rounded-lg transition-colors"
            >
              🎨
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
