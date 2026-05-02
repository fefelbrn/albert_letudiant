const RAPPELS_A_VENIR = [
  { titre: "Salon Post-Bac Paris 2026", date: "15 mai 2026", lieu: "Paris" },
  { titre: "Meetup Ambassadeurs Ingénieur", date: "22 mai 2026", lieu: "En ligne" },
];

const RAPPELS_PASSES = [
  { titre: "Salon Orientation Lyon", date: "2 mars 2026", lieu: "Lyon" },
  { titre: "Webinaire HEC x L'Étudiant", date: "16 févr. 2026", lieu: "En ligne" },
];

export function MesRappelsPanel() {
  return (
    <div className="rappels-panel">
      <section className="rappels-section">
        <h3 className="rappels-section__title">À venir</h3>
        <p className="rappels-section__hint">Rappels et inscriptions aux prochains temps forts.</p>
        <ul className="rappels-list">
          {RAPPELS_A_VENIR.map((r) => (
            <li key={r.titre} className="event-card rappel-card rappel-card--upcoming">
              <div>
                <strong>{r.titre}</strong>
                <p className="rappel-meta">{r.lieu}</p>
              </div>
              <span className="rappel-date">{r.date}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rappels-section">
        <h3 className="rappels-section__title">Passés</h3>
        <p className="rappels-section__hint">Historique des salons et sessions auxquels tu as participé.</p>
        <ul className="rappels-list">
          {RAPPELS_PASSES.map((r) => (
            <li key={r.titre} className="event-card rappel-card rappel-card--past">
              <div>
                <strong>{r.titre}</strong>
                <p className="rappel-meta">{r.lieu}</p>
              </div>
              <span className="rappel-date">{r.date}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
