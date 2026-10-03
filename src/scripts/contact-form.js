// Formulaire de contact adaptatif : le visiteur choisit d'abord son
// besoin (nouveau site / refonte / campagne), ce qui détermine quels
// champs apparaissent et comment la question qualitative est formulée.
// C'est un audit QUALITATIF et SANS ENGAGEMENT, pas un scanner
// technique : on pose une question ouverte adaptée au besoin, on ne
// demande rien de chiffré ni d'obligatoire au-delà de nom + email.
//
// Le détail fin des champs par option (ce qui doit changer réellement
// entre "nouveau site", "refonte" et "campagne") reste à affiner — ceci
// pose la structure et le comportement, pas le contenu final des 3
// parcours.

const QUESTION_LABELS = {
  "nouveau-site":
    "Décrivez en quelques mots ce que ce site doit accomplir pour vous.",
  refonte: "Qu'est-ce qui ne fonctionne plus avec le site actuel ?",
  campagne:
    "Qu'est-ce que vous cherchez à obtenir avec cette campagne (visibilité, ventes, leads...) ?",
};

// Le champ "lien du site actuel" n'a de sens que si un site existe déjà.
const URL_FIELD_PATHS = new Set(["refonte", "campagne"]);

export function initContactForm() {
  const section = document.querySelector("[data-contact-path]");
  if (!section) return; // pas la page contact

  const options = Array.from(
    section.querySelectorAll(".contact-path-option")
  );
  const form = section.querySelector("[data-contact-form]");
  const pathInput = form?.querySelector('input[name="type_projet"]');
  const questionLabel = form?.querySelector("#contact-question-label");
  const urlField = form?.querySelector('[data-field="url"]');
  const status = form?.querySelector(".contact-path-status");

  if (!form) return;

  options.forEach((button) => {
    button.addEventListener("click", () => {
      const path = button.dataset.path;

      options.forEach((b) => {
        const selected = b === button;
        b.classList.toggle("is-selected", selected);
        b.setAttribute("aria-pressed", String(selected));
      });

      if (pathInput) pathInput.value = path;
      if (questionLabel) questionLabel.textContent = QUESTION_LABELS[path] ?? "";
      if (urlField) urlField.hidden = !URL_FIELD_PATHS.has(path);

      if (form.hidden) {
        form.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      form.querySelector("#contact-nom")?.focus();
      if (status) status.textContent = "";
    });
  });

  // Pas encore de service d'envoi branché (Resend, Formspree...) : on
  // valide juste que le formulaire est utilisable et on affiche un
  // accusé de réception. À remplacer par un vrai fetch() vers le
  // service choisi avant mise en ligne — ne pas laisser ce
  // comportement en production, le visiteur croirait avoir été
  // recontacté alors que rien n'est parti.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!status) return;
    status.textContent =
      "Formulaire pas encore branché à un service d'envoi — étape suivante avant mise en ligne.";
  });
}