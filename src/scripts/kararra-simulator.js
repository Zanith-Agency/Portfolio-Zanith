// Évaluateur Kararra simplifié (KararraExtras.astro).
//
// Reprend les formules du moteur de l'application (engine.ts) :
// coût réel, marge, prix d'achat maximum, trésorerie, 8 sous-scores
// pondérés, puis décision corrigée par les règles de sécurité.
// Simplification : les frais (transport, douane, dédouanement…) sont
// saisis en un seul montant par unité ; la marque est assujettie à la
// TVA, qui n'entre donc pas dans le coût mais dans la trésorerie.

// --- Réglages de la marque (page Réglages de l'application) ---
const CONFIG = {
  vatRate: 0.21,
  marginFloor: 0.4,
  marginTarget: 0.6,
  marginExcellent: 0.8,
  budgetAvailable: 5000,
  cashComfort: 5000,
  // À confirmer avec les réglages de l'application :
  coherence: { coeur: 100, peripherie: 60, hors_univers: 0 },
  bandRecommendedMin: 75,
  bandReviewMin: 55,
  weights: {
    coherence: 20,
    profitability: 20,
    quality: 15,
    moq_investment: 10,
    originality: 10,
    supplier_reliability: 10,
    logistics: 5,
    risk: 10,
  },
};

// Produits fictifs pour démarrer
const PRESETS = {
  travertin: {
    purchase: 18, fees: 3.9, price: 69, qty: 100,
    materialTier: "coeur", paletteTier: "coeur", styleTier: "coeur",
    quality: 80, originality: 70, reliability: 85, risk: 40,
  },
  bougie: {
    purchase: 6.5, fees: 4.1, price: 19, qty: 200,
    materialTier: "peripherie", paletteTier: "coeur", styleTier: "peripherie",
    quality: 65, originality: 40, reliability: 70, risk: 35,
  },
  vase: {
    purchase: 22, fees: 6.5, price: 49, qty: 150,
    materialTier: "coeur", paletteTier: "hors_univers", styleTier: "peripherie",
    quality: 70, originality: 75, reliability: 50, risk: 65,
  },
};

