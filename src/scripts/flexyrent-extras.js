// Contenu interactif de la page Flexy Rent (FlexyRentExtras.astro) :
// le simulateur de réservation. Démonstration : aucun appel réel n'est fait.
//
// Les appels affichés reprennent ceux du plugin flexyrent-rentsyst.

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const euro = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

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
  document.querySelectorAll("[data-flx-sim]").forEach(initSimulator);
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
    recapVehicle.textContent = `${s.vehicle} · ${s.days} ${dayWord}`;

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