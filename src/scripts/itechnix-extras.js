// Parcours d'une demande de devis (ItechnixExtras.astro).
//
// Démonstration : rien n'est envoyé. Au clic sur « Envoyer », les étapes
// réelles du parcours s'affichent une à une : la recherche Google, la
// campagne du métier, la page d'arrivée, l'envoi du formulaire, la page
// de remerciement qui déclenche la conversion (Google Tag Manager →
// Google Ads), puis la réception de la demande.

const STEP_DELAY = 650; // ms entre deux étapes

const COLORS = {
  google: "#1f6fd6",
  site: "#1d2733",
  form: "#e5482f",
  conversion: "#e5482f",
  team: "#5e7a4e",
  whatsapp: "#25d366",
};

function formSteps({ service, campaign, forfait, description }) {
  const lower = service.toLowerCase();
  const steps = [
    campaign
      ? {
          tag: "Google Ads",
          color: COLORS.google,
          title: `Une recherche, une annonce « ${service} »`,
          text: `Le visiteur cherche un professionnel à Bruxelles. L'annonce de la campagne ${service} (Bruxelles + 15 km) s'affiche dans les résultats.`,
        }
      : {
          tag: "Google",
          color: COLORS.google,
          title: "Une recherche sur Google",
          text: "Le visiteur trouve le site grâce au référencement naturel : titres, textes et pages pensés autour des recherches locales.",
        },
    {
      tag: "Page d'arrivée",
      color: COLORS.site,
      title: campaign ? `Il arrive sur la page ${service}` : "Il arrive sur le site",
      text: campaign
        ? `Pas sur l'accueil : directement sur la page du métier qu'il cherchait, avec ses prestations et son formulaire de devis.`
        : "Les métiers sont visibles dès l'accueil, et le bouton « Demander un devis » reste à portée.",
    },
    {
      tag: "Formulaire",
      color: COLORS.form,
      title: "Il envoie sa demande",
      text: `Service : ${service}. Forfait à prix fixe : ${forfait}. ${description ? "Avec une description du projet." : "Sans description : le champ est facultatif."} Un reCAPTCHA écarte les robots.`,
    },
    {
      tag: "Conversion",
      color: COLORS.conversion,
      title: "La page de remerciement compte la conversion",
      text: `En arrivant sur la page de remerciement, Google Tag Manager signale la conversion à Google Ads${campaign ? ` : la campagne ${lower} sait quelles recherches amènent de vrais devis` : ""}.`,
    },
    {
      tag: "Itechnix",
      color: COLORS.team,
      title: "La demande arrive chez Itechnix",
      text: "L'équipe reçoit le métier, l'option forfait et la description : elle peut rappeler avec les bonnes informations.",
    },
  ];
  return steps;
}

function whatsappSteps({ service }) {
  return [
    {
      tag: "Site",
      color: COLORS.site,
      title: "Il préfère écrire",
      text: "La bulle WhatsApp est visible sur toutes les pages, en bas de l'écran.",
    },
    {
      tag: "WhatsApp",
      color: COLORS.whatsapp,
      title: "La conversation s'ouvre",
      text: `Un clic suffit : WhatsApp s'ouvre sur le téléphone ou l'ordinateur, prêt pour un message sur son projet (${service.toLowerCase()}), avec des photos s'il le faut.`,
    },
    {
      tag: "Itechnix",
      color: COLORS.team,
      title: "L'équipe répond directement",
      text: "Pas de formulaire : un échange simple, comme avec un artisan qu'on connaît déjà.",
    },
  ];
}

export function initItechnixFlow() {
  document.querySelectorAll("[data-itx-flow]").forEach((root) => {
    if (root.dataset.flowReady) return;
    root.dataset.flowReady = "true";

    const form = root.querySelector("[data-flow-form]");
    const list = root.querySelector("[data-flow-list]");
    const title = root.querySelector("[data-flow-title]");
    const reset = root.querySelector("[data-flow-reset]");
    const idle = list.innerHTML;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timers = [];

    // Groupes de choix (comportement de boutons radio)
    const radioGroup = (selector) => {
      const buttons = Array.from(root.querySelectorAll(selector));
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          if (form.classList.contains("is-sent")) return;
          buttons.forEach((b) => b.setAttribute("aria-checked", String(b === button)));
        });
      });
      return () => buttons.find((b) => b.getAttribute("aria-checked") === "true");
    };
    const currentService = radioGroup("[data-flow-service]");
    const currentForfait = radioGroup("[data-flow-forfait]");

    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    const render = (steps) => {
      clear();
      list.replaceChildren();
      steps.forEach((step, index) => {
        const add = () => {
          const li = document.createElement("li");
          li.className = "flow-step";
          li.style.setProperty("--step", step.color);
          const dot = document.createElement("span");
          dot.className = "flow-step-dot";
          const body = document.createElement("div");
          const tag = document.createElement("span");
          tag.className = "flow-step-tag";
          tag.textContent = `${String(index + 1).padStart(2, "0")} · ${step.tag}`;
          const strong = document.createElement("strong");
          strong.textContent = step.title;
          const p = document.createElement("p");
          p.textContent = step.text;
          body.append(tag, strong, p);
          li.append(dot, body);
          list.append(li);
        };
        if (reduced) add();
        else timers.push(setTimeout(add, index * STEP_DELAY));
      });
    };

    const send = (channel) => {
      const serviceButton = currentService();
      const data = {
        service: serviceButton?.dataset.label || "Chauffage",
        campaign: serviceButton?.dataset.campaign === "true",
        forfait: currentForfait()?.dataset.flowForfait === "oui" ? "oui" : "non",
        description: (root.querySelector("[data-flow-description]")?.value || "").trim(),
      };
      form.classList.add("is-sent");
      reset.hidden = false;
      title.textContent = channel === "whatsapp" ? "Le parcours · WhatsApp" : "Le parcours · formulaire";
      render(channel === "whatsapp" ? whatsappSteps(data) : formSteps(data));
    };

    root.querySelectorAll("[data-flow-send]").forEach((button) => {
      button.addEventListener("click", () => send(button.dataset.flowSend));
    });

    reset.addEventListener("click", () => {
      clear();
      form.classList.remove("is-sent");
      reset.hidden = true;
      title.textContent = "Le parcours";
      list.innerHTML = idle;
    });
  });
}