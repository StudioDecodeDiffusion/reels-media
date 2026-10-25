// Adaptateur Décodé Studio → moteur pixel-agents (MIT). Lit studio/activite.json et anime les agents :
// travail (frappe au bureau + bulle), réunion (marche vers la salle), passage de document (marche vers le collègue),
// sous-agents (6.2, 7.4…) en personnages secondaires, repos (déambulation). Panneau de détail + messagerie.
(() => {
  const SRC = ['https://api.github.com/repos/StudioDecodeDiffusion/reels-media/contents/studio/activite.json',
    'https://raw.githubusercontent.com/StudioDecodeDiffusion/reels-media/main/studio/activite.json'];
  const NOMS = {0: 'Secrétaire', 1: 'Veille actu', 2: 'Tendances Instagram', 3: 'Chiffres', 4: 'Concept', 5: 'Scénario',
    6: 'Direction artistique', 7: 'Critique', 8: 'Générateur', 9: 'Community manager', 10: 'Stratégie monétaire',
    11: 'Veille comptes IA', 12: 'Rétro-ingénierie', 13: 'Tendances TikTok', 14: 'Coordinateur', 15: 'Manager'};
  const ROLES = {0: 'Accueil : reçoit tes messages, te répond, transmet à l’agent 14.', 15: 'Anime les réunions de chaque étage.',
    14: 'Fluidifie les échanges, applique tes demandes.', 9: 'Commentaires, publication, état des comptes.', 10: 'Croissance et monétisation.',
    3: 'Statistiques · 3.1 à 3.5 (un par compte).', 1: '1.1 à 1.5 (un par compte).', 2: '2.1 à 2.5 (un par compte).',
    13: 'Tendances TikTok France.', 6: '6.1 son · 6.2 voix · 6.3 couleurs · 6.4 animations.',
    7: '7.1 concept · 7.2 tendance · 7.3 corrélation · 7.4 avant génération · 7.5 après génération.',
    4: '1er poste de la chaîne.', 5: '2e poste de la chaîne.', 8: '3e poste : spec, rendu, dépôt.', 11: 'Comptes IA qui percent.',
    12: '12.1 images · 12.2 son · 12.3 légendes et stats.'};
  const ID = n => +n + 1, N = id => id - 1;
  const send = data => window.dispatchEvent(new MessageEvent('message', {data}));
  let os = null, data = {agents: {}, journal: []}, outils = {}, vu = null, areas = {}, prets = false;
  const actif = s => s && (Date.now() - Date.parse(s.depuis)) / 60000 < 45 && !/^(fini|libre|termin)/i.test(s.etat);

  function sieges(label) {  // chaises de la zone (salle de réunion)
    const L = os.layout || {}; const res = [];
    for (const [id, s] of os.seats) { const lab = (L.areaTiles || [])[s.seatRow * L.cols + s.seatCol]; if (lab === label) res.push([id, s]) }
    return res;
  }
  function demarrer() {
    send({type: 'areaMappingsLoaded', mappings: areas});
    for (const n in NOMS) {
      send({type: 'agentCreated', id: ID(n), directoryName: 'agent-' + n, palette: n % 6, hueShift: n >= 6 ? (n * 47) % 300 : 0});
      const ch = os.characters.get(ID(n)); if (ch) ch.agentName = n + ' · ' + NOMS[n];
    }
    prets = true; appliquer();
  }
  function appliquer() {
    if (!prets) return;
    for (const n in NOMS) {
      const id = ID(n), s = data.agents[n], ch = os.characters.get(id); if (!ch) continue;
      const cle = actif(s) ? s.etat + '|' + (s.salle || '') : '';
      if (outils[n] === cle) continue;
      if (outils[n]) send({type: 'agentToolsClear', id});
      outils[n] = cle;
      if (!cle) { send({type: 'agentStatus', id, status: 'idle'}); os.setAgentActive(id, false); continue }
      const sous = (s.etat.match(/\b(\d{1,2}\.\d)\b/) || [])[1];
      send({type: 'agentToolStart', id, toolId: 't' + Date.now() + n, status: s.etat, toolName: 'Write'});
      if (sous) send({type: 'agentToolStart', id, toolId: 's' + Date.now() + n, status: 'Subtask: ' + sous + ' ' + s.etat, toolName: 'Task'});
      send({type: 'agentStatus', id, status: 'active'});
      if ((s.salle || '').startsWith('reunion')) {
        const libre = sieges(areas[s.salle] && areas[s.salle][0]).find(([, x]) => !x.assigned);
        if (libre) os.reassignSeat(id, libre[0]);
      } else { const ag = areas['agent-' + n]; const mien = ag && sieges(ag[0])[0]; if (mien && ch.seatId !== mien[0]) os.reassignSeat(id, mien[0]); os.sendToSeat(id) }
    }
  }
  function passages(nouveaux) {  // le donneur va porter le document au receveur puis revient
    nouveaux.forEach((e, i) => setTimeout(() => {
      const a = os.characters.get(ID(e.agent)), b = os.characters.get(ID(e.vers)); if (!a || !b) return;
      const s = os.seats.get(b.seatId); if (!s) return;
      for (const [dx, dy] of [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) if (os.walkToTile(ID(e.agent), s.seatCol + dx, s.seatRow + dy)) break;
      setTimeout(() => os.sendToSeat(ID(e.agent)), 7000);
    }, i * 8000));
  }
  async function charger() {
    for (const u of SRC) { try { const r = await fetch(u + (u.includes('raw') ? '?t=' + Date.now() : ''), {cache: 'no-store'}); if (!r.ok) continue;
      const j = await r.json(); data = j.content ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, '')), c => c.charCodeAt(0)))) : j; break } catch (e) {} }
    data.agents = data.agents || {};
    const nouveaux = (data.journal || []).filter(e => e.vers && (vu !== null) && e.t > vu);
    vu = (data.journal || []).reduce((m, e) => e.t > m ? e.t : m, vu || '');
    appliquer(); if (prets && nouveaux.length) passages(nouveaux); panneau();
  }
  // ── panneau latéral : détail de l'agent sélectionné, journal, tâches, messagerie ──
  const css = document.createElement('style');
  css.textContent = `#sd{position:fixed;right:12px;top:12px;width:300px;max-height:calc(100vh - 24px);overflow:auto;z-index:50;background:#161a22ee;color:#ece8dd;
    font:14px/1.5 system-ui,sans-serif!important;border:1px solid #2c3242;border-radius:10px;padding:10px 12px}#sd *{font-family:system-ui,sans-serif!important}#sd h2{font-size:12px;color:#ffd23f;letter-spacing:.07em;text-transform:uppercase;margin:10px 0 5px}
    #sd .ev{border-bottom:1px solid #252a36;padding:4px 0;font-size:12px;cursor:pointer}#sd .ev:hover{background:#20263a}#sd i{color:#8a90a0;font-style:normal}
    #sd textarea,#sd input{width:100%;box-sizing:border-box;background:#0e1016;color:#ece8dd;border:1px solid #2c3242;border-radius:6px;padding:6px;font:inherit}
    #sd button{width:100%;margin-top:6px;padding:7px;border:0;border-radius:6px;background:#ffd23f;color:#111;font-weight:700;cursor:pointer}
    #sd .k{display:grid;grid-template-columns:44px repeat(7,1fr);gap:2px;font-size:10px;margin-bottom:2px}#sd .k div{background:#1e2330;border-radius:3px;text-align:center;color:#6d7385;padding:2px 0}
    #sd .k .on{background:#ffd23f;color:#111}#sd .k .h{background:none;text-align:left;color:#8a90a0}
    #sdt{position:fixed;left:50%;transform:translateX(-50%);top:10px;font-family:system-ui!important;z-index:50;background:#161a22ee;color:#ece8dd;font:700 15px system-ui;padding:8px 12px;border-radius:10px;border:1px solid #2c3242}
    #sdt b{color:#ffd23f}#sdl{position:fixed;left:12px;bottom:12px;z-index:50;background:#161a22ee;color:#ece8dd;font:12px/1.6 system-ui!important;padding:8px 12px;border-radius:10px;border:1px solid #2c3242}#sdl span{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}@media(max-width:700px){#sdl{display:none}}#sdt small{display:block;font-weight:400;font-size:11px;color:#8a90a0}
    @media(max-width:700px){#sd{top:auto;bottom:0;right:0;left:0;width:auto;max-height:42vh;border-radius:10px 10px 0 0}}
    [data-testid="bottom-toolbar"],.bottom-toolbar{display:none!important}`;
  document.head.appendChild(css);
  const t = document.createElement('div'); t.id = 'sdt';
  t.innerHTML = 'Décodé <b>Studio</b> · en direct';
  const leg = document.createElement('div'); leg.id = 'sdl';
  leg.innerHTML = [['Étage 3', 'R&D · réunion', '#41c98b'], ['Étage 2', 'Production (chaîne 4 → 5 → 8) · réunion', '#ffa24c'],
    ['Étage 1', 'Veille · réunion · Artistique · réunion', '#5b7cfa'], ['Étage 0', 'Accueil · Management général · réunion', '#e85d75']]
    .map(([e, d, c]) => `<div><span style="background:${c}"></span><b>${e}</b> ${d}</div>`).join('') + '<div style="color:#8a90a0;margin-top:4px">À droite : escalier entre les étages</div>';
  const p = document.createElement('div'); p.id = 'sd';
  p.innerHTML = `<h2>Agent sélectionné</h2><div id="sdi">Touche un personnage (ou une ligne du journal) pour voir sa tâche en détail.</div>
    <div id="sdm" style="display:none"><h2>Écrire à cet agent</h2><textarea id="sdx" rows="3" placeholder="Ton message…"></textarea><button id="sdb">Envoyer</button><div id="sdr" style="font-size:11px;color:#8a90a0;margin-top:4px"></div></div>
    <h2>Tâches par compte</h2><div id="sdk"></div><h2>Journal</h2><div id="sdj"></div>`;
  let sel = null;
  function detail(n, e) {
    sel = n; const s = data.agents[n];
    const evs = (data.journal || []).filter(x => String(x.agent) === String(n)).slice(-6).reverse();
    document.getElementById('sdi').innerHTML = `<b>Agent ${n} · ${NOMS[n] || ''}</b><br><span style="color:#8a90a0">${ROLES[n] || ''}</span><br>` +
      (e ? `<br><b>${e.etat}</b><br>${e.detail || ''}<br><i>${new Date(e.t).toLocaleString('fr-FR')}${e.compte ? ' · compte ' + e.compte : ''}${e.vers ? ' · document → agent ' + e.vers : ''}</i>`
         : s ? `<br><b>${actif(s) ? 'En cours' : 'Dernière tâche'} :</b> ${s.etat}<br>${s.detail || ''}<br><i>${new Date(s.depuis).toLocaleString('fr-FR')}${s.compte ? ' · compte ' + s.compte : ''}</i>` : '<br>Pas d’activité récente.') +
      (evs.length ? '<br><br><i>Historique :</i>' + evs.map(x => `<div class="ev" data-a="${n}" data-t="${x.t}"><i>${x.t.slice(11, 16)}</i> ${x.etat}</div>`).join('') : '');
    document.getElementById('sdm').style.display = 'block'; document.getElementById('sdb').textContent = 'Envoyer à l’agent ' + n;
  }
  function panneau() {
    const ET = ['veille', 'concept', 'scénario', 'DA', 'critique', 'génération', 'publication'];
    document.getElementById('sdk').innerHTML = Object.keys(data.taches || {}).length ? '<div class="k"><div class="h"></div>' + ET.map(e => `<div class="h" style="text-align:center">${e.slice(0, 4)}</div>`).join('') + '</div>' +
      Object.entries(data.taches).map(([c, v]) => `<div class="k"><div class="h">${c}</div>${ET.map(e => `<div class="${e === v.etape ? 'on' : ''}">${e === v.etape ? '●' : ''}</div>`).join('')}</div>`).join('') : '<i>Aucune vidéo en cours.</i>';
    document.getElementById('sdj').innerHTML = (data.journal || []).slice().reverse().slice(0, 40).map(e =>
      `<div class="ev" data-a="${e.agent}" data-t="${e.t}"><i>${e.t.slice(11, 16)}</i> · ${NOMS[e.agent] || 'agent ' + e.agent} : ${e.etat}${e.vers ? ' → ' + (NOMS[e.vers] || e.vers) : ''}</div>`).join('');
    if (sel !== null && !document.querySelector('#sdi .ev:hover')) detail(sel);
  }
  p.addEventListener('click', ev => { const d = ev.target.closest('.ev'); if (!d) return;
    const e = (data.journal || []).find(x => x.t === d.dataset.t && String(x.agent) === d.dataset.a); detail(d.dataset.a, e);
    if (os) os.selectedAgentId = ID(d.dataset.a) });
  // messagerie : Google Apps Script de la boîte du studio (aucune page qui s'ouvre)
  p.addEventListener('click', async ev => { if (ev.target.id !== 'sdb') return;
    const txt = document.getElementById('sdx').value.trim(), r = document.getElementById('sdr'); if (!txt || sel === null) return;
    let url, cle; try { url = localStorage.getItem('sd_url'); cle = localStorage.getItem('sd_cle') } catch (e) {}
    if (!url) { url = prompt('Adresse du script de messagerie (une seule fois, voir le mail « Messagerie du studio ») :'); cle = prompt('Code secret de la messagerie :');
      try { localStorage.setItem('sd_url', url); localStorage.setItem('sd_cle', cle) } catch (e) {} }
    if (!url) return;
    r.textContent = 'Envoi…';
    try { await fetch(url, {method: 'POST', mode: 'no-cors', body: JSON.stringify({cle, agent: sel, texte: txt})});
      r.textContent = '✅ Envoyé. L’agent le lit au prochain passage (≤ 30 min) ; réponse dans le journal du soir.'; document.getElementById('sdx').value = '' }
    catch (e) { r.textContent = '❌ Envoi impossible : ' + e.message } });
  document.addEventListener('DOMContentLoaded', () => { document.body.append(t, p, leg) });
  if (document.body) document.body.append(t, p, leg);
  // attente du moteur (référence exposée par le correctif du build) puis démarrage
  fetch('assets/studio-areas.json').then(r => r.json()).then(a => { areas = a });
  const att = setInterval(() => { os = window.__studio && window.__studio.current;
    if (os && os.layout && os.seats && os.seats.size && Object.keys(areas).length) { clearInterval(att); demarrer();
      setInterval(() => { if (os.selectedAgentId != null && N(os.selectedAgentId) !== +sel && NOMS[N(os.selectedAgentId)]) detail(String(N(os.selectedAgentId))) }, 400) } }, 300);
  // masquer l'interface de développement de pixel-agents ; dézoomer pour voir tout le bâtiment
  const cache = document.createElement('style');
  cache.textContent = `#root div.absolute.left-10.bottom-10,#root div.absolute.bottom-42,#root div.absolute.bottom-8.right-28,
    #root .mobile-safe-top,#root > div > div.relative.z-30{display:none!important}`;
  document.head.appendChild(cache);
  let zoomFait = 0;
  const z = setInterval(() => { const bs = document.querySelectorAll('#root div.absolute.top-8.left-8 button');
    if (bs.length === 2 && os) { bs[1].click(); if (++zoomFait >= 2) clearInterval(z) } }, 600);
  charger(); setInterval(charger, 30000);
})();
