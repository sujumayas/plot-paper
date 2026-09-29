export function FooterIBK() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer-ibk">
      <div className="body">
        <div>
          <h4>Plotpaper</h4>
          <p>
            Un patio de juegos para visualizar datos. Elige un tipo de gráfico,
            arrastra tu CSV y publícalo a la galería.
          </p>
        </div>
        <div>
          <h4>Producto</h4>
          <ul>
            <li><a href="/explore">Explorar</a></li>
            <li><a href="/build">Construir</a></li>
            <li><a href="/dev/viz-gallery">Galería de tipos</a></li>
          </ul>
        </div>
        <div>
          <h4>Soporte</h4>
          <ul>
            <li>WhatsApp · 999 999 999</li>
            <li>Torre Interbank — Carlos Villarán 140, La Victoria</li>
          </ul>
        </div>
      </div>
      <div
        className="body"
        style={{ paddingTop: 0, paddingBottom: 18, color: "var(--fg-4)" }}
      >
        <span style={{ fontSize: 11 }}>© {year}. Todos los derechos reservados.</span>
      </div>
      <div className="strip" aria-hidden />
    </footer>
  );
}
