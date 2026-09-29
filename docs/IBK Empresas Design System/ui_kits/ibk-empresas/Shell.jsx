// Shell v3 — inline SVG icons match the reference exactly

const ASSET = "../../assets";
const ICON = `${ASSET}/icons`;

// --- inline SVG icon set (stroke-based, matches reference) ---
const Icons = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 3l9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-9Z"/></svg>,
  bars: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20v-5"/></svg>,
  arrows: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5v11m0 0-3-3m3 3 3-3M17 19V8m0 0-3 3m3-3 3 3"/></svg>,
  clip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6l1 2h3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h3l1-2Z"/><path d="M9 11h6M9 15h4"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1h-.2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7.1 4.3l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  folder: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="#F99100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v5M12 18h.01"/></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path d="m4 4 16 16" stroke="currentColor"/></svg>,
  // quick-access (filled, brand-green)
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="#05BE50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M15 3v5h4M9 13h6M9 17h4"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="#05BE50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5v11m0 0-3-3m3 3 3-3M17 19V8m0 0-3 3m3-3 3 3"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="#05BE50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  bills: <svg viewBox="0 0 24 24" fill="none" stroke="#05BE50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"/><path d="M8 12h.01M16 12h.01"/></svg>,
  person: <svg viewBox="0 0 24 24" fill="none" stroke="#05BE50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="#05BE50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8.5 18 4.5V8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10.5a2 2 0 0 1 2-2Z"/><circle cx="17" cy="14" r="1.4" fill="#05BE50"/></svg>,
  coin: <svg viewBox="0 0 28 26" fill="none"><g stroke="#05BE50" strokeWidth="1.6" fill="none"><circle cx="10" cy="13" r="7" fill="#E9F9F0"/><path d="M10 9v8M12.5 10.5c-1-1.2-4-1.2-4 .5s4 1 4 2.5c0 1.6-3 1.6-4 .5"/><circle cx="19" cy="8" r="3" fill="#FFD98E"/><circle cx="21" cy="18" r="2.3" fill="#FFD98E"/></g></svg>,
};

function SideNav({active="inicio"}) {
  const items = [
    ["inicio","Inicio","home"],
    ["consultas","Consultas","bars"],
    ["pagos","Pagos y trans.","arrows"],
    ["solicitudes","Solicitudes","clip"],
    ["autorizar","Autorizar","check"],
    ["config","Config. y más","gear"],
  ];
  return (
    <nav className="sidenav">
      <div className="brand">
        <svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="5" width="18" height="14" rx="2" fill="#fff"/><rect x="6.5" y="8.5" width="11" height="7" rx="1" fill="none" stroke="#0039A6" strokeWidth="1.6"/></svg>
      </div>
      {items.map(([k,l,ic]) => (
        <div key={k} className={`sn-item ${active===k?"active":""}`}>
          <span className="ico">{Icons[ic]}</span>
          <span className="lbl">{l}</span>
        </div>
      ))}
    </nav>
  );
}

function TopBar({user="Alfonso", empresa="Luchito SAC"}) {
  return (
    <header className="topbar">
      <div className="hello">
        <h1>Hola, {user}</h1>
        <div className="sub"><span className="bldg">{Icons.folder}</span>Empresa: <b>{empresa}</b> <a>Cambiar empresa</a></div>
      </div>
      <div className="promo">
        <div className="ic">{Icons.coin}</div>
        <div className="txt">¡Tienes un <b>tipo de cambio especial</b> por tiempo limitado!</div>
      </div>
      <div className="top-actions">
        <div className="ta-btn"><span className="ico">{Icons.search}</span><span className="lbl">Buscar</span></div>
        <div className="ta-btn"><span className="ico">{Icons.bell}</span><span className="lbl">Notificaciones</span></div>
        <div className="user">
          <div className="av">{Icons.user}</div>
          <svg className="caret" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, {SideNav, TopBar, Icons, ASSET, ICON});
