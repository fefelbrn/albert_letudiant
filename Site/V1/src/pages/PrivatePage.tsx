import { useState } from "react";
import { CandidateProfileDashboard } from "../features/candidate-profile/CandidateProfileDashboard";
import { MesRappelsPanel } from "../features/rappels/MesRappelsPanel";
import { MesDatasForm } from "../features/user-data/MesDatasForm";
import { useAuth } from "../state/AuthContext";

const tabs = [
  { key: "rappels", label: "Mes rappels" },
  { key: "profil", label: "Mon profil candidat" },
  { key: "datas", label: "Mes datas" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function PrivatePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("rappels");
  const { logout } = useAuth();

  return (
    <main className="container section">
      <section className="private-head">
        <div>
          <h2>Espace prive</h2>
          <p>
            Rappels, profil candidat et données : tout est centralisé ici. Modifie tes infos dans
            l&apos;onglet Mes datas.
          </p>
        </div>
        <button type="button" className="btn btn-soft" onClick={logout}>
          Se deconnecter
        </button>
      </section>

      <section className="tabs-row">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className="tab-panel">
        {activeTab === "rappels" && <MesRappelsPanel />}

        {activeTab === "profil" && <CandidateProfileDashboard />}

        {activeTab === "datas" && <MesDatasForm />}
      </section>
    </main>
  );
}
