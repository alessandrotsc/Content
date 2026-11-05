/**
 * Engagement (User 05.11.2026): Kommentare zum Interagieren unter fremden Nischen-Videos, je Kanal.
 * "Themen": Archiv mit Suche (z. B. Kurkuma), je Thema Tipp-Kommentare aus unserem Wissen (engagement-themen.js,
 * gebaut aus Marken/Engagement-Arbeit mit bauen.py). "Allgemein": Sprüche, die unter fast jedes Video passen.
 * Antippen kopiert und markiert; ein anderer Spruch nimmt die Markierung mit.
 * Verlässt man die App (auch nur kurz, ohne sie zu schließen), sind beim Zurückkommen alle wieder frisch.
 */

import * as S from "./store.js";
import { Z, neu } from "./zustand.js";
import { el, ikon } from "./ui.js";
import { KOMMENTARE } from "./kommentar-texte.js";
import { THEMEN } from "./engagement-themen.js";

const ART = { zusatz: "Tipp", fakt: "Fakt", frage: "Frage", korrektur: "Ergänzung" };
let kanal = null;
let modus = "themen";     // "themen" | "allgemein"
let gruppe = "uni";
let thema = null;         // Name des geöffneten Themas
let suche = "";
let kopiert = null;       // Schlüssel des zuletzt kopierten Spruchs

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") kopiert = null;
  else if (Z.bereich === "kommentare") neu();
});

async function kopieren(key, text) {
  try { await navigator.clipboard.writeText(text); kopiert = key; }
  catch { // ältere iOS-Fassungen: über ein unsichtbares Textfeld
    const t = el("textarea", { text, style: { position: "fixed", opacity: "0" } });
    document.body.append(t); t.select(); const ok = document.execCommand("copy"); t.remove();
    kopiert = ok ? key : null;
  }
  neu();
}

function karte(key, text, marke) {
  const an = kopiert === key;
  return el("button", { class: "kommentar-karte" + (an ? " kopiert" : ""), onclick: () => kopieren(key, text) },
    el("span", { class: "kommentar-text" }, marke && el("small", { class: "kommentar-art", text: marke }), text),
    el("span", { class: "kommentar-knopf" }, ikon(an ? "haken" : "kopieren", 18), el("small", { text: an ? "Kopiert" : "Kopieren" })));
}

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
const passt = (t, q) => !q || [t.thema, ...(t.such || [])].some((w) => norm(w).includes(q));

function themenAnsicht() {
  const liste = THEMEN[kanal] || [];
  const offen = thema && liste.find((t) => t.thema === thema);
  if (offen) {
    return el("div", {},
      el("button", { class: "zurueck-knopf", onclick: () => { thema = null; neu(); } }, ikon("zurueck", 18), "Alle Themen"),
      el("h2", { class: "thema-titel", text: offen.thema }),
      el("p", { class: "hinweis", text: "Passt unter Videos zu diesem Thema. Antippen kopiert." }),
      el("div", { class: "kommentar-liste" }, offen.tipps.map((x, i) => karte(`${kanal}|t|${offen.thema}|${i}`, x.text, ART[x.art]))));
  }
  const raster = el("div", { class: "themen-raster" });
  const leer = el("p", { class: "hinweis", text: "Kein Thema gefunden. Probier ein anderes Wort oder schau bei Allgemein." });
  const fuellen = () => {
    const q = norm(suche.trim());
    const rang = (t) => (norm(t.thema).startsWith(q) ? 0 : norm(t.thema).includes(q) ? 1 : 2);
    const treffer = liste.filter((t) => passt(t, q)).sort((a, b) => rang(a) - rang(b));
    raster.replaceChildren(...treffer.map((t) => el("button", { class: "thema-knopf", onclick: () => { thema = t.thema; neu(); } },
      el("b", { text: t.thema }), el("small", { text: `${t.tipps.length}` }))));
    leer.hidden = treffer.length > 0;
  };
  const feld = el("input", { class: "suchfeld", type: "search", placeholder: `Thema suchen, z. B. ${kanal === "Kultas" ? "Kurkuma" : "Skorpion"}`,
    value: suche, autocomplete: "off", oninput: (ev) => { suche = ev.target.value; fuellen(); } });
  fuellen();
  return el("div", {}, feld, el("p", { class: "hinweis", text: `${liste.length} Themen. Video gerade offen? Thema suchen und einen passenden Tipp kommentieren.` }), raster, leer);
}

function allgemeinAnsicht() {
  const gruppen = KOMMENTARE[kanal];
  if (!gruppen.some((g) => g.id === gruppe)) gruppe = "uni";
  const g = gruppen.find((x) => x.id === gruppe);
  return el("div", {},
    el("div", { class: "chips" }, gruppen.map((x) =>
      el("button", { class: "chip-knopf" + (x.id === gruppe ? " an" : ""), text: `${x.name} ${x.texte.length}`, onclick: () => { gruppe = x.id; neu(); } }))),
    el("p", { class: "hinweis", text: gruppe === "uni" ? "Passen unter fast jedes Video der Nische. Antippen kopiert." : "Nur unter passenden Videos nehmen. Antippen kopiert." }),
    el("div", { class: "kommentar-liste" }, g.texte.map((text, i) => karte(`${kanal}|a|${gruppe}|${i}`, text))));
}

export function kommentareBereich() {
  const gewaehlt = Z.projektId && S.projekt(Z.projektId)?.name;
  if (gewaehlt && KOMMENTARE[gewaehlt] && gewaehlt !== kanal) { kanal = gewaehlt; thema = null; }
  kanal ||= "Astromaster";
  return el("div", { class: "seite" },
    el("div", { class: "wahl" }, Object.keys(KOMMENTARE).map((k) =>
      el("button", { class: k === kanal ? "an" : "", text: k, onclick: () => { kanal = k; thema = null; suche = ""; gruppe = "uni"; neu(); } }))),
    el("div", { class: "segment engagement-modus" }, [["themen", "Themen"], ["allgemein", "Allgemein"]].map(([id, name]) =>
      el("button", { class: modus === id ? "an" : "", text: name, onclick: () => { modus = id; neu(); } }))),
    modus === "themen" ? themenAnsicht() : allgemeinAnsicht(),
    el("p", { class: "hinweis", text: "Tipp: lieber 5 echte Kommentare in den ersten Minuten unter frischen Videos als 50 gleiche. Gleiche Sprüche nicht mehrmals hintereinander nehmen, sonst hält die Plattform sie für Spam." }));
}
