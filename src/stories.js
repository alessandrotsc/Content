/**
 * Stories (User 27.10.2026): je Tag und Kanal drei Stories, getrennt von den Videos.
 * Morgen 9 Uhr, Mittag 13 Uhr, Abend 19 Uhr. Bild herunterladen/teilen wie bei den Covern, Haken = gepostet.
 *
 * Kultas (03.11.2026): morgens "Wusstest du?", mittags "Mythos oder Fakt", abends "Heute neu". Zeiten Kultas seit 04.11.2026: 10, 15, 20 Uhr.
 * Liegt in der Ablage (Ordner stories-kultas, erzeugt am Mac mit tools/stories.py, 14 Tage im Voraus).
 * Instagram + Facebook gehen über Metricool automatisch raus, TikTok lädt der User selbst hoch (Bild speichern).
 * Ansicht "Formate": alle Einträge des Pools mit Vorschau, Quelle und wann sie zuletzt/als nächstes kommen.
 * Astromaster: der Server rendert jeden Morgen um 8:50 die drei Stories des Tages (Mondkalender, Wissen,
 * Planeten und Häuser) nach /medien/stories/<datum>-<quelle>.jpg; die App holt sie direkt von dort (nur heute).
 */

import * as S from "./store.js";
import * as D from "./datum.js";
import * as Server from "./server.js";
import { Z, neu } from "./zustand.js";
import { el, ikon, dialog } from "./ui.js";
import { ablageStories, ablagePool, laden } from "./posten.js";

const SLOTS = [
  { id: "morgen", name: "Morgen", zeit: "09:00" },
  { id: "mittag", name: "Mittag", zeit: "13:00" },
  { id: "abend", name: "Abend", zeit: "19:00" },
];
const ASTRO = { morgen: ["tagesenergie", "Mondkalender"], mittag: ["wissen", "Wissen"], abend: ["abend", "Planeten und Häuser"] };
const HINWEIS = {};
const ZEIT = { "Kultas|morgen": "10:00", "Kultas|mittag": "15:00", "Kultas|abend": "20:00" };
const KULTAS_HINWEIS = "Instagram und Facebook gehen automatisch raus. TikTok: Bild speichern und dort als Story hochladen.";

let tag = null;
let ansicht = "tage";          // "tage" | "formate"
let kernWahl = "";
let unterWahl = "";
const ERLEDIGT = "contentplaner.stories.erledigt";
const erledigt = (() => { try { return JSON.parse(localStorage.getItem(ERLEDIGT)) || {}; } catch { return {}; } })();
function merken() { try { localStorage.setItem(ERLEDIGT, JSON.stringify(erledigt)); } catch { /* egal */ } }

function medienBasis() {
  const u = Server.einstellung()?.url;
  try { return u ? new URL(u).origin + "/medien/stories/" : null; } catch { return null; }
}

/** Alle Stories eines Tages für ein Projekt: [{slot, url, titel, format, key}] */
function storiesFuer(p, datum) {
  if (p.name === "Astromaster") {
    const basis = medienBasis();
    if (!basis || datum !== D.heute()) return [];
    return SLOTS.map((s) => ({ slot: s.id, url: `${basis}${datum}-${ASTRO[s.id][0]}.jpg`, titel: ASTRO[s.id][1],
      format: ASTRO[s.id][1], key: `STORY|Astromaster|${datum}|${s.id}`, extern: true }));
  }
  return ablageStories().filter((v) => (v.projekt || "").toLowerCase() === p.name.toLowerCase() && v.datum === datum)
    .map((v) => ({ slot: v.slot, url: v.dateien?.bild, titel: v.titel, format: v.format, key: v.key }));
}

/** Herunterladen/Teilen; klappt der Abruf nicht (fremder Server ohne Freigabe), Bild in neuem Tab öffnen. */
function speichernKnopf(st) {
  const text = el("span", { text: "Bild speichern" });
  let datei = null;
  const b = el("button", { class: "teilen", onclick: async (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    try {
      if (!datei) { text.textContent = "Lädt …"; datei = await laden(st.url, () => {}); text.textContent = "Jetzt teilen"; b.classList.add("bereit"); return; }
      if (navigator.canShare?.({ files: [datei] })) await navigator.share({ files: [datei] });
      else { const a = el("a", { href: URL.createObjectURL(datei), download: `${st.key.replaceAll("|", "-")}.jpg` }); document.body.append(a); a.click(); a.remove(); }
    } catch (e) {
      if (e.name === "AbortError") return;
      window.open(st.url, "_blank"); text.textContent = "Bild speichern";
    }
  } }, ikon("pfeil_hoch"), text);
  return b;
}

