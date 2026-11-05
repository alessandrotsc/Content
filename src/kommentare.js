/**
 * Kommentare (User 05.11.2026): feste Sprüche zum Interagieren unter fremden Nischen-Videos, je Kanal.
 * Antippen kopiert den Spruch und markiert ihn. Ein anderer Spruch nimmt die Markierung mit.
 * Verlässt man die App (auch nur kurz, ohne sie zu schließen), sind beim Zurückkommen alle wieder frisch.
 */

import * as S from "./store.js";
import { Z, neu } from "./zustand.js";
import { el, ikon } from "./ui.js";
import { KOMMENTARE } from "./kommentar-texte.js";

let kanal = null;
let gruppe = "uni";
let kopiert = null;      // "Kanal|gruppe|nr" des zuletzt kopierten Spruchs

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

export function kommentareBereich() {
  const gewaehlt = Z.projektId && S.projekt(Z.projektId)?.name;
  if (gewaehlt && KOMMENTARE[gewaehlt]) kanal = gewaehlt;
  kanal ||= "Astromaster";
  const gruppen = KOMMENTARE[kanal];
  if (!gruppen.some((g) => g.id === gruppe)) gruppe = "uni";
  const g = gruppen.find((x) => x.id === gruppe);

  return el("div", { class: "seite" },
    el("div", { class: "wahl" }, Object.keys(KOMMENTARE).map((k) =>
      el("button", { class: k === kanal ? "an" : "", text: k, onclick: () => { kanal = k; gruppe = "uni"; neu(); } }))),
    el("div", { class: "chips" }, gruppen.map((x) =>
      el("button", { class: "chip-knopf" + (x.id === gruppe ? " an" : ""), text: `${x.name} ${x.texte.length}`, onclick: () => { gruppe = x.id; neu(); } }))),
    el("p", { class: "hinweis", text: gruppe === "uni" ? "Passen unter fast jedes Video der Nische. Antippen kopiert." : "Nur unter passenden Videos nehmen. Antippen kopiert." }),
    el("div", { class: "kommentar-liste" }, g.texte.map((text, i) => {
      const key = `${kanal}|${gruppe}|${i}`;
      const an = kopiert === key;
      return el("button", { class: "kommentar-karte" + (an ? " kopiert" : ""), onclick: () => kopieren(key, text) },
        el("span", { class: "kommentar-text", text }),
        el("span", { class: "kommentar-knopf" }, ikon(an ? "haken" : "kopieren", 18), el("small", { text: an ? "Kopiert" : "Kopieren" })));
    })),
    el("p", { class: "hinweis", text: "Tipp: lieber 5 echte Kommentare in den ersten Minuten unter frischen Videos als 50 gleiche. Gleiche Sprüche nicht mehrmals hintereinander nehmen, sonst hält die Plattform sie für Spam." }));
}
