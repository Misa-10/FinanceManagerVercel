import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AccountPositions from "@/components/AccountPositions"; // <-- notre nouveau composant

export default function AccountPage({ reloadAccounts }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function fetchAccount() {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/accounts/${id}`);
        setAccount(res.data);
      } catch (err) {
        console.error(err);
        setAccount(null);
      } finally {
        setLoading(false);
      }
    }
    fetchAccount();
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("Voulez-vous vraiment supprimer ce compte ?")) return;
    try {
      await axios.delete(`${API_URL}/accounts/${id}`);
      if (reloadAccounts) reloadAccounts();
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Impossible de supprimer le compte.");
    }
  }

  if (loading) return <p className="p-8 text-white">Chargement...</p>;
  if (!account) return <p className="p-8 text-white">Compte introuvable</p>;

  return (
    <div className="min-h-screen bg-(--background-dark) text-(--text-primary-dark) pl-0 md:pl-64">
      {/* Topbar */}
      <div className="sticky top-0 z-0 backdrop-blur bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Compte: {account.name}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* AccountPositions */}
        <AccountPositions accountId={id} accountTypes={account.types || []} />

        {/* Bouton supprimer */}
        <div className="flex justify-end">
          <button
            className="px-4 py-2 rounded-xl bg-red-600/70 text-white font-semibold hover:bg-red-600 transition"
            onClick={handleDelete}
          >
            Supprimer le compte
          </button>
        </div>
      </div>
    </div>
  );
}