function slotKarte(p, s, st) {
  const fertig = st && erledigt[st.key];
  const haken = st && el("button", { class: "fertig-haken" + (fertig ? " an" : ""), title: "Gepostet",
    onclick: (ev) => { ev.stopPropagation(); erledigt[st.key] = !fertig; if (!erledigt[st.key]) delete erledigt[st.key]; merken(); neu(); } }, ikon("haken", 20));
  const bild = st && el("img", { class: "story-bild", src: st.url, loading: "lazy", alt: st.titel,
    onerror: (ev) => { ev.target.replaceWith(el("div", { class: "story-leer", text: "Noch nicht da" })); },
    onclick: () => gross(st) });
  return el("div", { class: "story-slot" + (fertig ? " erledigt" : "") },
    el("div", { class: "story-kopf" }, el("b", { text: s.name }), el("small", { text: ZEIT[`${p.name}|${s.id}`] || s.zeit })),
    st && el("div", { class: "story-rahmen" }, bild, haken),
    !st && el("div", { class: "story-leer", text: p.name === "Astromaster" && tag !== D.heute() ? "Kommt am Tag um 8:50" : "Noch keine Story" }),
    st && el("div", { class: "story-titel", text: st.format || "" }),
    st && HINWEIS[`${p.name}|${s.id}`] && el("div", { class: "hinweis", text: HINWEIS[`${p.name}|${s.id}`] }),
    st && speichernKnopf(st));
}

function gross(st) {
  const d = dialog(st.format || "Story");
  d.inhalt.append(el("img", { class: "story-gross", src: st.url, alt: st.titel }), speichernKnopf(st),
    el("button", { class: "posten-zu", text: "Schließen", onclick: () => d.zu() }));
}

export function storiesBereich() {
  tag ||= D.heute();
  const umschalter = el("div", { class: "wahl story-ansicht" }, [["tage", "Tage"], ["formate", "Formate"]].map(([id, name]) =>
    el("button", { class: ansicht === id ? "an" : "", text: name, onclick: () => { ansicht = id; neu(); } })));
  if (ansicht === "formate") return el("div", { class: "seite" }, umschalter, formateAnsicht());
  const tage = Array.from({ length: 7 }, (_, i) => D.plusTage(D.heute(), i));
  const wahl = el("div", { class: "chips" }, tage.map((t) => {
    const dd = D.ausIso(t);
    const name = t === D.heute() ? "Heute" : t === D.plusTage(D.heute(), 1) ? "Morgen" : `${D.WOCHENTAGE[D.wochentag(t)]} ${dd.getDate()}.`;
    return el("button", { class: "chip-knopf" + (t === tag ? " an" : ""), text: name, onclick: () => { tag = t; neu(); } });
  }));
  const projekte = (Z.projektId ? [S.projekt(Z.projektId)] : S.projekte()).filter((p) => p && ["astromaster", "kultas"].includes(p.name.toLowerCase()));
  return el("div", { class: "seite" }, umschalter, wahl,
    projekte.map((p) => {
      const liste = storiesFuer(p, tag);
      return el("div", { class: "saeule" },
        el("div", { class: "saeule-kopf" }, el("span", { class: "fpunkt", style: { background: p.farbe } }), el("div", {}, el("b", { text: p.name }))),
        el("div", { class: "story-reihe" }, SLOTS.map((s) => slotKarte(p, s, liste.find((x) => x.slot === s.id)))),
        p.name === "Kultas" && el("p", { class: "hinweis", text: KULTAS_HINWEIS }));
    }),
    !Server.aktiv() && el("p", { class: "hinweis", text: "Für Stories muss unter Mehr der Content-Hub-Server verbunden sein." }));
}

/* ---------- Formate: der ganze Story-Pool (Kultas) ---------- */

const kurzDatum = (iso) => { if (!iso) return ""; const d = D.ausIso(iso); return `${D.WOCHENTAGE[D.wochentag(iso)]} ${d.getDate()}.${d.getMonth() + 1}.`; };
const eintragText = (e) => e.text || e.behauptung || e.was || (e.gut && `${e.gut} statt ${e.schlecht}`) || "";

