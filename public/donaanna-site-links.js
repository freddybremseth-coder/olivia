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

  const productCards = [
    ['Verde Vivo', 'Tidlighøstet finishing oil for crudo, fisk og grønne retter.', '/product-verde-vivo.html', '/donaanna/product-design/verde-vivo-estate-arches.jpg'],
    ['Raíz Antigua', 'Heritage premium fra gamle trær, for dybde og historiefortelling.', '/product-raiz-antigua.html', '/donaanna/product-design/raiz-antigua-label-hero.jpg'],
    ['Verde Alto', 'Klassisk premiumolje for bordservering, butikk og restaurant.', '/product-verde-alto.html', '/donaanna/product-design/verde-alto-rustic-room.jpg'],
    ['Cocina Viva', 'Profesjonelt kjøkkenformat for stabil kvalitet i service.', '/product-cocina-viva.html', '/donaanna/product-design/cocina-viva-b2b-collage.jpg'],
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
      #donaanna-safe-desktop-links,#donaanna-safe-mobile-menu,.da-product-card-grid{font-family:Inter,Montserrat,Arial,sans-serif;}
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
      .da-product-card-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;width:100%!important}
      .da-product-card{position:relative;display:block;min-height:255px;border:1px solid rgba(201,169,110,.22);overflow:hidden;background:#0b0d09;text-decoration:none;color:#f6f0df}
      .da-product-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.72) saturate(.92);transition:transform .35s ease}
      .da-product-card:hover img{transform:scale(1.06)}
      .da-product-card:after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(8,9,7,.92),rgba(8,9,7,.26) 58%,rgba(8,9,7,.05))}
      .da-product-card span{position:absolute;left:18px;right:18px;bottom:18px;z-index:2;display:block}
      .da-product-card strong{display:block;font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.12;color:#fff;margin-bottom:8px}
      .da-product-card em{display:block;color:#d7c89e;font-size:13px;line-height:1.45;font-style:normal}
      @media(max-width:920px){#donaanna-safe-desktop-links{display:none}#donaanna-safe-mobile-menu{display:block}.da-product-card-grid{grid-template-columns:1fr!important}.da-product-card{min-height:230px}}
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

  const patchLabelSectionOnce = () => {
    const section = document.getElementById('label');
    if (!section || section.dataset.donaannaPatched === 'true') return;

    section.dataset.donaannaPatched = 'true';

    const headings = Array.from(section.querySelectorAll('h1,h2,h3,p,span,a,button'));
    headings.forEach((el) => {
      const text = (el.textContent || '').trim();
      if (text === 'Etiketten' || text === 'La etiqueta' || text === 'The label') el.textContent = text === 'Etiketten' ? 'Flasken' : text === 'La etiqueta' ? 'La botella' : 'The bottle';
      if (text === 'Det kunden ser først, må føles verdt å smake.') el.textContent = 'Flasken skal skape lyst til å smake.';
      if (text === 'Lo primero que ve el cliente debe parecer digno de probarse.') el.textContent = 'La botella debe invitar a probar.';
      if (text === 'What customers see first must feel worth tasting.') el.textContent = 'A bottle that makes people want to taste.';
      if (text === 'Utforsk produktnivåene') el.textContent = 'Se kolleksjonen';
      if (text === 'Explorar niveles') el.textContent = 'Ver colección';
      if (text === 'Explore product tiers') el.textContent = 'View collection';
    });

    const paragraphs = Array.from(section.querySelectorAll('p'));
    paragraphs.forEach((p) => {
      const text = (p.textContent || '').trim();
      if (text.startsWith('Etiketten er bygget som et kvalitetssignal')) {
        p.textContent = 'Mørkt glass, kremhvit etikett, kontrollert typografi og metalliske detaljer gir Doña Anna et uttrykk som passer på hvit duk, i vinbar, i gourmetbutikk og på kokkens pass. Men flasken er bare starten — smak, opprinnelse og dokumentasjon er det som gjør produktet verdt å ta inn.';
      }
      if (text.startsWith('DA-monogrammet')) {
        p.textContent = 'Hver variant skal være lett å kjenne igjen, men enda viktigere: lett å velge riktig for rett rett, rett kjøkken og rett kunde.';
      }
    });

    const visualGrid = Array.from(section.querySelectorAll('div')).find((el) => {
      const imgCount = el.querySelectorAll('img,svg,picture').length;
      const text = el.innerText || '';
      return imgCount >= 3 && (text.includes('DA') || text.includes('Doña Anna') || text.includes('Market') || text.includes('seal'));
    });

    if (visualGrid) {
      visualGrid.className = `${visualGrid.className || ''} da-product-card-grid`.trim();
      visualGrid.innerHTML = productCards.map(([name, role, href, image]) => `
        <a class="da-product-card" href="${href}">
          <img src="${image}" alt="Doña Anna ${name}">
          <span><strong>${name}</strong><em>${role}</em></span>
        </a>
      `).join('');
    }
  };

  const init = () => {
    setFavicon();
    addStyle();
    setTimeout(createMenu, 300);
    setTimeout(patchLabelSectionOnce, 900);
    setTimeout(patchLabelSectionOnce, 1800);
    setTimeout(patchLabelSectionOnce, 3200);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
