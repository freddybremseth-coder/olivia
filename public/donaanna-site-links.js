(() => {
  const mainLinks = [
    ['Oljen', '/organic-extra-virgin-olive-oil.html'],
    ['For restauranter', '/olive-oil-for-restaurants.html'],
    ['B2B', '/b2b-olive-oil.html'],
    ['Sporbarhet', '/olive-oil-traceability.html'],
    ['Tasting kit', '/tasting-kit.html'],
    ['Portal', '/app'],
  ];

  const productLinks = [
    ['Verde Vivo', '/product-verde-vivo.html'],
    ['Raíz Antigua', '/product-raiz-antigua.html'],
    ['Verde Alto', '/product-verde-alto.html'],
    ['Cocina Viva', '/product-cocina-viva.html'],
    ['Mesa Gordal', '/product-mesa-gordal-noble.html'],
  ];

  const setFavicon = () => {
    if (document.querySelector('link[href="/favicon.svg"]')) return;
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.href = '/favicon.svg';
    document.head.appendChild(icon);
  };

  const addStyle = () => {
    if (document.getElementById('donaanna-safe-menu-style')) return;
    const style = document.createElement('style');
    style.id = 'donaanna-safe-menu-style';
    style.textContent = `
      #donaanna-safe-desktop-links,#donaanna-safe-mobile-menu{font-family:Inter,Montserrat,Arial,sans-serif;}
      #donaanna-safe-desktop-links{position:relative;z-index:20;width:100%;background:rgba(11,12,9,.94);border-top:1px solid rgba(201,169,110,.10);border-bottom:1px solid rgba(201,169,110,.18)}
      #donaanna-safe-desktop-links .inner{max-width:1280px;margin:0 auto;padding:8px 22px;display:flex;align-items:center;gap:18px;overflow-x:auto;white-space:nowrap;scrollbar-width:thin}
      #donaanna-safe-desktop-links a{color:#d7c89e;text-decoration:none;font-size:11px;text-transform:uppercase;letter-spacing:1.25px;font-weight:800;padding:6px 0}
      #donaanna-safe-desktop-links a:hover{color:#f1d889}
      #donaanna-safe-mobile-menu{position:fixed;right:18px;top:18px;z-index:10000;display:none}
      #donaanna-safe-mobile-menu button{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(201,169,110,.42);background:rgba(8,9,7,.92);color:#f6f0df;padding:10px 13px;border-radius:999px;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;font-weight:800;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      #donaanna-safe-mobile-menu .lines{width:16px;display:grid;gap:3px}#donaanna-safe-mobile-menu .lines span{display:block;height:2px;background:#c9a96e;border-radius:2px}
      #donaanna-safe-mobile-menu .panel{position:absolute;right:0;top:calc(100% + 10px);width:min(86vw,340px);max-height:calc(100vh - 92px);overflow-y:auto;background:rgba(8,9,7,.98);border:1px solid rgba(201,169,110,.28);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.45);padding:18px}
      #donaanna-safe-mobile-menu .section+.section{margin-top:18px;padding-top:16px;border-top:1px solid rgba(201,169,110,.16)}
      #donaanna-safe-mobile-menu p{color:#c9a96e;margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:900}
      #donaanna-safe-mobile-menu a{display:block;color:#f6f0df;text-decoration:none;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:15px}
      @media(max-width:920px){#donaanna-safe-desktop-links{display:none}#donaanna-safe-mobile-menu{display:block}}
    `;
    document.head.appendChild(style);
  };

  const createMenu = () => {
    if (document.getElementById('donaanna-safe-mobile-menu')) return;

    const allLinks = [...mainLinks, ...productLinks];
    const desktop = document.createElement('nav');
    desktop.id = 'donaanna-safe-desktop-links';
    desktop.innerHTML = `<div class="inner">${allLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div>`;

    const mobile = document.createElement('div');
    mobile.id = 'donaanna-safe-mobile-menu';
    mobile.innerHTML = `<button type="button" aria-expanded="false"><span class="lines"><span></span><span></span><span></span></span><span>Meny</span></button><div class="panel" hidden><div class="section"><p>Doña Anna</p>${mainLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div><div class="section"><p>Produkter</p>${productLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div></div>`;

    const header = Array.from(document.querySelectorAll('header,nav')).find((el) => !String(el.id || '').startsWith('donaanna'));
    if (header?.parentElement) header.insertAdjacentElement('afterend', desktop);
    else document.body.prepend(desktop);
    document.body.appendChild(mobile);

    const button = mobile.querySelector('button');
    const panel = mobile.querySelector('.panel');
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
    document.addEventListener('click', (event) => {
      if (!mobile.contains(event.target)) {
        button.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
      }
    });
  };

  const init = () => {
    setFavicon();
    addStyle();
    setTimeout(createMenu, 300);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
