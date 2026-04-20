import { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════
//  CONFIG — Remplace par l'URL de ton serveur Railway
// ════════════════════════════════════════════════════════════
const BACKEND_URL = "https://oracle-backend-production-33ad.up.railway.app";

// ════════════════════════════════════════════════════════════
//  DONNÉES DÉMO
// ════════════════════════════════════════════════════════════
const DEMO_MATCHES = [
  { fixture: { id: 1, date: new Date().toISOString(), status: { short: "NS" } }, league: { name: "Ligue 1", country: "France", flag: "🇫🇷" }, teams: { home: { name: "PSG" }, away: { name: "Lyon" } }, goals: { home: null, away: null } },
  { fixture: { id: 2, date: new Date().toISOString(), status: { short: "NS" } }, league: { name: "Premier League", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, teams: { home: { name: "Arsenal" }, away: { name: "Chelsea" } }, goals: { home: null, away: null } },
  { fixture: { id: 3, date: new Date().toISOString(), status: { short: "NS" } }, league: { name: "La Liga", country: "Spain", flag: "🇪🇸" }, teams: { home: { name: "Real Madrid" }, away: { name: "Atletico" } }, goals: { home: null, away: null } },
  { fixture: { id: 4, date: new Date().toISOString(), status: { short: "NS" } }, league: { name: "Bundesliga", country: "Germany", flag: "🇩🇪" }, teams: { home: { name: "Bayern" }, away: { name: "Dortmund" } }, goals: { home: null, away: null } },
  { fixture: { id: 5, date: new Date().toISOString(), status: { short: "NS" } }, league: { name: "Serie A", country: "Italy", flag: "🇮🇹" }, teams: { home: { name: "Inter" }, away: { name: "Juventus" } }, goals: { home: null, away: null } },
];

const DEMO_ANALYSIS = {
  1: { homeProb: 65, drawProb: 22, awayProb: 13, confidence: 81, recommendation: "home", recommendationLabel: "PSG", reasoning: "PSG domine la Ligue 1 avec 70% de victoires à domicile. Le xG moyen de 2.4 buts/match confirme leur supériorité offensive. Lyon en déplacement n'a gagné que 2 matchs sur 8.", keyFactors: ["Domination à domicile", "Forme 5/5 récente", "xG supérieur"], risks: "PSG peut se permettre de lever le pied si déjà qualifié", valueBet: true },
  2: { homeProb: 44, drawProb: 27, awayProb: 29, confidence: 58, recommendation: "home", recommendationLabel: "Arsenal", reasoning: "Match équilibré mais Arsenal à domicile a un léger avantage. Les deux équipes sont en bonne forme. H2H récent favorable à Arsenal (3W/2D/0L).", keyFactors: ["Avantage domicile", "H2H favorable"], risks: "Chelsea en forme avec 4 victoires consécutives", valueBet: false },
  3: { homeProb: 54, drawProb: 24, awayProb: 22, confidence: 72, recommendation: "home", recommendationLabel: "Real Madrid", reasoning: "Le Derby de Madrid historiquement favorable au Real (12W/7D/5L). Real en pleine confiance après la Ligue des Champions. Atletico solide mais plus fragile en déplacement.", keyFactors: ["H2H historique", "Forme récente Real", "Soutien du Bernabeu"], risks: "Atletico excelle dans les derbies tactiques bas blocs", valueBet: false },
  4: { homeProb: 61, drawProb: 22, awayProb: 17, confidence: 78, recommendation: "home", recommendationLabel: "Bayern", reasoning: "Bayern domine le Klassiker avec 13 victoires sur 20. Leur attaque marque en moyenne 2.6 buts/match à domicile. Dortmund en difficulté cette saison.", keyFactors: ["Historique dominant", "Efficacité offensive", "Dortmund instable"], risks: "Dortmund peut créer la surprise dans les grands matchs", valueBet: true },
  5: { homeProb: 38, drawProb: 34, awayProb: 28, confidence: 55, recommendation: "draw", recommendationLabel: "Nul", reasoning: "Le Derby della Madonnina est historiquement équilibré (9W/10D/7L). Les deux équipes sont proches au classement. Match à forts enjeux propice aux derbies fermés.", keyFactors: ["Historique équilibré", "Derby tactique", "Enjeu élevé"], risks: "Inter légèrement favori à domicile cette saison", valueBet: false },
};

// ════════════════════════════════════════════════════════════
//  API CALLS VERS RAILWAY
// ════════════════════════════════════════════════════════════
async function apiCall(path, options = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Erreur serveur ${res.status}`);
  return res.json();
}

// ════════════════════════════════════════════════════════════
//  COMPOSANTS
// ════════════════════════════════════════════════════════════
function Spinner({ size = 16 }) {
  return <div style={{ display: "inline-block", width: size, height: size, border: "2px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

function ConfBar({ value }) {
  const color = value >= 75 ? "#22c55e" : value >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1.2s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 34 }}>{value}%</span>
    </div>
  );
}

function ProbRow({ homeProb, drawProb, awayProb, home, away, recommendation }) {
  const items = [
    { type: "home", label: "1", name: home, prob: homeProb, color: "#6366f1" },
    { type: "draw", label: "X", name: "Nul", prob: drawProb, color: "#f59e0b" },
    { type: "away", label: "2", name: away, prob: awayProb, color: "#ef4444" },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {items.map(it => (
        <div key={it.type} style={{ flex: 1, textAlign: "center", background: recommendation === it.type ? it.color : "#f8fafc", border: `1.5px solid ${recommendation === it.type ? it.color : "#e2e8f0"}`, borderRadius: 12, padding: "10px 4px", boxShadow: recommendation === it.type ? `0 4px 14px ${it.color}40` : "none", transition: "all 0.3s" }}>
          <div style={{ fontSize: 9, color: recommendation === it.type ? "rgba(255,255,255,0.7)" : "#94a3b8", fontWeight: 700 }}>{it.label}</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: recommendation === it.type ? "#fff" : "#0f172a", margin: "3px 0" }}>{it.prob}%</div>
          <div style={{ fontSize: 9, color: recommendation === it.type ? "rgba(255,255,255,0.8)" : "#94a3b8" }}>{it.name.slice(0, 9)}</div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("today");
  const [isDemo, setIsDemo] = useState(false);
  const [serverUrl, setServerUrl] = useState(BACKEND_URL);
  const [serverInput, setServerInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [matches, setMatches] = useState([]);
  const [analyses, setAnalyses] = useState({});
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [agentMsgs, setAgentMsgs] = useState([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [comboSize, setComboSize] = useState(2);
  const [expanded, setExpanded] = useState(null);
  const [notif, setNotif] = useState(null);
  const chatRef = useRef(null);

  const showNotif = (msg, type = "blue") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  // ── CONNEXION SERVEUR ─────────────────────────────────────
  const connectServer = async (url) => {
    setLoadingMatches(true);
    showNotif("📡 Connexion au serveur...", "blue");
    try {
      const data = await apiCall("/matches");
      setMatches(data.matches || []);
      setConnected(true);
      setIsDemo(false);
      showNotif(`✅ ${data.count} matchs chargés depuis Railway`, "green");
      loadHistory(url);
      loadStats(url);
    } catch (e) {
      showNotif(`❌ Serveur inaccessible: ${e.message}`, "red");
    }
    setLoadingMatches(false);
  };

  const loadHistory = async () => {
    try {
      const data = await apiCall("/history");
      setHistory(data.history || []);
    } catch {}
  };

  const loadStats = async () => {
    try {
      const data = await apiCall("/stats");
      setStats(data.stats);
    } catch {}
  };

  const startDemo = () => {
    setMatches(DEMO_MATCHES);
    setAnalyses(DEMO_ANALYSIS);
    setIsDemo(true);
    setConnected(true);
    showNotif("🎮 Mode démo activé", "blue");
  };

  // ── ANALYSER UN MATCH ─────────────────────────────────────
  const analyzeMatch = async (match) => {
    const fid = match.fixture.id;
    if (isDemo) {
      showNotif("🎮 En démo — connecte ton serveur Railway pour de vraies analyses IA", "blue");
      return;
    }
    setAnalyzingId(fid);
    showNotif("🧠 ORACLE analyse ce match...", "blue");
    try {
      const data = await apiCall(`/analyze/${fid}`, { method: "POST" });
      setAnalyses(prev => ({ ...prev, [fid]: data.analysis }));
      showNotif("✅ Analyse terminée !", "green");
    } catch (e) {
      showNotif(`❌ ${e.message}`, "red");
    }
    setAnalyzingId(null);
  };

  const analyzeAll = async () => {
    if (isDemo) { showNotif("🎮 Démo — analyses simulées uniquement", "blue"); return; }
    for (const m of matches.slice(0, 5)) {
      await analyzeMatch(m);
      await new Promise(r => setTimeout(r, 1500));
    }
    loadHistory();
    loadStats();
  };

  // ── COMBINÉS ──────────────────────────────────────────────
  const getCombos = (size) => {
    const ready = Object.entries(analyses).map(([fid, an]) => ({
      fid: parseInt(fid), an,
      match: matches.find(m => m.fixture.id === parseInt(fid)),
    })).filter(x => x.match && x.an?.confidence);

    const results = [];
    function combine(start, cur) {
      if (cur.length === size) {
        const combinedProb = cur.reduce((acc, x) => {
          const p = x.an.recommendation;
          return acc * ((p === "home" ? x.an.homeProb : p === "draw" ? x.an.drawProb : x.an.awayProb) / 100);
        }, 1) * 100;
        const avgConf = Math.round(cur.reduce((a, x) => a + x.an.confidence, 0) / cur.length);
        results.push({ items: cur, combinedProb: parseFloat(combinedProb.toFixed(1)), avgConf });
        return;
      }
      for (let i = start; i < ready.length; i++) { cur.push(ready[i]); combine(i + 1, cur); cur.pop(); }
    }
    combine(0, []);
    return results.sort((a, b) => b.avgConf - a.avgConf).slice(0, 3);
  };

  // ── AGENT ────────────────────────────────────────────────
  const sendMsg = async () => {
    if (!agentInput.trim() || agentLoading) return;
    const msg = agentInput.trim();
    setAgentInput("");
    const newMsgs = [...agentMsgs, { role: "user", content: msg }];
    setAgentMsgs(newMsgs);
    setAgentLoading(true);
    try {
      let reply;
      if (isDemo) {
        // Agent démo local
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: `Tu es ORACLE, expert en paris sportifs. Données du jour: PSG vs Lyon (prono PSG 65%), Arsenal vs Chelsea (44%), Real vs Atletico (54%), Bayern vs Dortmund (61%), Inter vs Juventus (Nul 34%). Réponds en français.`,
            messages: newMsgs,
          }),
        });
        const d = await res.json();
        reply = d.content?.[0]?.text || "Erreur.";
      } else {
        const data = await apiCall("/agent", { method: "POST", body: JSON.stringify({ messages: newMsgs }) });
        reply = data.reply;
      }
      setAgentMsgs([...newMsgs, { role: "assistant", content: reply }]);
    } catch (e) {
      setAgentMsgs([...newMsgs, { role: "assistant", content: `Erreur: ${e.message}` }]);
    }
    setAgentLoading(false);
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 100);
  };

  const C = { purple: "#6366f1", green: "#22c55e", yellow: "#f59e0b", red: "#ef4444", gray: "#94a3b8", dark: "#0f172a", border: "#e2e8f0", white: "#ffffff", light: "#f8fafc" };
  const winRate = stats ? stats.winrate : history.length > 0 ? Math.round(history.filter(h => h.won).length / history.length * 100) : 0;
  const combos = getCombos(comboSize);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f1f5f9", minHeight: "100vh", color: C.dark, paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        button:active { opacity:0.82; transform:scale(0.98); }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
      `}</style>

      {notif && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: notif.type === "green" ? "#f0fdf4" : notif.type === "red" ? "#fff1f2" : "#eef2ff", border: `1px solid ${notif.type === "green" ? "#86efac" : notif.type === "red" ? "#fecaca" : "#c7d2fe"}`, color: notif.type === "green" ? C.green : notif.type === "red" ? C.red : C.purple, borderRadius: 14, padding: "12px 22px", fontSize: 13, fontWeight: 600, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", whiteSpace: "nowrap", animation: "fadeIn 0.3s ease" }}>
          {notif.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "16px 16px 0", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, background: `linear-gradient(135deg,${C.purple},#8b5cf6)`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>ORACLE</div>
          </div>
          <div style={{ fontSize: 9, background: connected ? (isDemo ? "#fefce8" : "#f0fdf4") : "#f1f5f9", color: connected ? (isDemo ? C.yellow : C.green) : C.gray, border: `1px solid ${connected ? (isDemo ? "#fde68a" : "#bbf7d0") : C.border}`, borderRadius: 20, padding: "4px 10px", fontWeight: 700 }}>
            {connected ? (isDemo ? "🎮 DÉMO" : "● LIVE") : "○ OFF"}
          </div>
        </div>
        <div style={{ display: "flex", overflowX: "auto" }}>
          {[["today", "📅 Matchs"], ["combos", "🎯 Combinés"], ["history", "📊 Historique"], ["agent", "🧠 Agent"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: tab === k ? C.purple : C.gray, background: "none", border: "none", borderBottom: `2px solid ${tab === k ? C.purple : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* SETUP */}
      {!connected && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, margin: "20px 14px", animation: "fadeIn 0.4s ease" }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>🚀 Connecte ton serveur Railway</div>
          <div style={{ fontSize: 12, color: C.gray, marginBottom: 14, lineHeight: 1.7 }}>
            Entre l'URL de ton projet Railway. Elle ressemble à :<br />
            <code style={{ background: "#f8fafc", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>https://TON-PROJET.up.railway.app</code>
          </div>
          <input
            style={{ background: C.light, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "11px 14px", fontSize: 13, color: C.dark, outline: "none", width: "100%", marginBottom: 10 }}
            placeholder="https://ton-projet.up.railway.app"
            value={serverInput}
            onChange={e => setServerInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && connectServer(serverInput)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => connectServer(serverInput)} style={{ flex: 2, background: `linear-gradient(135deg,${C.purple},#8b5cf6)`, border: "none", borderRadius: 12, padding: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: `0 4px 14px ${C.purple}50`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {loadingMatches ? <><Spinner /> Connexion...</> : "🔗 Connecter Railway"}
            </button>
            <button onClick={startDemo} style={{ flex: 1, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 12, color: C.gray, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              🎮 Démo
            </button>
          </div>
        </div>
      )}

      {/* TODAY */}
      {tab === "today" && connected && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 14px 4px" }}>
            <div style={{ fontSize: 10, color: C.gray, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>{matches.length} matchs · {Object.keys(analyses).length} analysés</div>
            <button onClick={analyzeAll} style={{ background: `linear-gradient(135deg,${C.purple},#8b5cf6)`, border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", boxShadow: `0 3px 10px ${C.purple}40`, display: "flex", alignItems: "center", gap: 5 }}>
              {analyzingId ? <><Spinner size={12} /> En cours...</> : "⚡ Tout analyser"}
            </button>
          </div>

          {matches.map(match => {
            const fid = match.fixture.id;
            const an = analyses[fid];
            const isAnalyzing = analyzingId === fid;

            return (
              <div key={fid} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, margin: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", animation: "fadeIn 0.4s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: 1 }}>{match.league.flag} {match.league.name}</span>
                  <span style={{ fontSize: 10, color: C.gray }}>{new Date(match.fixture.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{match.teams.home.name}</div>
                    <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>Domicile</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.gray, fontWeight: 700, background: C.light, borderRadius: 8, padding: "4px 12px" }}>VS</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{match.teams.away.name}</div>
                    <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>Extérieur</div>
                  </div>
                </div>

                {an ? (
                  <div style={{ animation: "fadeIn 0.5s ease" }}>
                    <ProbRow homeProb={an.homeProb} drawProb={an.drawProb} awayProb={an.awayProb} home={match.teams.home.name} away={match.teams.away.name} recommendation={an.recommendation} />

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>Confiance ORACLE</div>
                      <ConfBar value={an.confidence} />
                    </div>

                    <div style={{ marginTop: 12, padding: "12px 14px", background: "#f8fafc", borderRadius: 12, borderLeft: `3px solid ${C.purple}` }}>
                      <div style={{ fontSize: 10, color: C.purple, fontWeight: 700, marginBottom: 4 }}>🧠 RAISONNEMENT</div>
                      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{an.reasoning}</div>
                    </div>

                    {an.keyFactors?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {an.keyFactors.map((f, i) => (
                          <span key={i} style={{ fontSize: 10, background: "#eef2ff", color: C.purple, borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>{f}</span>
                        ))}
                      </div>
                    )}

                    {an.risks && <div style={{ marginTop: 8, fontSize: 11, color: C.yellow, background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 10px" }}>⚠️ {an.risks}</div>}
                    {an.valueBet && <div style={{ marginTop: 8, fontSize: 11, color: C.green, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 10px", fontWeight: 700 }}>💎 VALUE BET détecté</div>}
                  </div>
                ) : (
                  <button onClick={() => analyzeMatch(match)} disabled={isAnalyzing} style={{ width: "100%", background: isAnalyzing ? C.light : `linear-gradient(135deg,${C.purple},#8b5cf6)`, border: "none", borderRadius: 12, padding: 12, color: isAnalyzing ? C.gray : "#fff", fontWeight: 700, fontSize: 13, cursor: isAnalyzing ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {isAnalyzing ? <><Spinner /> Analyse en cours...</> : "🧠 Analyser ce match"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* COMBINÉS */}
      {tab === "combos" && connected && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ padding: "14px 14px 8px" }}>
            <div style={{ fontSize: 10, color: C.gray, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>Taille du combiné</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setComboSize(n)} style={{ flex: 1, padding: 12, borderRadius: 12, fontWeight: 800, fontSize: 17, cursor: "pointer", background: comboSize === n ? `linear-gradient(135deg,${C.purple},#8b5cf6)` : C.white, border: `1.5px solid ${comboSize === n ? C.purple : C.border}`, color: comboSize === n ? "#fff" : C.gray, boxShadow: comboSize === n ? `0 4px 14px ${C.purple}40` : "none", transition: "all 0.2s" }}>{n}</button>
              ))}
            </div>
          </div>

          {combos.length === 0 ? (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 30, margin: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: C.gray }}>Analyse au moins {comboSize} matchs pour générer des combinés</div>
            </div>
          ) : combos.map((combo, i) => (
            <div key={i} style={{ background: i === 0 ? "#f0fdf4" : C.white, border: `1.5px solid ${i === 0 ? "#86efac" : C.border}`, borderRadius: 16, padding: 18, margin: "10px 14px", animation: "fadeIn 0.4s ease" }}>
              {i === 0 && <div style={{ fontSize: 9, color: C.green, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>⭐ MEILLEUR COMBINÉ</div>}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.gray }}>Probabilité combinée</div>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>{combo.combinedProb}%</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: C.gray }}>Confiance moy.</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: C.purple }}>{combo.avgConf}%</div>
                </div>
              </div>
              <ConfBar value={combo.avgConf} />
              {combo.items.map((x, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${C.border}`, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{x.match.teams.home.name} vs {x.match.teams.away.name}</div>
                    <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{x.match.league.flag} {x.match.league.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, fontStyle: "italic" }}>{x.an.reasoning?.slice(0, 65)}...</div>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 10, minWidth: 80 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.purple }}>{x.an.recommendationLabel}</div>
                    <div style={{ fontSize: 10, color: C.gray }}>{x.an.recommendation === "home" ? x.an.homeProb : x.an.recommendation === "draw" ? x.an.drawProb : x.an.awayProb}%</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* HISTORIQUE */}
      {tab === "history" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 14px" }}>
            {[
              { val: `${winRate}%`, lbl: "Taux réussite", color: winRate >= 55 ? C.green : winRate >= 40 ? C.yellow : C.red },
              { val: history.length || stats?.total || 0, lbl: "Analyses", color: C.dark },
              { val: stats?.total_value_bets > 0 ? `${Math.round(stats.value_bet_wins / stats.total_value_bets * 100)}%` : "—", lbl: "Value Bet ✓", color: C.purple },
              { val: history.filter ? history.filter(h => h.won).length : stats?.wins || 0, lbl: "Gagnés", color: C.green },
            ].map((s, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: C.gray, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, margin: "0 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🤖 Enregistrement automatique</div>
            <div style={{ fontSize: 12, color: C.gray, marginBottom: 14 }}>Le bot Railway vérifie les résultats chaque heure et enregistre automatiquement gagné/perdu.</div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: C.gray, fontSize: 12 }}>Les résultats s'accumuleront ici automatiquement.</div>
            ) : history.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{h.match_name}</div>
                  <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{h.league} · {h.match_date}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Prono: <strong>{h.recommendation_label}</strong> · Conf. {h.confidence}%</div>
                </div>
                <div style={{ background: h.won ? "#f0fdf4" : h.won === false ? "#fff1f2" : "#f8fafc", color: h.won ? C.green : h.won === false ? C.red : C.gray, border: `1px solid ${h.won ? "#bbf7d0" : h.won === false ? "#fecaca" : C.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 10, fontWeight: 700, marginLeft: 10, whiteSpace: "nowrap" }}>
                  {h.won === true ? "✓ Gagné" : h.won === false ? "✗ Perdu" : "⏳ En attente"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AGENT */}
      {tab === "agent" && (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)", animation: "fadeIn 0.3s ease" }}>
          <div style={{ padding: "10px 14px", background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${C.purple},#8b5cf6)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧠</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Agent ORACLE</div>
              <div style={{ fontSize: 10, color: C.gray }}>{isDemo ? "Mode démo" : "Connecté Railway"} · {history.length} résultats · {winRate}% réussite</div>
            </div>
          </div>

          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "#f8fafc" }}>
            {agentMsgs.length === 0 && (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🧠</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>ORACLE est prêt</div>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 16, lineHeight: 1.6 }}>Je raisonne sur les données réelles. Pose-moi n'importe quelle question.</div>
                {["Quel est le meilleur pari aujourd'hui ?", "Y a-t-il des value bets ?", "Quelle combinaison recommandes-tu ?", "Analyse mes performances"].map(q => (
                  <button key={q} onClick={() => setAgentInput(q)} style={{ display: "block", width: "100%", marginBottom: 8, padding: "10px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, color: C.purple, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>{q}</button>
                ))}
              </div>
            )}
            {agentMsgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? `linear-gradient(135deg,${C.purple},#8b5cf6)` : C.white, color: m.role === "user" ? "#fff" : C.dark, borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "12px 16px", maxWidth: "85%", fontSize: 13, lineHeight: 1.6, border: m.role === "assistant" ? `1px solid ${C.border}` : "none", animation: "fadeIn 0.3s ease" }}>
                {m.role === "assistant" && <div style={{ fontSize: 9, color: C.purple, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>🧠 ORACLE</div>}
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              </div>
            ))}
            {agentLoading && (
              <div style={{ alignSelf: "flex-start", background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner /><span style={{ fontSize: 12, color: C.gray }}>ORACLE réfléchit...</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, padding: "12px 14px", background: C.white, borderTop: `1px solid ${C.border}` }}>
            <input style={{ flex: 1, background: C.light, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "11px 14px", fontSize: 13, color: C.dark, outline: "none" }} value={agentInput} onChange={e => setAgentInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="Pose ta question à ORACLE..." />
            <button onClick={sendMsg} disabled={agentLoading} style={{ background: `linear-gradient(135deg,${C.purple},#8b5cf6)`, border: "none", borderRadius: 12, padding: "11px 18px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: `0 4px 12px ${C.purple}40` }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}
