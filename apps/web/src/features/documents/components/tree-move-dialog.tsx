export function TreeMoveDialog({
  itemLabel,
  itemName,
  options,
  onCancel,
  onSelect,
}: {
  itemLabel: string;
  itemName: string;
  options: Array<{ id: string; label: string }>;
  onCancel: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-stone-900">Move {itemLabel}</h3>
        <p className="text-xs text-stone-500 mt-1">
          Choose a new location for “{itemName}”.
        </p>
        <ul className="mt-4 max-h-60 overflow-y-auto space-y-1">
          {options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="w-full text-left rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                onClick={() => onSelect(opt.id)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="h-8 px-3 rounded-md border border-stone-200 text-sm text-stone-600"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
