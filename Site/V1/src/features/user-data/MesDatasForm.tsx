import { type FormEvent, useState } from "react";
import { useUserProfile } from "../../state/UserProfileContext";
import { BulletinPdfImport } from "./BulletinPdfImport";

const NIVEAUX = [
  "2nde",
  "1ère",
  "Terminale",
  "Bac+1",
  "Bac+2",
  "Bac+3",
  "Bac+4",
  "Bac+5",
  "Doctorat",
  "Diplômé (Alumni)",
];

export function MesDatasForm() {
  const { profile, updateProfile, addFavoriteSchool, removeFavoriteSchool, resetProfile } =
    useUserProfile();
  const [favoriInput, setFavoriInput] = useState("");

  const onSubmitFavori = (e: FormEvent) => {
    e.preventDefault();
    addFavoriteSchool(favoriInput);
    setFavoriInput("");
  };

  return (
    <div className="user-data">
      <header className="user-data__head">
        <div>
          <h3>Mes données</h3>
          <p className="user-data__intro">
            Saisis et mets à jour tes informations : elles sont enregistrées sur cet appareil
            (local) et réutilisées dans l&apos;espace privé. Tu peux les modifier à tout moment.
          </p>
        </div>
        <button type="button" className="btn btn-soft btn-sm" onClick={resetProfile}>
          Réinitialiser (données démo)
        </button>
      </header>

      <div className="user-data__grid">
        <section className="user-data__section">
          <h4>Identité</h4>
          <div className="form-grid">
            <label className="field">
              <span>Prénom</span>
              <input
                value={profile.prenom}
                onChange={(e) => updateProfile({ prenom: e.target.value })}
                autoComplete="given-name"
              />
            </label>
            <label className="field">
              <span>Nom</span>
              <input
                value={profile.nom}
                onChange={(e) => updateProfile({ nom: e.target.value })}
                autoComplete="family-name"
              />
            </label>
            <label className="field">
              <span>Âge</span>
              <input
                inputMode="numeric"
                value={profile.age}
                onChange={(e) => updateProfile({ age: e.target.value })}
                placeholder="ex. 17"
              />
            </label>
            <label className="field">
              <span>Date de naissance</span>
              <input
                type="date"
                value={profile.date_naissance}
                onChange={(e) => updateProfile({ date_naissance: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="user-data__section">
          <h4>Scolarité & contact</h4>
          <div className="form-grid">
            <label className="field field--full">
              <span>Niveau scolaire actuel</span>
              <select
                value={profile.niveau_scolaire}
                onChange={(e) => updateProfile({ niveau_scolaire: e.target.value })}
              >
                <option value="">— Choisir —</option>
                {NIVEAUX.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>Établissement actuel</span>
              <input
                value={profile.etablissement_actuel}
                onChange={(e) => updateProfile({ etablissement_actuel: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Ville</span>
              <input
                value={profile.ville}
                onChange={(e) => updateProfile({ ville: e.target.value })}
                autoComplete="address-level2"
              />
            </label>
            <label className="field">
              <span>Téléphone</span>
              <input
                type="tel"
                value={profile.telephone}
                onChange={(e) => updateProfile({ telephone: e.target.value })}
                autoComplete="tel"
              />
            </label>
            <label className="field field--full">
              <span>Email</span>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => updateProfile({ email: e.target.value })}
                autoComplete="email"
              />
            </label>
          </div>
        </section>

        <section className="user-data__section user-data__section--wide">
          <h4>Bulletins</h4>
          <BulletinPdfImport />
          <label className="field field--full">
            <span>Synthèse / notes importantes</span>
            <textarea
              rows={5}
              value={profile.bulletins_synthese}
              onChange={(e) => updateProfile({ bulletins_synthese: e.target.value })}
              placeholder="Moyennes par trimestre, appréciations, matières en renforcement…"
            />
          </label>
          <label className="field field--full">
            <span>Dernier fichier analysé (référence)</span>
            <input
              value={profile.bulletins_fichiers_note}
              onChange={(e) => updateProfile({ bulletins_fichiers_note: e.target.value })}
              placeholder="Rempli automatiquement après import PDF — tu peux éditer"
            />
          </label>
        </section>

        <section className="user-data__section user-data__section--wide">
          <h4>Établissements favoris</h4>
          <form className="favoris-add" onSubmit={onSubmitFavori}>
            <input
              value={favoriInput}
              onChange={(e) => setFavoriInput(e.target.value)}
              placeholder="Nom de l'école ou programme"
            />
            <button type="submit" className="btn btn-primary">
              Ajouter
            </button>
          </form>
          {profile.etablissements_favoris.length === 0 ? (
            <p className="user-data__empty">Aucun favori pour l&apos;instant.</p>
          ) : (
            <ul className="favoris-chips">
              {profile.etablissements_favoris.map((name) => (
                <li key={name}>
                  <span>{name}</span>
                  <button
                    type="button"
                    className="favoris-remove"
                    onClick={() => removeFavoriteSchool(name)}
                    aria-label={`Retirer ${name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
