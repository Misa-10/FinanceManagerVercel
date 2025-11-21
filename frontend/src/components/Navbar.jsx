import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import CreateAccountModal from "./CreateAccountModal";

export default function Navbar({ accounts, loadAccounts }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [accountName, setAccountName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);

  async function handleCreateAccount() {
    if (!accountName || selectedTypes.length === 0) return;
    try {
      await axios.post("http://localhost:8000/api/accounts", {
        name: accountName,
        account_type_ids: selectedTypes,
      });
      setIsOpen(false);
      setAccountName("");
      setSelectedTypes([]);
      loadAccounts();
    } catch (err) {
      console.error("Erreur création compte:", err);
    }
  }

  async function openModal() {
    try {
      const res = await axios.get("http://localhost:8000/api/accounts/types");
      setAccountTypes(res.data || []);
    } catch (err) {
      console.error("Erreur chargement types:", err);
    }
    setIsOpen(true);
  }

  return (
    <>
      {/* Barre latérale style “dashboard” */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-(--sidebar-bg-dark) border-r border-white/10 px-4 py-6 flex-col gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-semibold px-3 py-2 rounded-xl hover:bg-white/5 transition"
        >
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg 
                 bg-linear-to-r from-[#5e72e4] to-[#825ee4] 
                 text-white font-bold"
          >
            FM
          </span>
          FinanceManager
        </Link>

        <nav className="mt-2 flex-1 space-y-1">
          <Link
            to="/orders"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition"
          >
            <span>📄</span> Ordres
          </Link>

          <div className="mt-4 px-3 text-xs uppercase tracking-wide text-white/40">
            Comptes
          </div>
          <div className="mt-1 space-y-1">
            {accounts.map((acc) => (
              <Link
                key={acc.id}
                to={`/account/${acc.id}`}
                className="block px-3 py-2 rounded-xl bg-white/0 hover:bg-white/5 text-white/80 hover:text-white border border-transparent hover:border-white/10 transition"
              >
                {acc.name}
              </Link>
            ))}
          </div>

          <button
            className="mt-3 w-full btn btn-sm btn-gradient"
            onClick={openModal}
          >
            + Créer un compte
          </button>
        </nav>

        <div className="px-3 text-xs text-white/40">
          © {new Date().getFullYear()} FinanceManager
        </div>
      </aside>

      {/* Topbar mobile */}
      <div className="md:hidden navbar bg-(--background-dark)/80 backdrop-blur border-b border-white/10 px-4">
        <div className="flex-1">
          <Link to="/" className="text-lg font-semibold">
            FinanceManager
          </Link>
        </div>
        <button
          className="btn btn-ghost btn-square"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 z-50 mx-3 rounded-2xl bg-(--card-bg-dark) border border-white/10 p-2 shadow-xl">
          <Link
            to="/"
            className="btn btn-ghost w-full justify-start"
            onClick={() => setMenuOpen(false)}
          >
            Accueil
          </Link>
          <Link
            to="/orders"
            className="btn btn-ghost w-full justify-start"
            onClick={() => setMenuOpen(false)}
          >
            Ordres
          </Link>
          <div className="divider my-2" />
          {accounts.map((acc) => (
            <Link
              key={acc.id}
              to={`/account/${acc.id}`}
              className="btn btn-ghost w-full justify-start"
              onClick={() => setMenuOpen(false)}
            >
              {acc.name}
            </Link>
          ))}
          <button
            className="btn btn-primary w-full mt-2"
            onClick={() => {
              setMenuOpen(false);
              openModal();
            }}
          >
            + Créer un compte
          </button>
        </div>
      )}

      {/* Modal de création (inchangé côté logique, stylé dark) */}
      <CreateAccountModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        accountName={accountName}
        setAccountName={setAccountName}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        accountTypes={accountTypes}
        handleCreateAccount={handleCreateAccount}
      />
    </>
  );
}
