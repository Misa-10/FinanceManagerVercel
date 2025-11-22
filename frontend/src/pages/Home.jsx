import { useEffect, useState } from "react";
import axios from "axios";
import Papa from "papaparse"; // <- ajouté pour le CSV
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

import { Card, EmptyState, Skeleton } from "@/components/HomeCards";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

const COLORS = [
  "#5e72e4",
  "#825ee4",
  "#60A5FA",
  "#F59E0B",
  "#F87171",
  "#FBBF24",
];

export default function Home() {
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportInfo, setShowImportInfo] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function load() {
      try {
        const [accountsRes, historyRes] = await Promise.all([
          axios.get(`${API_URL}/accounts/full`),
          axios.get(`${API_URL}/portfolio/history`),
        ]);

        const accountsData = accountsRes.data || [];

        const accountsWithTotals = accountsData.map((account) => {
          const totalValue =
            account.types?.reduce((acc, t) => acc + (t.totalValue || 0), 0) ||
            0;
          return { ...account, totalValue };
        });

        setAccounts(accountsWithTotals);
        setHistory(historyRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const totalValue = accounts.reduce((acc, a) => acc + (a.totalValue || 0), 0);

  const totalInvested = accounts.reduce(
    (acc, a) =>
      acc +
      (a.types?.reduce(
        (tAcc, t) =>
          tAcc +
          (t.positions?.reduce((pAcc, p) => pAcc + (p.totalCost || 0), 0) || 0),
        0
      ) || 0),
    0
  );

  const totalCash = accounts.reduce(
    (acc, a) =>
      acc + (a.types?.reduce((tAcc, t) => tAcc + (t.cash || 0), 0) || 0),
    0
  );

  const totalDiff = totalValue - totalInvested - totalCash;
  const totalPercent = totalInvested ? (totalDiff / totalInvested) * 100 : 0;

  const globalPieData = {
    labels: accounts.map((a) => a.name),
    datasets: [
      {
        data: accounts.map((a) => a.totalValue || 0),
        backgroundColor: COLORS,
        borderColor: "#0f172a",
        borderWidth: 2,
      },
    ],
  };

  const lineData = {
    labels: history.map((h) => h.date),
    datasets: [
      {
        label: "Valeur globale (€)",
        data: history.map((h) => h.total_value || 0),
        fill: false,
        borderColor: "#5e72e4",
        tension: 0.2,
      },
      {
        label: "Plus-value positions (€)",
        data: history.map((h) => {
          const invested =
            h.types?.reduce(
              (iAcc, t) =>
                iAcc +
                (t.positions?.reduce(
                  (pAcc, p) => pAcc + (p.totalCost || 0),
                  0
                ) || 0),
              0
            ) || 0;
          const cash =
            h.types?.reduce((cAcc, t) => cAcc + (t.cash || 0), 0) || 0;
          const total = h.totalValue || 0;
          return total - invested - cash;
        }),
        fill: false,
        borderColor: "#f59e0b",
        tension: 0.2,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: { legend: { display: false } },

    scales: {
      x: {
        offset: true, // ajoute de l’espace avant/après la ligne
        ticks: {
          maxRotation: 0, // évite l’écrasement des labels
          minRotation: 0,
          autoSkip: true,
          autoSkipPadding: 20, // espace entre labels
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "right",
        align: "center",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 14,
          padding: 10,
          color: "#ffffff",
          font: { size: 14, weight: "500" },
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context) {
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((sum, v) => sum + v, 0);
            const percent = total ? (value / total) * 100 : 0;
            return `${context.label} : ${formatNumber(
              value
            )} € (${percent.toFixed(1)} %)`;
          },
        },
      },
    },
  };

  const formatNumber = (n) =>
    n.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ---------------------------------------
  // Gestion import CSV portfolio_history
  // ---------------------------------------

  function normalizeNumber(input) {
    if (!input) return 0;
    return parseFloat(
      String(input)
        .replace(/\s/g, "") // retire espaces normales et insécables
        .replace("€", "")
        .replace(",", ".")
    );
  }

  function normalizeDate(dateStr) {
    if (!dateStr) return null;

    // Retirer l'heure si présente
    const [dateOnly] = dateStr.trim().split(" ");

    // Si format ISO, on le renvoie tel quel
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }

    // Si format FR JJ/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateOnly)) {
      const [d, m, y] = dateOnly.split("/");
      return `${y}-${m}-${d}`;
    }

    // Dernier recours: tentative parse automatique
    const d = new Date(dateOnly);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }

    return null;
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const API_URL = import.meta.env.VITE_API_URL;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const cleanData = results.data.map(([rawDate, rawValue]) => {
            const date = normalizeDate(rawDate);
            const value = normalizeNumber(rawValue);

            return { date, total_value: value };
          });

          const csvData = Papa.unparse(cleanData);

          await axios.post(`${API_URL}/portfolio/import`, {
            csv: csvData,
          });

          alert("Import CSV réussi !");

          const historyRes = await axios.get(
            `${API_URL}/portfolio/history`
          );
          setHistory(historyRes.data || []);
        } catch (err) {
          console.error("Erreur import CSV portfolio_history:", err);
          alert("Erreur lors de l'import CSV");
        }
      },
      error: (err) => {
        console.error("Erreur lecture CSV:", err);
        alert("Erreur lecture du fichier CSV");
      },
    });
  };

  return (
    <div className="min-h-screen bg-(--background-dark) text-(--text-primary-dark) pl-0 md:pl-64">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur bg-black/20 border-b border-white/10 flex justify-between items-center px-6 py-4">
        {" "}
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
        {/* Boutons Import */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportInfo(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur border border-white/10 shadow-sm"
            title="Informations sur l'import CSV"
          >
            <i className="lni lni-information text-xl"></i>
          </button>

          <label className="cursor-pointer px-3 py-2 rounded-xl bg-linear-to-r from-[#5e72e4] to-[#825ee4] hover:from-[#4b5bcf] hover:to-[#6b4bcf] text-white font-semibold flex items-center gap-2 shadow-md transition">
            <i className="lni lni-upload text-lg"></i>
            Import
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
      {/* Modal info */}
      {showImportInfo && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-(--card-bg-dark)/90 backdrop-blur rounded-2xl border border-white/10 shadow-lg p-6 max-w-lg w-full space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Comment importer un CSV
            </h2>
            <p className="text-white/80 text-sm">
              Assurez-vous que les colonnes sont dans l’ordre suivant :
            </p>
            <ul className="list-disc list-inside text-white/70 text-sm">
              <li>Date (format : AAAA-MM-JJ)</li>
              <li>Valeur totale (total_value)</li>
            </ul>
            <p className="text-white/60 text-xs">
              Les données invalides ou les lignes vides seront ignorées. Les
              valeurs numériques doivent être au format français ou avec un
              point comme séparateur décimal.
            </p>
            <button
              className="mt-2 w-full rounded-xl bg-linear-to-r from-[#5e72e4] to-[#825ee4] text-white font-semibold hover:from-[#4b5bcf] hover:to-[#6b4bcf] py-2"
              onClick={() => setShowImportInfo(false)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
      {/* Reste de ta page : evolution + graphiques + comptes */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Evolution */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Évolution de la valeur globale
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-800 rounded-md flex flex-col items-center">
              <span className="text-sm text-gray-400">Valeur totale</span>
              <span className="text-xl font-semibold text-white">
                {formatNumber(totalValue)} €
              </span>
            </div>
            <div className="p-4 bg-gray-800 rounded-md flex flex-col items-center">
              <span className="text-sm text-gray-400">Plus-value</span>
              <span
                className={`text-xl font-semibold ${
                  totalDiff >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {formatNumber(totalDiff)} €
              </span>
              <span
                className={`text-sm font-semibold ${
                  totalDiff >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {formatNumber(totalPercent)} %
              </span>
            </div>
          </div>

          {loading ? (
            <Skeleton height={200} />
          ) : history.length === 0 ? (
            <EmptyState label="Aucune donnée historique disponible actuellement" />
          ) : (
            <Line data={lineData} options={lineOptions} />
          )}
        </Card>

        {/* Global Pie */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Répartition globale par compte
          </h2>
          {loading ? (
            <Skeleton height={200} />
          ) : totalValue === 0 ? (
            <EmptyState label="Aucune valeur pour le moment" />
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <div className="w-full max-w-[400px]">
                <Pie data={globalPieData} options={pieOptions} />
              </div>
            </div>
          )}
        </Card>

        {/* Liste des comptes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((account) => {
            const total = account.totalValue || 0;

            const invested =
              account.types?.reduce(
                (acc, t) =>
                  acc +
                  (t.positions?.reduce(
                    (pAcc, p) => pAcc + (p.totalCost || 0),
                    0
                  ) || 0),
                0
              ) || 0;

            const cashTotal =
              account.types?.reduce((acc, t) => acc + (t.cash || 0), 0) || 0;

            const diff = total - invested - cashTotal;
            const diffPercent = invested ? (diff / invested) * 100 : 0;
            const globalPercent = totalValue ? (total / totalValue) * 100 : 0;

            return (
              <Card key={account.id}>
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-lg">{account.name}</h3>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valeur totale :</span>
                    <span className="text-white font-semibold">
                      {formatNumber(total)} €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plus-/moins-value :</span>
                    <span
                      className={
                        diff >= 0
                          ? "text-green-400 font-semibold"
                          : "text-red-400 font-semibold"
                      }
                    >
                      {formatNumber(diff)} € ({formatNumber(diffPercent)} %)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Répartition globale :</span>
                    <span className="text-white font-semibold">
                      {formatNumber(globalPercent)} %
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-400">Liquidités :</span>
                    <span className="text-white font-semibold">
                      {formatNumber(cashTotal)} €
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      ;
    </div>
  );
}
