"use client";
import { useEffect, useState } from "react";
import AdminDashboard from "../general_components/otros_componentes/landings/admin/AdminDashboard";
import MainDashboard from "../general_components/otros_componentes/landings/main/MainDashboard";

const DashboardRedirector = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const payload = JSON.parse(localStorage.getItem("userPayload") || "{}");
      const roles = payload?.["cognito:groups"] || [];
      setIsAdmin(Array.isArray(roles) && roles.includes("admin"));
    } catch (e) {
      console.error("Error leyendo payload del usuario:", e);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <p className="text-center mt-8">Cargando...</p>;
  }

  return isAdmin ? <AdminDashboard /> : <MainDashboard />;
};

export default DashboardRedirector;
