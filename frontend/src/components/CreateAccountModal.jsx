export default function CreateAccountModal({
  isOpen,
  setIsOpen,
  accountName,
  setAccountName,
  selectedTypes,
  setSelectedTypes,
  accountTypes,
  handleCreateAccount,
}) {
  if (!isOpen) return null;

  const toggleType = (id) => {
    if (selectedTypes.includes(id)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== id));
    } else {
      setSelectedTypes([...selectedTypes, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-(--card-bg-dark) text-(--text-primary-dark) rounded-2xl border border-white/10 shadow-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-xl font-semibold">Créer un compte</h3>

        {/* Nom du compte */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-white/60">Nom du compte</label>
          <input
            type="text"
            placeholder="Nom du compte"
            className="input input-bordered w-full bg-(--background-dark) border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-(--primary-dark) focus:border-(--primary-dark)"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </div>

        {/* Types de compte avec DaisyUI buttons / checkboxes */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-white/60">Types de compte</label>
          <div className="flex flex-wrap gap-2">
            {accountTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleType(t.id)}
                className={`btn btn-sm rounded-full border ${
                  selectedTypes.includes(t.id)
                    ? "bg-linear-to-r from-[#5e72e4] to-[#825ee4] text-white border-transparent"
                    : "bg-(--background-dark) text-white border-white/20"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            className="rounded-xl btn btn-ghost text-white/60 hover:bg-white/5 border border-white/10"
            onClick={() => setIsOpen(false)}
          >
            Annuler
          </button>
          <button
            className="rounded-xl btn bg-linear-to-r from-[#5e72e4] to-[#825ee4] text-white font-semibold hover:from-[#4b5bcf] hover:to-[#6b4bcf]"
            onClick={handleCreateAccount}
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}
