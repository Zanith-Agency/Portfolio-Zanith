// Contenus interactifs de la page Flexy Rent (FlexyRentExtras.astro) :
// la recherche de l'accueil, la connexion par code et le simulateur de
// réservation. Démonstrations : aucun appel réel n'est fait.
//
// Les appels affichés reprennent ceux du plugin flexyrent-rentsyst.

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const euro = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const pad = (n) => String(n).padStart(2, "0");
const dateFr = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
const addDays = (d, n) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

// Une ligne de journal : un appel (verbe + chemin) et son explication
function logItem({ verb, path, text }) {
  const li = document.createElement("li");
  if (path) {
    const code = document.createElement("code");
    if (verb) {
      const v = document.createElement("span");
      v.className = "verb";
      v.textContent = verb + " ";
      code.append(v);
    }
    code.append(document.createTextNode(path));
    li.append(code, document.createElement("br"));
  }
  li.append(document.createTextNode(text));
  return li;
}

export function initFlexyRentExtras() {
  document.querySelectorAll("[data-flx-search]").forEach(initSearch);
  document.querySelectorAll("[data-flx-login]").forEach(initLogin);
  document.querySelectorAll("[data-flx-sim]").forEach(initSimulator);
}

// ---------------- 01 — La recherche de l'accueil ----------------

function initSearch(root) {
  if (root.dataset.ready) return;
  root.dataset.ready = "true";

  const hero = root.querySelector("[data-flx-hero]");
  const modeButtons = root.querySelectorAll("[data-flx-mode]");
  const dayButtons = root.querySelectorAll("[data-flx-days]");
  const from = root.querySelector("[data-flx-from]");
  const to = root.querySelector("[data-flx-to]");
  const result = root.querySelector("[data-flx-result]");
  const start = addDays(new Date(), 1);
  let mode = "voitures";
  let days = 3;

  const render = () => {
    from.textContent = dateFr(start);
    to.textContent = dateFr(addDays(start, days));
    hero.dataset.flxHero = mode;
    modeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.flxMode === mode)));
    dayButtons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.flxDays) === days)));
  };

  modeButtons.forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.flxMode;
      result.textContent = "";
      render();
    })
  );
  dayButtons.forEach((b) =>
    b.addEventListener("click", () => {
      days = Number(b.dataset.flxDays);
      result.textContent = "";
      render();
    })
  );
  root.querySelector("[data-flx-search-btn]").addEventListener("click", () => {
    result.textContent =
      `Sur le site, les ${mode} libres du ${dateFr(start)} au ${dateFr(addDays(start, days))} ` +
      `s'affichent avec leur prix : la liste vient de RentSyst, en temps réel.`;
  });

  render();
}

// ---------------- 02 — Connexion par code ----------------

const DEMO_CODE = "482913";
const DEMO_CONTACTS = [
  { id: 10421, orders: 1 },
  { id: 10877, orders: 1 },
  { id: 11203, orders: 1 },
];
const DEMO_ORDERS = [
  { vehicle: "Renault Clio", dates: "18 → 21 déc. 2026", total: 135, status: "Réservée", reserved: true },
  { vehicle: "Citroën C3", dates: "8 → 12 oct. 2026", total: 180, status: "Terminée" },
  { vehicle: "Peugeot 208", dates: "5 → 7 sept. 2026", total: 98, status: "Terminée" },
];