const BANDS = {
  recommande: { label: "Recommandé", color: "#5e7a4e" },
  a_revoir: { label: "À revoir", color: "#b98327" },
  non_recommande: { label: "Non recommandé", color: "#a83a2b" },
  refuse: { label: "Refusé", color: "#a83a2b" },
  bloque: { label: "Bloqué", color: "#8a5230" },
};
const SEVERITY = { recommande: 0, a_revoir: 1, non_recommande: 2, refuse: 3, bloque: 4 };

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const linScore = (x, lo, hi) => (hi <= lo ? (x >= hi ? 100 : 0) : clamp(((x - lo) / (hi - lo)) * 100, 0, 100));
const eur = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const eur0 = (n) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const pct = (n) => (n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %";

export function evaluateProduct(input, config = CONFIG) {
  const landed = input.purchase + input.fees;
  const margin = input.price > 0 ? (input.price - landed) / input.price : 0;

  // Trésorerie : investissement + TVA à avancer sur l'achat et les frais
  const investment = landed * input.qty;
  const vatToAdvance = config.vatRate * landed * input.qty;
  const cash = investment + vatToAdvance;

  // Cohérence : moyenne matière / palette / style
  const tiers = [input.materialTier, input.paletteTier, input.styleTier];
  const coherence = tiers.reduce((sum, t) => sum + config.coherence[t], 0) / tiers.length;

  const sub = {
    coherence,
    profitability: linScore(margin, config.marginFloor, config.marginExcellent),
    quality: input.quality,
    moq_investment: linScore(config.budgetAvailable - cash, 0, config.budgetAvailable - config.cashComfort),
    originality: input.originality,
    supplier_reliability: input.reliability,
    logistics: landed > 0 ? clamp(100 - 100 * (input.fees / landed), 0, 100) : 0,
    risk: 100 - input.risk,
  };

  let num = 0;
  let den = 0;
  for (const [key, weight] of Object.entries(config.weights)) {
    num += sub[key] * weight;
    den += weight;
  }
  const score = den > 0 ? num / den : 0;

  const scoreBand =
    score >= config.bandRecommendedMin ? "recommande"
    : score >= config.bandReviewMin ? "a_revoir" : "non_recommande";

  // Règles de sécurité : elles passent outre le score
  const rules = [];
  if (margin < config.marginFloor) {
    rules.push({ band: "refuse", message: `Marge de ${pct(margin)}, sous le plancher de ${pct(config.marginFloor)}.` });
  }
  if (cash > config.budgetAvailable) {
    rules.push({ band: "bloque", message: `Il faudrait ${eur0(cash)} de trésorerie pour un budget de ${eur0(config.budgetAvailable)}.` });
  }
  const decision = [scoreBand, ...rules.map((r) => r.band)]
    .reduce((worst, b) => (SEVERITY[b] > SEVERITY[worst] ? b : worst), "recommande");

  // Levier de négociation : prix d'achat maximum pour atteindre la marge cible
  const maxPurchase = input.price * (1 - config.marginTarget) - input.fees;

  return { landed, margin, cash, sub, score, decision, rules, maxPurchase };
}

export function initKararraSimulator() {
  document.querySelectorAll("[data-kararra-sim]").forEach((root) => {
    if (root.dataset.simReady) return;
    root.dataset.simReady = "true";

    const form = root.querySelector("[data-sim-form]");
    const presetButtons = root.querySelectorAll("[data-sim-preset]");
    const decisionEl = root.querySelector("[data-sim-decision]");
    const out = (name) => root.querySelector(`[data-sim-out="${name}"]`);
    const q = (sel) => root.querySelector(sel);

    const read = () => {
      const data = new FormData(form);
      const n = (k) => Number(data.get(k));
      return {
        purchase: n("purchase"), fees: n("fees"), price: n("price"), qty: n("qty"),
        materialTier: data.get("materialTier"), paletteTier: data.get("paletteTier"), styleTier: data.get("styleTier"),
        quality: n("quality"), originality: n("originality"), reliability: n("reliability"), risk: n("risk"),
      };
    };

    const render = () => {
      // Valeurs affichées à côté des curseurs
      form.querySelectorAll('input[type="range"]').forEach((input) => {
        const o = out(input.name);
        if (!o) return;
        const unit = input.dataset.unit;
        const value = Number(input.value);
        o.textContent = unit.startsWith("€")
          ? `${value.toLocaleString("fr-FR", { minimumFractionDigits: input.step < 1 ? 2 : 0, maximumFractionDigits: 2 })} ${unit}`
          : `${value} ${unit}`;
      });

      const r = evaluateProduct(read());
      const band = BANDS[r.decision];

      decisionEl.style.setProperty("--band", band.color);
      q("[data-sim-band]").textContent = band.label;
      q("[data-sim-score]").textContent = String(Math.round(r.score));
      q("[data-sim-landed]").textContent = eur(r.landed);
      q("[data-sim-margin]").textContent = pct(r.margin);
      q("[data-sim-maxbuy]").textContent = r.maxPurchase > 0 ? eur(r.maxPurchase) : "—";
      q("[data-sim-cash]").textContent = eur0(r.cash);

      q("[data-sim-reason]").textContent = r.rules.length
        ? r.rules.map((rule) => rule.message).join(" ")
        : `Score de ${Math.round(r.score)} / 100 et marge de ${pct(r.margin)} : aucune règle de sécurité déclenchée.`;

      root.querySelectorAll("[data-sim-sub]").forEach((row) => {
        const value = r.sub[row.dataset.simSub];
        row.querySelector(".sim-fill").style.setProperty("--v", String(value / 100));
        row.querySelector(".sim-value").textContent = String(Math.round(value));
      });
    };

    const applyPreset = (id) => {
      const preset = PRESETS[id];
      if (!preset) return;
      Object.entries(preset).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (field) field.value = String(value);
      });
      presetButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.simPreset === id)));
      render();
    };

    form.addEventListener("input", () => {
      // Dès qu'on modifie un réglage, plus aucun exemple n'est « actif »
      presetButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      render();
    });
    presetButtons.forEach((button) => {
      button.addEventListener("click", () => applyPreset(button.dataset.simPreset));
    });

    applyPreset("travertin");
  });
}