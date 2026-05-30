'use client';

export default function CardItem({ card, onAdd, isInDeck, count }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden hover:border-amber-500 transition-colors group">
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
        <button
          onClick={() => onAdd(card)}
          className="w-full mt-3 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-900 text-xs font-semibold py-1.5 rounded-lg transition-colors"
        >
          + Añadir al mazo
        </button>
      </div>
    </div>
  );
}
