# Kamerpunten

Persoonlijke app om de slaapkamer en zolderkamer schoon te houden én een minimale
dagelijkse sportroutine vol te houden, allebei in kleine stapjes — met punten die je
zelf inwisselt voor eigen beloningen. Losse app naast de gedeelde `schoonmaaklijst`
(index.html in de hoofdmap van deze repo) — deze gebruikt dezelfde Firebase-koppeling
maar een eigen datapad (`puntenapp`) en heeft geen enkele functionele relatie met die
gedeelde huishoud-checklist.

## Hoe het werkt

- Elke "kamer" heeft een van twee standen (in te stellen via Beheer → "Modus"-knop bij
  de kamer):
  - **Roterend** (Slaapkamer, Zolderkamer): een vaste, doorlopende lijst met kleine
    taken (2-10 minuten werk). De app laat steeds "de volgende taak in de rij" zien —
    zo komt na verloop van tijd alles een keer aan de beurt, zonder dat je zelf hoeft
    te kiezen.
  - **Elke dag** (Sport): alle actieve taken in die kamer staan élke dag klaar om apart
    afgevinkt te worden (bv. buikspieroefening, squat, lunge) — geen rotatie, gewoon
    een vaste routine die dagelijks reset.
- Taak afvinken = punten bijschrijven op je puntensaldo. Elke dag dat je minstens één
  taak afrondt (in welke kamer dan ook) telt mee voor je reeks (streak); bij mijlpalen
  (3, 7, 14, 30, 60, 100 dagen op rij) krijg je een eenmalige bonus.
- Onder **Beloningen** stel je zelf een lijst in van dingen die je jezelf gunt, met een
  puntenprijs. Genoeg punten? Dan kun je "m inwisselen" — dat is de echte inzet naast
  het spelletje.
- Onder **Beheer** pas je kamers, taken, volgorde, puntenwaardes en beloningen aan, en
  stel je het uur in waarop je een pushmelding wilt (standaard 08:00).

## Installatie als app op je telefoon (PWA)

1. Zet de site live (zelfde manier als de bestaande `schoonmaaklijst`, bv. GitHub
   Pages) zodat je 'm op een `https://`-adres kunt openen, bijvoorbeeld
   `https://<gebruikersnaam>.github.io/schoonmaaklijst/punten/`.
2. Open die link op je telefoon.
   - **Android/Chrome**: menu (⋮) → "Toevoegen aan startscherm".
   - **iPhone/Safari**: deelknop → "Zet op beginscherm".
3. De app opent voortaan als een eigen icoon, zonder browserbalk.

## Pushmeldingen inschakelen (belangrijk: eenmalige instelstap)

De app is voorbereid op echte pushmeldingen (ook als de app niet open staat), maar
vereist eenmalig een eigen **VAPID-sleutel** uit de Firebase-console, en het
**deployen van de Cloud Function** die dagelijks de melding verstuurt. Dit kan alleen
door jou gedaan worden (vereist inloggen met het Firebase-account/Google-account van
`mcb-paklijst-2026`) — dat kan niet vanuit deze sessie.

### Stap 1 — VAPID-sleutel genereren
1. Ga naar [Firebase Console](https://console.firebase.google.com/) → project
   `mcb-paklijst-2026` → tandwiel (Projectinstellingen) → tabblad **Cloud Messaging**.
2. Onder "Web configuration" → "Web Push certificates" → **Generate key pair**.
3. Kopieer de gegenereerde sleutel (lange string die begint met een letter/cijfer).
4. Plak deze in `punten/index.html`, bovenaan het script-blok:
   ```js
   const VAPID_KEY = "PLAK_HIER_JE_SLEUTEL";
   ```
5. Commit en push deze wijziging.

### Stap 2 — Blaze-abonnement (pay-as-you-go) activeren
Cloud Functions met een schema (Cloud Scheduler) vereisen het **Blaze**-abonnement van
Firebase, ook al blijven de kosten voor persoonlijk gebruik nagenoeg €0 (ruim binnen de
gratis maandelijkse quota van Functions/Scheduler). Zet dit aan via Firebase Console →
project `mcb-paklijst-2026` → linksonder "Upgraden".

### Stap 3 — Firebase CLI installeren en inloggen (eenmalig, op je eigen laptop)
```bash
npm install -g firebase-tools
firebase login
```

### Stap 4 — Functie deployen
```bash
cd schoonmaaklijst/punten
firebase deploy --only functions
```
Dit installeert de dependencies uit `functions/package.json` en zet de functie
`dailyReminder` live. Deze draait voortaan elk uur, maar stuurt alleen daadwerkelijk
een melding op het uur dat je in de app onder **Beheer → Instellingen** hebt ingesteld
— en maximaal één keer per dag.

### Stap 5 — Meldingen aanzetten in de app
Open de app (na stap 1 en 4), ga naar **Beheer** of **Vandaag**, en klik op
"Meldingen aanzetten". Je telefoon/browser vraagt om toestemming; na akkoord wordt je
apparaat geregistreerd en ontvang je vanaf de volgende ronde de dagelijkse melding.

**Let op iOS/iPhone:** pushmeldingen via de browser werken op iPhone alleen als de app
eerst is toegevoegd aan het beginscherm (zie installatie-stappen hierboven) én je
minimaal iOS 16.4 hebt. Open de app dus altijd via het toegevoegde icoon, niet via
Safari zelf, voordat je op "Meldingen aanzetten" klikt.

## Data en privacy

Alle data (kamers, taken, punten, beloningen, geschiedenis, geregistreerde
meldingstokens) staat in dezelfde Firebase Realtime Database als de bestaande
`schoonmaaklijst`-app, onder een eigen pad `puntenapp`, en synchroniseert automatisch
tussen apparaten waarop je bent ingelogd op deze app. Er zit geen wachtwoord/login op
(net als bij de bestaande schoonmaaklijst) — dit is bedoeld als persoonlijke app voor
eigen gebruik.

## Bestandenoverzicht

- `index.html` — de volledige app (UI + logica), plek voor de `VAPID_KEY`.
- `manifest.json` — PWA-installatiegegevens.
- `sw.js` — service worker: offline-cache + verwerkt pushmeldingen op de achtergrond.
- `icons/` — app-iconen.
- `functions/index.js` — Cloud Function die dagelijks de pushmelding verstuurt.
- `functions/package.json` — dependencies voor de Cloud Function.
- `firebase.json`, `.firebaserc` — Firebase-projectconfiguratie voor het deployen van
  alleen de `functions/`-map (raakt de rest van de site niet).