function formateAnsicht() {
  const pool = ablagePool("Kultas");
  if (!pool) return el("p", { class: "hinweis", text: Server.aktiv() ? "Der Story-Pool ist noch nicht hochgeladen." : "Für Stories muss unter Mehr der Content-Hub-Server verbunden sein." });
  const eintraege = pool.eintraege || [];
  const slots = pool.slots || [];
  kernWahl ||= slots.find((s) => s.kern)?.kern || "";
  const imKern = eintraege.filter((e) => e.kern === kernWahl);
  const unterIds = [...new Set(imKern.map((e) => e.unter))];
  if (unterWahl && !unterIds.includes(unterWahl)) unterWahl = "";
  const liste = imKern.filter((e) => !unterWahl || e.unter === unterWahl)
    .sort((a, b) => (a.aus ? 1 : 0) - (b.aus ? 1 : 0) || (a.naechstes || "9999").localeCompare(b.naechstes || "9999") || a.id.localeCompare(b.id));
  const aktiv = imKern.filter((e) => !e.aus).length;
  const tageReichweite = aktiv;   // ein Eintrag pro Tag und Kernformat
  return el("div", {},
    el("div", { class: "story-kerne" }, slots.map((s) => {
      const name = s.kern ? pool.kerne[s.kern] : "Heute neu";
      const n = s.kern ? eintraege.filter((e) => e.kern === s.kern && !e.aus).length : null;
      return el("button", { class: "story-kern" + (s.kern && s.kern === kernWahl ? " an" : "") + (s.kern ? "" : " fest"),
        onclick: () => { if (s.kern) { kernWahl = s.kern; unterWahl = ""; neu(); } } },
        el("small", { text: s.zeit }), el("b", { text: name }),
        el("span", { text: s.kern ? `${n} Einträge` : "Short des Tages" }));
    })),
    el("p", { class: "hinweis", text: `${aktiv} Einträge reichen für ${tageReichweite} Tage, bevor sich etwas wiederholt. Fehler gefunden? Sag Claude die Nummer, dann wird der Eintrag korrigiert oder rausgenommen.` }),
    el("div", { class: "chips" },
      el("button", { class: "chip-knopf" + (!unterWahl ? " an" : ""), text: `Alle ${imKern.length}`, onclick: () => { unterWahl = ""; neu(); } }),
      unterIds.map((u) => el("button", { class: "chip-knopf" + (u === unterWahl ? " an" : ""),
        text: `${pool.unter[u] || u} ${imKern.filter((e) => e.unter === u).length}`, onclick: () => { unterWahl = u; neu(); } }))),
    el("div", { class: "pool-raster" }, liste.map((e) => {
      const url = pool.dateien?.[e.id];
      return el("button", { class: "pool-karte" + (e.aus ? " aus" : ""), onclick: () => poolDetail(pool, e) },
        url ? el("img", { class: "story-bild", src: url, loading: "lazy", alt: eintragText(e) }) : el("div", { class: "story-leer", text: "Kein Bild" }),
        el("div", { class: "pool-info" },
          el("b", { text: `${e.id} · ${e.thema}` }),
          el("small", { text: e.aus ? "Rausgenommen" : e.naechstes ? `Kommt ${kurzDatum(e.naechstes)}` : e.zuletzt ? `Zuletzt ${kurzDatum(e.zuletzt)}` : "Noch nicht dran" })));
    })));
}

function poolDetail(pool, e) {
  const d = dialog(`${e.id} · ${pool.unter[e.unter] || e.unter}`);
  const q = e.quelle || {};
  const stelle = [q.datei?.replace(/\.json$/, ""), q.kapitel != null ? `Kapitel ${q.kapitel + 1}` : null, q.szene != null ? `Szene ${q.szene + 1}` : null].filter(Boolean).join(", ");
  d.inhalt.append(
    pool.dateien?.[e.id] && el("img", { class: "story-gross", src: pool.dateien[e.id], alt: eintragText(e) }),
    el("p", { class: "pool-text", text: [e.zahl, eintragText(e), e.zusatz, e.punkte?.join(", "), e.urteil, e.warum].filter(Boolean).join(" · ") }),
    el("p", { class: "hinweis", text: `Quelle: ${stelle}` }),
    q.zitat && el("p", { class: "pool-zitat", text: `„${q.zitat}“` }),
    e.pruefung && el("p", { class: "hinweis", text: `Prüfung: ${e.pruefung}` }),
    el("p", { class: "hinweis", text: e.aus ? "Rausgenommen, wird nicht gezeigt." : [e.zuletzt && `Zuletzt am ${kurzDatum(e.zuletzt)}`, e.naechstes && `Als Nächstes am ${kurzDatum(e.naechstes)}`].filter(Boolean).join(" · ") || "Noch nicht eingeplant." }),
    el("button", { class: "posten-zu", text: "Schließen", onclick: () => d.zu() }));
}
