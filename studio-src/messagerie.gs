// Messagerie du Studio en direct — à coller dans https://script.google.com depuis la boîte studiodecodediffusion@gmail.com.
// Le message part de la boîte du studio vers elle-même : le facteur (GitHub) le lit comme « agent N - … ».
const CLE = 'REMPLACE-MOI-par-un-code-secret';
function doPost(e) {
  const d = JSON.parse(e.postData.contents || '{}');
  if (d.cle !== CLE) return ContentService.createTextOutput('refus');
  const n = String(d.agent).replace(/[^0-9.]/g, '');
  const txt = String(d.texte || '').slice(0, 4000);
  if (!n || !txt) return ContentService.createTextOutput('vide');
  GmailApp.sendEmail(Session.getActiveUser().getEmail(), 'agent ' + n + ' - ' + txt.split('\n')[0].slice(0, 80), txt);
  return ContentService.createTextOutput('ok');
}
