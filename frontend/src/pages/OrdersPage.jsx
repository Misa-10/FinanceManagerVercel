import { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState({
    accountId: "",
    accountTypeId: "",
  });
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("EUR"); // EUR par défaut
  const [orderDate, setOrderDate] = useState("");
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [showImportInfo, setShowImportInfo] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    loadAccounts();
    loadOrders();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/accounts`);
      const formatted = res.data.map((acc) => ({
        ...acc,
        types: acc.types || [],
      }));
      setAccounts(formatted);
    } catch (err) {
      console.error("Erreur chargement comptes:", err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`);
      setOrders(res.data);
    } catch (err) {
      console.error("Erreur chargement ordres:", err);
    }
  };

  const resetForm = () => {
    setSelectedAccount({ accountId: "", accountTypeId: "" });
    setSymbol("");
    setType("buy");
    setQuantity("");
    setPrice("");
    setSelectedCurrency("EUR");
    setOrderDate("");
    setEditingOrderId(null);
  };

  const handleAddOrUpdateOrder = async (e) => {
    e.preventDefault();
    const { accountId, accountTypeId } = selectedAccount;
    if (!accountId || !accountTypeId || !symbol || !quantity || !price) return;

    const payload = {
      account_id: Number(accountId),
      account_type_id: Number(accountTypeId),
      symbol,
      type,
      quantity: Number(quantity),
      price: Number(price),
      date: orderDate ? new Date(orderDate) : new Date(),
      currency: selectedCurrency,
    };

    try {
      if (editingOrderId) {
        await axios.put(`${API_URL}/orders/${editingOrderId}`, payload);
      } else {
        await axios.post(`${API_URL}/orders`, payload);
      }
      loadOrders();
      resetForm();
    } catch (err) {
      console.error("Erreur création/mise à jour ordre:", err);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet ordre ?")) return;
    try {
      await axios.delete(`${API_URL}/orders/${orderId}`);
      loadOrders();
    } catch (err) {
      console.error("Erreur suppression ordre:", err);
    }
  };

  const handleEditOrder = (order) => {
    setSelectedAccount({
      accountId: order.account_id,
      accountTypeId: order.account_type_id,
    });
    setSymbol(order.symbol);
    setType(order.type);
    setQuantity(order.quantity);
    setPrice(order.price);
    setSelectedCurrency(order.currency || "EUR");
    setOrderDate(new Date(order.date).toISOString().slice(0, 16));
    setEditingOrderId(order.id);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async function (results) {
        try {
          const [accountsRes, accountTypesRes] = await Promise.all([
            axios.get(`${API_URL}/accounts`),
            axios.get(`${API_URL}/accounts/types`),
          ]);

          const accounts = accountsRes.data;
          const accountTypes = accountTypesRes.data;

          const normalize = (str) =>
            String(str || "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ");

          const formattedOrders = results.data.map((row) => {
            const symbol = String(row[0]).trim();
            const accountName = String(row[1]).trim();
            const accountTypeName = String(row[2]).trim();
            const orderDate = row[3].split("/").reverse().join("-");
            const quantity = parseFloat(
              String(row[4])
                .replace(",", ".")
                .replace(/[^\d.-]/g, "")
            );
            const price = parseFloat(
              String(row[5])
                .replace(",", ".")
                .replace(/[^\d.-]/g, "")
            );
            const type =
              String(row[6]).toLowerCase() === "sell" ? "sell" : "buy";
            const currency = symbol.includes("USD") ? "USD" : "EUR";

            const account = accounts.find(
              (a) => normalize(a.name) === normalize(accountName)
            );
            const accountType = accountTypes.find(
              (t) => normalize(t.name) === normalize(accountTypeName)
            );

            if (!account) console.warn(`Compte non trouvé : ${accountName}`);
            if (!accountType)
              console.warn(`Type de compte non trouvé : ${accountTypeName}`);

            return {
              account_id: account ? account.id : null,
              account_type_id: accountType ? accountType.id : null,
              symbol,
              type,
              quantity: isNaN(quantity) ? 0 : quantity,
              price: isNaN(price) ? 0 : price,
              date: new Date(orderDate),
              currency,
            };
          });

          const validOrders = formattedOrders.filter(
            (o) => o.account_id && o.account_type_id
          );
          if (validOrders.length === 0) {
            alert("Aucun ordre valide à importer !");
            return;
          }

          await axios.post(`${API_URL}/orders/import`, validOrders);
          alert("Ordres importés avec succès !");
          loadOrders();
        } catch (err) {
          console.error("Erreur import ordres :", err);
          alert("Erreur lors de l'import des ordres");
        }
      },
      error: function (err) {
        console.error("Erreur CSV :", err);
        alert("Erreur lecture du fichier CSV");
      },
    });
  };

  const formatPrice = (num, orderCurrency) => {
    const symbols = { EUR: "€", USD: "$" };
    return `${num.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbols[orderCurrency] || "€"}`;
  };

  const totalInEUR = orders.reduce((sum, order) => sum + order.totalEUR, 0);

  return (
    <div className="min-h-screen bg-(--background-dark) text-(--text-primary-dark) pl-0 md:pl-64 p-6 space-y-8">
      {/* Titre + boutons */}
      <div className="flex justify-between items-center mb-6 relative">
        <h1 className="text-3xl font-bold text-white/90 mx-auto">
          Passer un ordre
        </h1>
        {/* Import CSV et info */}
        {/* Boutons Import CSV + Info */}
        <div className="absolute right-0 top-0 flex items-center gap-3">
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
                <li>Symbole (ex : HLT.PA)</li>
                <li>Nom du compte (ex : Fortuneo)</li>
                <li>Type de compte (ex : PEA)</li>
                <li>Date (format : JJ/MM/AAAA)</li>
                <li>Quantité</li>
                <li>Prix</li>
                <li>Type d’ordre (buy ou sell)</li>
              </ul>
              <button
                className="mt-2 w-full rounded-xl bg-linear-to-r from-[#5e72e4] to-[#825ee4] text-white font-semibold hover:from-[#4b5bcf] hover:to-[#6b4bcf] py-2"
                onClick={() => setShowImportInfo(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire */}
      <div className="max-w-md mx-auto">
        <div className="bg-(--card-bg-dark)/70 backdrop-blur rounded-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25)] p-6 space-y-4">
          <form onSubmit={handleAddOrUpdateOrder} className="space-y-4">
            {/* Sélection compte */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-white/60">Compte</label>
              <select
                className="select w-full bg-(--background-dark) border border-white/10 text-white rounded-xl p-2 focus:ring-2 focus:ring-(--primary-dark)"
                value={`${selectedAccount.accountId}-${selectedAccount.accountTypeId}`}
                onChange={(e) => {
                  const [accountId, accountTypeId] = e.target.value
                    .split("-")
                    .map(Number);
                  setSelectedAccount({ accountId, accountTypeId });
                }}
              >
                <option value="">Sélectionner un compte</option>
                {accounts.map((acc) =>
                  acc.types.map((t) => (
                    <option
                      key={`${acc.id}-${t.id}`}
                      value={`${acc.id}-${t.id}`}
                    >
                      {acc.name} - {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Symbole */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-white/60">
                Symbole (ex: BTC-USD)
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Ex: BTC-USD"
                className="input w-full bg-(--background-dark) border border-white/10 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-(--primary-dark)"
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-white/60">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="select w-full bg-(--background-dark) border border-white/10 text-white rounded-xl p-2 focus:ring-2 focus:ring-(--primary-dark)"
              >
                <option value="buy">Achat</option>
                <option value="sell">Vente</option>
              </select>
            </div>

            {/* Quantité */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-white/60">Quantité</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 0.5"
                className="input w-full bg-(--background-dark) border border-white/10 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-(--primary-dark)"
              />
            </div>

            {/* Prix */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-white/60">Prix</label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 30000"
                className="input w-full bg-(--background-dark) border border-white/10 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-(--primary-dark)"
              />
            </div>

            {/* Devise */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-white/60">Devise</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="select w-full bg-(--background-dark) border border-white/10 text-white rounded-xl p-2 focus:ring-2 focus:ring-(--primary-dark)"
              >
                <option value="EUR">€ - Euro</option>
                <option value="USD">$ - Dollar</option>
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-white/60">Date</label>
              <input
                type="date"
                value={orderDate.slice(0, 10)}
                onChange={(e) => setOrderDate(e.target.value)}
                className="input w-full bg-(--background-dark) border border-white/10 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-(--primary-dark)"
              />
            </div>

            <button className="btn w-full rounded-xl bg-linear-to-r from-[#5e72e4] to-[#825ee4] text-white font-semibold hover:from-[#4b5bcf] hover:to-[#6b4bcf] transition">
              {editingOrderId ? "Mettre à jour l'ordre" : "Ajouter l'ordre"}
            </button>
          </form>
        </div>
      </div>

      {/* Total global */}
      <div className="max-w-4xl mx-auto mt-4 text-white/80 font-semibold">
        Total portefeuille : {formatPrice(totalInEUR, "EUR")}
      </div>

      {/* Liste des ordres */}
      <div className="max-w-6xl mx-auto mt-4">
        {orders.length === 0 ? (
          <p className="text-center text-white/50">
            Aucun ordre pour l'instant.
          </p>
        ) : (
          <div className="space-y-3">
            {/* En-têtes (affichage desktop uniquement) */}
            <div className="hidden md:flex items-center bg-(--card-bg-dark)/80 border border-white/10 rounded-lg p-3 font-semibold text-white/80 text-sm">
              <span className="w-20">Symbole</span>
              <span className="w-20">Qté</span>
              <span className="w-24">Prix (USD)</span>
              <span className="w-24">Prix (€)</span>
              <span className="w-24">Total (€)</span>
              <span className="w-32">Date</span>
              <span className="w-40">Compte</span>
              <span className="w-16">Type</span>
              <span className="w-28 text-center">Actions</span>
            </div>

            {orders
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((order) => (
                <div
                  key={order.id}
                  className="bg-(--card-bg-dark)/70 border border-white/10 rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                >
                  {/* Version desktop */}
                  <div className="hidden md:flex items-center">
                    <span className="w-20 font-semibold text-white">
                      {order.symbol}
                    </span>

                    <span className="w-20 text-white/70">{order.quantity}</span>

                    <span className="w-24 text-white/70">
                      {order.currency === "USD"
                        ? formatPrice(order.price, "USD")
                        : "-"}
                    </span>

                    <span className="w-24 text-white/70">
                      {formatPrice(order.priceEUR, "EUR")}
                    </span>

                    <span className="w-24 text-white/70">
                      {formatPrice(order.totalEUR, "EUR")}
                    </span>

                    <span className="w-32 text-xs text-white/50">
                      {new Date(order.date).toLocaleDateString("fr-FR")}
                    </span>

                    <span className="w-40 text-xs text-white/50 truncate">
                      {order.account_name} - {order.account_type}
                    </span>

                    <span
                      className={`w-16 text-center text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        order.type === "buy"
                          ? "bg-green-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {order.type === "buy" ? "A" : "V"}
                    </span>

                    <div className="w-28 flex gap-2 justify-center">
                      <button
                        className="btn btn-sm rounded-xl bg-[#5e72e4] text-white hover:bg-[#4b5bcf]"
                        onClick={() => handleEditOrder(order)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-sm rounded-xl bg-red-600 text-white hover:bg-red-700"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {/* Version mobile (stack) */}
                  <div className="flex flex-col gap-1 md:hidden text-white/80 text-sm">
                    <div className="flex justify-between">
                      <span className="font-bold">{order.symbol}</span>
                      <span>{order.type === "buy" ? "Achat" : "Vente"}</span>
                    </div>

                    <div>
                      Quantité :{" "}
                      <span className="text-white">{order.quantity}</span>
                    </div>

                    {order.currency === "USD" && (
                      <div>
                        Prix USD :{" "}
                        <span className="text-white">
                          {formatPrice(order.price, "USD")}
                        </span>
                      </div>
                    )}

                    <div>
                      Prix (€) :{" "}
                      <span className="text-white">
                        {formatPrice(order.priceEUR, "EUR")}
                      </span>
                    </div>
                    <div>
                      Total (€) :{" "}
                      <span className="text-white">
                        {formatPrice(order.totalEUR, "EUR")}
                      </span>
                    </div>
                    <div>
                      Date : {new Date(order.date).toLocaleDateString("fr-FR")}
                    </div>
                    <div>Compte : {order.account_name}</div>

                    <div className="flex gap-2 mt-3">
                      <button
                        className="flex-1 py-2 bg-[#5e72e4] rounded-xl text-white font-semibold"
                        onClick={() => handleEditOrder(order)}
                      >
                        Modifier
                      </button>
                      <button
                        className="flex-1 py-2 bg-red-600 rounded-xl text-white font-semibold"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
