// Screens v3 — Home matches reference exactly

function HomeScreen() {
  const favs = [
    ["Corriente Soles","100-7000157402","S/ 53,148,000.64"],
    ["Corriente Soles","100-7000157402","S/ 45,000.74"],
    ["Corriente Soles","100-7000157402","$ 144,000.34"],
    ["Corriente Soles","100-7000157402","S/ 53,148,000.64"],
    ["Corriente Soles","100-7000157402","S/ 45,000.74"],
  ];
  const quick = [
    ["Estado de\ncuenta","doc"],
    ["Trans. a\nterceros","send"],
    ["Movimientos","refresh"],
    ["Pago\nmasivos","bills"],
    ["Recaudación","person"],
    ["Saldos","wallet"],
  ];
  return (
    <div className="app">
      <SideNav active="inicio"/>
      <div className="app-body">
        <TopBar/>
        <main className="main">
          {/* LEFT COLUMN */}
          <div className="col-left">
            {/* alert */}
            <div className="alert">
              <div className="warn">{Icons.alert}</div>
              <div className="txt">
                <b>Tu línea de crédito vence en <span className="days">60 días</span></b>
                <div className="sub">Inicia el proceso de renovación para continuar operando sin interrupciones.</div>
              </div>
              <button className="btn-primary">Iniciar renovación</button>
            </div>

            {/* promo carousel */}
            <div className="promo-row">
              <div className="art">
                <svg viewBox="0 0 80 80" width="64" height="64"><g><ellipse cx="40" cy="66" rx="22" ry="3" fill="#D8E6FF"/><rect x="18" y="40" width="44" height="22" rx="3" fill="#0039A6"/><rect x="22" y="46" width="14" height="2" fill="#fff"/><circle cx="40" cy="28" r="10" fill="#F9C48A"/><rect x="30" y="38" width="20" height="8" fill="#0039A6"/></g></svg>
              </div>
              <div className="body">
                <h3>¡Adquiere una tarjeta de crédito para tu empresa!</h3>
                <p>Ingresa aquí y conoce cómo obtener tu tarjeta ¡El mismo día!</p>
              </div>
              <div className="next">›</div>
            </div>
            <div className="dots">
              <span/><span className="on"/><span/>
            </div>

            {/* favoritas */}
            <div className="fav-header">
              <div className="lf">
                <h2>Cuentas favoritas</h2>
                <span className="hide"><span className="eye">{Icons.eye}</span>Ocultar saldos</span>
              </div>
              <div className="rf">Configurar tus <b>cuentas favoritas</b> <a>Configurar <span className="gear">{Icons.gear}</span></a></div>
            </div>
            <div className="fav-grid">
              {favs.map((f,i) => (
                <div key={i} className="fav">
                  <div className="tag">{Icons.folder}</div>
                  <div className="lbl">{f[0]}</div>
                  <div className="num">{f[1]}</div>
                  <div className="amt">{f[2]}</div>
                </div>
              ))}
            </div>
            <div className="fav-cta">
              <button className="btn-primary sm">Ir a mis cuentas</button>
            </div>
          </div>

          {/* RIGHT RAIL */}
          <aside className="rail">
            <h2>Mis accesos rápidos</h2>
            <div className="access">
              {quick.map(([l,ic],i) => (
                <div key={i} className="c">
                  <div className="circle">{Icons[ic]}</div>
                  <div className="lbl">{l.split("\n").map((s,j)=>(<div key={j}>{s}</div>))}</div>
                </div>
              ))}
            </div>

            <h2 className="nov-h">Novedades</h2>
            <div className="novedad">
              <div className="art">
                <svg viewBox="0 0 80 90" width="72" height="80"><g><path d="M18 30 C18 22, 62 22, 62 30 L62 32 L18 32 Z" fill="#05BE50"/><path d="M20 32 C26 26, 54 26, 60 32 L60 35 L20 35 Z" fill="#038E3A"/><path d="M14 34 L66 34 L62 82 Q40 92, 18 82 Z" fill="#05BE50"/><text x="40" y="66" textAnchor="middle" fontFamily="Geometria" fontSize="26" fontWeight="800" fill="#fff">S/</text></g></svg>
              </div>
              <div className="nov-tag">¡Nuevo!</div>
              <h3>Transferencias inmediatas</h3>
              <p>Ahora podrás realizar transferencias al instante en todas tus transacciones.</p>
              <a className="nov-link">Ir a transferencias ›</a>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

function LoginScreen({onLogin}) {
  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="brand" style={{width:160,height:28,background:"#fff",WebkitMask:`url(${ASSET}/logo-interbank-color.svg) left center/contain no-repeat`,mask:`url(${ASSET}/logo-interbank-color.svg) left center/contain no-repeat`}}/>
        <div>
          <h1>Banca por Internet Empresas</h1>
          <p>Gestiona los pagos, transferencias y solicitudes de tu empresa desde donde estés.</p>
        </div>
        <div style={{fontFamily:"Montserrat",fontSize:12,opacity:.75,position:"relative",zIndex:1}}>© 2026 Interbank</div>
      </div>
      <form className="login-form" onSubmit={e=>{e.preventDefault();onLogin&&onLogin();}}>
        <h2>Ingresa a tu empresa</h2>
        <p className="sub">Usa tu usuario y contraseña de Banca por Internet Empresas.</p>
        <div className="field"><label>RUC de la empresa</label><input defaultValue="20512345678"/></div>
        <div className="field"><label>Usuario</label><input defaultValue="alfonso"/></div>
        <div className="field"><label>Contraseña</label><input type="password" placeholder="Ingresa tu contraseña"/></div>
        <button className="btn-primary" style={{width:"100%",marginTop:4,height:48,borderRadius:24}}>Ingresar</button>
        <div className="links"><a>¿Olvidaste tu contraseña?</a><a>Soy usuario nuevo</a></div>
      </form>
    </div>
  );
}

Object.assign(window, {HomeScreen, LoginScreen});