function initLogin(root) {
  if (root.dataset.ready) return;
  root.dataset.ready = "true";

  const steps = {
    email: root.querySelector('[data-login-step="email"]'),
    code: root.querySelector('[data-login-step="code"]'),
    history: root.querySelector('[data-login-step="history"]'),
  };
  const log = root.querySelector("[data-login-log]");
  const idle = log.innerHTML;
  const digits = Array.from(root.querySelectorAll("[data-login-digit]"));
  const verify = root.querySelector("[data-login-verify]");
  const merge = root.querySelector("[data-login-merge]");
  const contacts = root.querySelector("[data-login-contacts]");
  const orders = root.querySelector("[data-login-orders]");
  const email = root.querySelector("[data-login-email]").value;
  let timers = [];

  const later = (fn, ms) => {
    if (reduced()) fn();
    else timers.push(setTimeout(fn, ms));
  };
  const show = (name) => Object.entries(steps).forEach(([key, el]) => (el.hidden = key !== name));

  root.querySelector("[data-login-send]").addEventListener("click", () => {
    log.replaceChildren(
      logItem({
        verb: "GET",
        path: `/contact/send-pass?email=${email}`,
        text: "RentSyst envoie au client un code à usage unique, par email.",
      })
    );
    show("code");
    // Le code « arrive » chiffre par chiffre
    DEMO_CODE.split("").forEach((digit, index) => later(() => (digits[index].textContent = digit), 500 + index * 140));
    later(() => (verify.disabled = false), 500 + DEMO_CODE.length * 140);
  });

  verify.addEventListener("click", () => {
    verify.disabled = true;
    log.append(
      logItem({
        verb: "GET",
        path: `/contact?email=${email}&code=${DEMO_CODE}`,
        text: "Le code est vérifié : le client est connecté, sans mot de passe à retenir.",
      })
    );

    later(() => {
      log.append(
        logItem({
          verb: "GET",
          path: "/contact/list",
          text: "Le piège : RentSyst crée un nouveau contact à chaque réservation. Le plugin parcourt la liste et garde tous ceux qui ont le même email.",
        })
      );
      merge.hidden = false;
      contacts.replaceChildren();
      DEMO_CONTACTS.forEach((c, index) =>
        later(() => {
          const card = document.createElement("div");
          card.className = "contact";
          const strong = document.createElement("strong");
          strong.textContent = `Contact #${c.id}`;
          card.append(strong, document.createTextNode(`${email} · ${c.orders} réservation`));
          contacts.append(card);
        }, index * 250)
      );
    }, 700);

    later(() => {
      log.append(
        logItem({
          verb: "GET",
          path: "/contact/{id} × 3",
          text: "Les réservations de chaque contact sont récupérées, dédoublonnées puis triées de la plus récente à la plus ancienne.",
        })
      );
      contacts.classList.add("is-merged");
      orders.replaceChildren();
      DEMO_ORDERS.forEach((o) => {
        const li = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = o.vehicle;
        const status = document.createElement("em");
        status.className = `status${o.reserved ? " status--reserved" : ""}`;
        status.textContent = o.status;
        const dates = document.createElement("span");
        dates.textContent = o.dates;
        const total = document.createElement("b");
        total.className = "total";
        total.textContent = euro(o.total);
        li.append(name, status, dates, total);
        orders.append(li);
      });
      show("history");
    }, 2000);
  });

  root.querySelector("[data-login-reset]").addEventListener("click", () => {
    timers.forEach(clearTimeout);
    timers = [];
    digits.forEach((d) => (d.textContent = ""));
    verify.disabled = true;
    contacts.classList.remove("is-merged");
    contacts.replaceChildren();
    merge.hidden = true;
    log.innerHTML = idle;
    show("email");
  });
}

// ---------------- 04 — Simulateur de réservation ----------------

