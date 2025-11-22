import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import OrdersPage from "@/pages/OrdersPage";
import Navbar from "@/components/Navbar";
import AccountPage from "./pages/AccountPage";
import { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [accounts, setAccounts] = useState([]);

  const loadAccounts = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/accounts");
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    <BrowserRouter>
      <Navbar accounts={accounts} loadAccounts={loadAccounts} />
      <div className="pt-20">
        {" "}
        {/* padding pour navbar fixe */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route
            path="/account/:id"
            element={<AccountPage reloadAccounts={loadAccounts} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
