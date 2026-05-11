(() => {
  const links = [
    ['Oljen', '/organic-extra-virgin-olive-oil.html'],
    ['For restauranter', '/olive-oil-for-restaurants.html'],
    ['B2B', '/b2b-olive-oil.html'],
    ['Sporbarhet', '/olive-oil-traceability.html'],
    ['Tasting kit', '/tasting-kit.html'],
    ['Portal', '/app'],
  ];

  const products = [
    ['Verde Vivo', '/product-verde-vivo.html'],
    ['Raíz Antigua', '/product-raiz-antigua.html'],
    ['Verde Alto', '/product-verde-alto.html'],
    ['Cocina Viva', '/product-cocina-viva.html'],
    ['Mesa Gordal', '/product-mesa-gordal-noble.html'],
  ];

  const allLinks = [...links, ...products];

  const createMenu = () => {
    if (document.getElementById('donaanna-professional-menu')) return;

    const menu = document.createElement('div');
    menu.id = 'donaanna-professional-menu';
    menu.setAttribute('aria-label', 'Doña Anna meny');
    menu.innerHTML = `
      <button class="da-menu-toggle" type="button" aria-expanded="false" aria-controls="da-menu-panel">
        <span class="da-menu-lines" aria-hidden="true"><span></span><span></span><span></span></span>
        <span class="da-menu-label">Meny</span>
      </button>
      <div id="da-menu-panel" class="da-menu-panel" hidden>
        <div class="da-menu-section">
          <p>Doña Anna</p>
          ${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}
        </div>
        <div class="da-menu-section">
          <p>Produkter</p>
          ${products.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}
        </div>
      </div>
    `;

    const desktop = document.createElement('nav');
    desktop.id = 'donaanna-desktop-links';
    desktop.setAttribute('aria-label', 'Doña Anna hurtiglenker');
    desktop.innerHTML = `
      <div class="da-desktop-inner">
        ${allLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}
      </div>
    `;

    const style = document.createElement('style');
    style.id = 'donaanna-professional-menu-style';
    style.textContent = `
      #donaanna-professional-menu,
      #donaanna-desktop-links {
        font-family: Inter, Montserrat, Arial, sans-serif;
      }

      #donaanna-desktop-links {
        position: relative;
        z-index: 20;
        width: 100%;
        background: rgba(11, 12, 9, 0.94);
        border-top: 1px solid rgba(201, 169, 110, 0.10);
        border-bottom: 1px solid rgba(201, 169, 110, 0.18);
      }

      #donaanna-desktop-links .da-desktop-inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 8px 22px;
        display: flex;
        align-items: center;
        gap: 18px;
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: thin;
      }

      #donaanna-desktop-links a {
        color: #d7c89e;
        text-decoration: none;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.25px;
        font-weight: 800;
        padding: 6px 0;
      }

      #donaanna-desktop-links a:hover { color: #f1d889; }

      #donaanna-professional-menu {
        position: fixed;
        right: 18px;
        top: 18px;
        z-index: 10000;
        display: none;
      }

      #donaanna-professional-menu .da-menu-toggle {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        border: 1px solid rgba(201, 169, 110, 0.42);
        background: rgba(8, 9, 7, 0.92);
        color: #f6f0df;
        padding: 10px 13px;
        border-radius: 999px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        font-weight: 800;
        cursor: pointer;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      #donaanna-professional-menu .da-menu-lines {
        width: 16px;
        display: grid;
        gap: 3px;
      }

      #donaanna-professional-menu .da-menu-lines span {
        display: block;
        height: 2px;
        background: #c9a96e;
        border-radius: 2px;
      }

      #donaanna-professional-menu .da-menu-panel {
        position: absolute;
        right: 0;
        top: calc(100% + 10px);
        width: min(86vw, 340px);
        max-height: calc(100vh - 92px);
        overflow-y: auto;
        background: rgba(8, 9, 7, 0.98);
        border: 1px solid rgba(201, 169, 110, 0.28);
        border-radius: 18px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        padding: 18px;
      }

      #donaanna-professional-menu .da-menu-section + .da-menu-section {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid rgba(201, 169, 110, 0.16);
      }

      #donaanna-professional-menu .da-menu-section p {
        color: #c9a96e;
        margin: 0 0 10px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 900;
      }

      #donaanna-professional-menu .da-menu-section a {
        display: block;
        color: #f6f0df;
        text-decoration: none;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 15px;
      }

      #donaanna-professional-menu .da-menu-section a:hover { color: #f1d889; }

      @media (max-width: 920px) {
        #donaanna-desktop-links { display: none; }
        #donaanna-professional-menu { display: block; }
      }
    `;

    document.head.appendChild(style);

    const root = document.getElementById('root');
    const insertDesktop = () => {
      const candidates = Array.from(document.querySelectorAll('header, nav'));
      const existingHeader = candidates.find((el) => !el.id || !el.id.startsWith('donaanna'));
      if (existingHeader && existingHeader.parentElement) {
        existingHeader.insertAdjacentElement('afterend', desktop);
      } else if (root) {
        root.insertAdjacentElement('beforebegin', desktop);
      } else {
        document.body.prepend(desktop);
      }
    };

    document.body.appendChild(menu);
    insertDesktop();

    const button = menu.querySelector('.da-menu-toggle');
    const panel = menu.querySelector('#da-menu-panel');

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
      panel.hidden = isOpen;
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target)) {
        button.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
      }
    });
  };

  const init = () => {
    setTimeout(createMenu, 350);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
