import { useEffect, useState } from "react";
import axios from "axios";

export default function AccountPositions({ accountId }) {
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cashSaving, setCashSaving] = useState({});
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function fetchAccount() {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/accounts/full`);
        const account = res.data.find((a) => a.id === Number(accountId));
        setAccountData(account || null);
        console.log(account);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchAccount();
  }, [accountId]);

  const updateCash = async (typeId, newCash) => {
    setCashSaving((s) => ({ ...s, [typeId]: true }));
    try {
      await axios.put(`${API_URL}/accounts/cash`, {
        account_id: accountId,
        type_id: typeId,
        cash: Number(newCash),
      });
      // Mettre à jour localement
      setAccountData((prev) => {
        const types = prev.types.map((t) =>
          t.id === typeId ? { ...t, cash: Number(newCash) } : t
        );
        return { ...prev, types };
      });
    } catch (err) {
      console.error(err);
    }
    setCashSaving((s) => ({ ...s, [typeId]: false }));
  };

  const formatNumber = (n) =>
    Number(n).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (loading) return <p>Chargement des positions...</p>;
  if (!accountData) return <p>Compte introuvable.</p>;

  return (
    <div className="space-y-6 mt-6 max-w-7xl mx-auto">
      {accountData.types.map((type) => (
        <div
          key={type.id}
          className="rounded-2xl border border-white/10 p-6 bg-(--card-bg-dark) shadow-lg"
        >
          {/* Header */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2 items-center mb-6">
            <h2 className="col-span-3 text-xl font-semibold text-white">
              {type.name}
            </h2>
            <div>
              <p className="text-white text-sm">Investi</p>
              <p className="text-white font-semibold">
                {formatNumber(type.totalInvestedEUR)} €
              </p>
            </div>
            <div>
              <p className="text-white text-sm">+/- valeur</p>
              <p
                className={
                  type.diffValueEUR >= 0
                    ? "text-green-400 font-semibold"
                    : "text-red-400 font-semibold"
                }
              >
                {formatNumber(type.diffValueEUR)} €
              </p>
              <p
                className={
                  type.diffValueEUR >= 0
                    ? "text-green-400 font-semibold text-xs"
                    : "text-red-400 font-semibold text-xs"
                }
              >
                {formatNumber(type.diffPercent)} %
              </p>
            </div>
            <div>
              <p className="text-white text-sm">Valeur totale</p>
              <p className="text-white font-semibold">
                {formatNumber(type.totalValueEUR)} €
              </p>
            </div>
          </div>

          {/* Liquidités */}
          <div className="mb-6">
            <p className="text-white text-sm mb-1">Liquidités</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                value={type.cash ?? ""}
                onChange={(e) => updateCash(type.id, e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white w-40 focus:ring-2 focus:ring-blue-400"
              />
              {cashSaving[type.id] ? (
                <span className="text-blue-400 text-sm">Sauvegarde…</span>
              ) : (
                <span className="text-white/40 text-sm">€</span>
              )}
            </div>
          </div>

          {/* Positions */}
          {!type.positions || type.positions.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune position.</p>
          ) : (
            <div className="space-y-3">
              {type.positions.map((p) => (
                <div
                  key={p.symbol}
                  className="p-4 rounded-xl bg-[#131722] border border-gray-700"
                >
                  <p className="font-semibold text-white text-lg">
                    {p.longName || p.symbol}
                  </p>
                  <p className="text-sm text-white/50 mb-2">{p.symbol}</p>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-2 text-sm text-gray-300 mt-2">
                    {/* Quantité */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <div>
                        <p className="text-white">Quantité</p>
                        <p>{p.quantity}</p>
                      </div>
                    </div>

                    {/* PRU */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <div>
                        <p className="text-white">PRU (€)</p>
                        <p>{formatNumber(p.avgPriceEUR)}</p>
                      </div>
                      {p.currency === "USD" && (
                        <div>
                          <p className="text-white">PRU ($)</p>
                          <p>{formatNumber(p.avgPriceUSD)}</p>
                        </div>
                      )}
                    </div>

                    {/* Actuel */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <div>
                        <p className="text-white">Actuel (€)</p>
                        <p>{formatNumber(p.currentPriceEUR)}</p>
                      </div>
                      {p.currency === "USD" && (
                        <div>
                          <p className="text-white">Actuel ($)</p>
                          <p>{formatNumber(p.currentPriceUSD)}</p>
                        </div>
                      )}
                    </div>

                    {/* Investi */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <div>
                        <p className="text-white">Investi (€)</p>
                        <p>{formatNumber(p.totalCostEUR)}</p>
                      </div>
                      {p.currency === "USD" && (
                        <div>
                          <p className="text-white">Investi ($)</p>
                          <p>{formatNumber(p.totalCostUSD)}</p>
                        </div>
                      )}
                    </div>

                    {/* +/- */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <div>
                        <p className="text-white">+/- (€)</p>
                        <p
                          className={
                            p.diffValueEUR >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {formatNumber(p.diffValueEUR)}
                        </p>
                        <p
                          className={
                            p.diffValueEUR >= 0
                              ? "text-green-400 font-semibold text-xs"
                              : "text-red-400 font-semibold text-xs"
                          }
                        >
                          {(
                            ((p.currentValueEUR - p.totalCostEUR) /
                              p.totalCostEUR) *
                            100
                          ).toFixed(2)}{" "}
                          %
                        </p>
                      </div>
                      {p.currency === "USD" && (
                        <div>
                          <p className="text-white">+/- ($)</p>
                          <p
                            className={
                              p.diffValueUSD >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {formatNumber(p.diffValueUSD)}
                          </p>
                          <p
                            className={
                              p.diffValueUSD >= 0
                                ? "text-green-400 font-semibold text-xs"
                                : "text-red-400 font-semibold text-xs"
                            }
                          >
                            {(
                              ((p.currentValueUSD - p.totalCostUSD) /
                                p.totalCostUSD) *
                              100
                            ).toFixed(2)}{" "}
                            %
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Valeur */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <div>
                        <p className="text-white">Valeur (€)</p>
                        <p>{formatNumber(p.currentValueEUR)}</p>
                      </div>
                      {p.currency === "USD" && (
                        <div>
                          <p className="text-white">Valeur ($)</p>
                          <p>{formatNumber(p.currentValueUSD)}</p>
                        </div>
                      )}
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