function initSimulator(root) {
  if (root.dataset.ready) return;
  root.dataset.ready = "true";

  const vehicleButtons = Array.from(root.querySelectorAll("[data-sim-vehicle]"));
  const insuranceButtons = Array.from(root.querySelectorAll("[data-sim-insurance]"));
  const extraInputs = Array.from(root.querySelectorAll("[data-sim-extra]"));
  const daysInput = root.querySelector("[data-sim-days]");
  const daysLabel = root.querySelector("[data-sim-days-label]");
  const recapVehicle = root.querySelector("[data-sim-recap-vehicle]");
  const lines = root.querySelector("[data-sim-lines]");
  const totalEl = root.querySelector("[data-sim-total]");
  const depositEl = root.querySelector("[data-sim-deposit]");
  const api = root.querySelector("[data-sim-api]");
  const book = root.querySelector("[data-sim-book]");
  let availabilityTimer = null;

  const checked = (buttons) => buttons.find((b) => b.getAttribute("aria-checked") === "true");
  const radio = (buttons, onChange) =>
    buttons.forEach((button) =>
      button.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-checked", String(b === button)));
        onChange();
      })
    );

  const state = () => {
    const vehicle = checked(vehicleButtons);
    const insurance = checked(insuranceButtons);
    return {
      vehicle: vehicle.dataset.name,
      price: Number(vehicle.dataset.price),
      days: Number(daysInput.value),
      insurance: insurance.dataset.name,
      insurancePrice: Number(insurance.dataset.price),
      deposit: Number(insurance.dataset.deposit),
      extras: extraInputs.filter((i) => i.checked).map((i) => ({ name: i.dataset.name, price: Number(i.dataset.price) })),
    };
  };

  const renderRecap = () => {
    const s = state();
    const dayWord = s.days > 1 ? "jours" : "jour";
    daysLabel.textContent = `${s.days} ${dayWord}`;
    recapVehicle.textContent = `${s.vehicle} · ${s.days} ${dayWord} · Bruxelles`;

    const rows = [
      [`${euro(s.price)} × ${s.days} ${dayWord}`, s.price * s.days],
      [`Assurance ${s.insurance}`, s.insurancePrice * s.days],
      ...s.extras.map((e) => [e.name, e.price * s.days]),
    ];
    lines.replaceChildren(
      ...rows.map(([label, amount]) => {
        const li = document.createElement("li");
        const a = document.createElement("span");
        a.textContent = label;
        const b = document.createElement("span");
        b.textContent = euro(amount);
        li.append(a, b);
        return li;
      })
    );
    const total = rows.reduce((sum, [, amount]) => sum + amount, 0);
    totalEl.textContent = euro(total);
    depositEl.textContent = `Caution : ${s.deposit.toLocaleString("fr-FR")} €`;
    book.disabled = false;
  };

  // Ce que fait le site quand le véhicule ou les dates changent : il
  // demande à RentSyst si le véhicule est libre et à quel prix.
  const renderAvailability = () => {
    const s = state();
    api.replaceChildren(
      logItem({
        verb: "POST",
        path: "admin-ajax.php · flexy_check_availability",
        text: "Le navigateur demande au site si le véhicule est libre sur ces dates.",
      }),
      logItem({
        verb: "GET",
        path: "/booking/search",
        text: "Le plugin interroge RentSyst avec son jeton OAuth, gardé en cache 23 heures.",
      }),
      logItem({
        path: `{ available: true, price_day: ${s.price}, days: ${s.days}, total: ${s.price * s.days} }`,
        text: "Réponse renvoyée à la page : disponible, avec le prix pour la durée choisie.",
      })
    );
  };

  const scheduleAvailability = () => {
    clearTimeout(availabilityTimer);
    availabilityTimer = setTimeout(renderAvailability, reduced() ? 0 : 350);
  };

  const onRecapChange = () => {
    renderRecap();
    // L'assurance et les options sont ajoutées dans le récapitulatif ;
    // le prix du véhicule, lui, vient de RentSyst
    if (!api.querySelector("li")) renderAvailability();
  };

  radio(vehicleButtons, () => {
    renderRecap();
    scheduleAvailability();
  });
  radio(insuranceButtons, onRecapChange);
  extraInputs.forEach((input) => input.addEventListener("change", onRecapChange));
  daysInput.addEventListener("input", () => {
    renderRecap();
    scheduleAvailability();
  });

  book.addEventListener("click", () => {
    book.disabled = true;
    api.append(
      logItem({
        verb: "POST",
        path: "/order/create",
        text: "La réservation est créée dans RentSyst, où l'agence la retrouve. Le client ne paie rien en ligne : le règlement se fait à la prise en charge.",
      })
    );
  });

  renderRecap();
  renderAvailability();
}