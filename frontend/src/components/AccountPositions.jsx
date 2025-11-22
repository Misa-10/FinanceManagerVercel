import { useEffect, useState } from "react";
import axios from "axios";

export default function AccountPositions({ accountId, accountTypes }) {
  const [positionsByType, setPositionsByType] = useState({});
  const [typeTotals, setTypeTotals] = useState({});
  const [loading, setLoading] = useState(true);

  const [cashValues, setCashValues] = useState({});
  const [cashSaving, setCashSaving] = useState({});

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function fetchPositions() {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/accounts/full`);
        const accounts = res.data || [];
        const account = accounts.find((a) => a.id === Number(accountId));

        if (!account) {
          setPositionsByType({});
          setTypeTotals({});
          setCashValues({});
          setLoading(false);
          return;
        }

        const positionsResult = {};
        const totalsResult = {};
        const cashResult = {};

        account.types.forEach((type) => {
          // Positions
          const positions = (type.positions || []).map((p) => {
            const diffValue = p.currentValue - p.totalCost;
            const diffPercent =
              p.totalCost > 0 ? (diffValue / p.totalCost) * 100 : 0;
            return { ...p, diffValue, diffPercent };
          });

          positionsResult[type.id] = positions;
          cashResult[type.id] = type.cash ?? 0;

          // Calculs totaux
          const invested = positions.reduce((sum, p) => sum + p.totalCost, 0);
          const positionsValue = positions.reduce(
            (sum, p) => sum + p.currentValue,
            0
          );

          const totalValue = type.cash + positionsValue;
          const diffValue = totalValue - (invested + type.cash);
          const diffPercent =
            invested + type.cash > 0
              ? (diffValue / (invested + type.cash)) * 100
              : 0;

          totalsResult[type.id] = {
            invested,
            positionsValue,
            totalValue,
            diffValue,
            diffPercent,
            cash: type.cash ?? 0,
          };
        });

        setCashValues(cashResult);
        setPositionsByType(positionsResult);
        setTypeTotals(totalsResult);
      } catch (err) {
        console.error("Erreur positions:", err);
      }

      setLoading(false);
    }

    fetchPositions();
  }, [accountId, accountTypes]);

  const updateCash = async (typeId, newCash) => {
    setCashSaving((s) => ({ ...s, [typeId]: true }));

    try {
      await axios.put(`${API_URL}/accounts/cash`, {
        account_id: Number(accountId),
        type_id: Number(typeId),
        cash: Number(newCash || 0),
      });

      setTypeTotals((prev) => {
        const t = prev[typeId];
        const positionsValue = t.positionsValue;

        const totalValue = positionsValue + Number(newCash);
        const invested = t.invested;

        const diffValue = totalValue - (invested + Number(newCash));
        const diffPercent =
          invested + Number(newCash) > 0
            ? (diffValue / (invested + Number(newCash))) * 100
            : 0;

        return {
          ...prev,
          [typeId]: {
            ...t,
            cash: Number(newCash),
            totalValue,
            diffValue,
            diffPercent,
          },
        };
      });
    } catch (err) {
      console.error("Erreur mise à jour liquidités:", err);
    }

    setCashSaving((s) => ({ ...s, [typeId]: false }));
  };

  const formatNumber = (n) => {
    return Number(n).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return <p className="text-gray-400 text-sm">Chargement des positions...</p>;
  }

  return (
    <div className="space-y-6 mt-6 max-w-7xl mx-auto">
      {accountTypes.map((type) => (
        <div
          key={type.id}
          className="rounded-2xl border border-white/10 p-6 bg-(--card-bg-dark) shadow-lg"
        >
          {/* Header */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2 items-center mb-6">
            <h2 className="col-span-3 text-xl font-semibold text-white">
              {type.name}
            </h2>

            {/* Investi */}
            <div>
              <p className="text-white text-sm">Investi</p>
              <p className="text-white font-semibold">
                {formatNumber(typeTotals[type.id]?.invested || 0)} €
              </p>
            </div>

            {/* Diff */}
            <div>
              <p className="text-white text-sm">+/- valeur</p>
              <p
                className={
                  typeTotals[type.id]?.diffValue >= 0
                    ? "text-green-400 font-semibold"
                    : "text-red-400 font-semibold"
                }
              >
                {formatNumber(typeTotals[type.id]?.diffValue || 0)} €
              </p>
              <p
                className={
                  typeTotals[type.id]?.diffValue >= 0
                    ? "text-green-400 font-semibold text-xs"
                    : "text-red-400 font-semibold text-xs"
                }
              >
                {formatNumber(typeTotals[type.id]?.diffPercent || 0)} %
              </p>
            </div>

            {/* Valeur totale */}
            <div>
              <p className="text-white text-sm">Valeur</p>
              <p className="text-white font-semibold">
                {formatNumber(typeTotals[type.id]?.totalValue || 0)} €
              </p>
            </div>
          </div>

          {/* LIQUIDITÉS */}
          <div className="mb-6">
            <p className="text-white text-sm mb-1">Liquidités</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                value={cashValues[type.id] ?? ""} // ✅ laisse l'input vide si vide
                onChange={(e) =>
                  setCashValues((prev) => ({
                    ...prev,
                    [type.id]: e.target.value === "" ? "" : e.target.value, // ✅ autorise le vide
                  }))
                }
                onBlur={(e) => updateCash(type.id, e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white w-40 focus:ring-2 focus:ring-blue-400"
              />

              {cashSaving[type.id] ? (
                <span className="text-blue-400 text-sm">Sauvegarde…</span>
              ) : (
                <span className="text-white/40 text-sm">€</span>
              )}
            </div>
          </div>

          {/* POSITIONS */}
          {!positionsByType[type.id] ||
          positionsByType[type.id].length === 0 ? (
            <p className="text-gray-500 text-sm">
              Aucune position pour ce type.
            </p>
          ) : (
            <div className="space-y-3">
              {positionsByType[type.id].map((p) => (
                <div
                  key={p.symbol}
                  className="p-4 rounded-xl bg-[#131722] border border-gray-700"
                >
                  <p className="font-semibold text-white text-lg">
                    {p.longName || p.symbol}
                  </p>
                  <p className="text-sm text-white/50 mb-2">{p.symbol}</p>

                  <div className="grid grid-cols-3 md:grid-cols-7 gap-2 text-sm text-gray-300 mt-2">
                    <div>
                      <p className="text-white">Quantité</p>
                      <p>{p.quantity}</p>
                    </div>

                    <div>
                      <p className="text-white">PRU</p>
                      <p>{formatNumber(p.avgPrice)} €</p>
                    </div>

                    <div>
                      <p className="text-white">Actuel</p>
                      <p>{formatNumber(p.currentPrice)} €</p>
                    </div>

                    <div>
                      <p className="text-white">Investi</p>
                      <p>{formatNumber(p.totalCost)} €</p>
                    </div>

                    <div>
                      <p className="text-white">+/- valeur</p>
                      <div
                        className={
                          p.diffValue >= 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        <p className="font-semibold">
                          {formatNumber(p.diffValue)} €
                        </p>
                        <p className="text-xs opacity-80">
                          {formatNumber(p.diffPercent)} %
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-white">Valeur</p>
                      <p>{formatNumber(p.currentValue)} €</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
