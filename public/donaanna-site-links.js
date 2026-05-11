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

  const textReplacements = [
    ['Et førsteinntrykk som bærer kvaliteten.', 'Flasken skal skape lyst til å smake.'],
    ['Flasken er utviklet som et tydelig premiumsignal: mørkt glass, kremhvit etikett, kontrollert typografi og metalliske detaljer som skiller hvert nivå. Uttrykket gjør Doña Anna naturlig på hvit duk, i vinbar, i gourmetbutikk og på kokkens pass.', 'Mørkt glass, kremhvit etikett, kontrollert typografi og metalliske detaljer gir Doña Anna et uttrykk som passer på hvit duk, i vinbar, i gourmetbutikk og på kokkens pass. Men flasken er bare starten — smak, opprinnelse og dokumentasjon er det som gjør produktet verdt å ta inn.'],
    ['DA monogram', 'DA-signatur'],
    ['Doña Anna wordmark', 'Doña Anna'],
    ['Branch label mark', 'Olivengren'],
    ['Market seal', 'Kvalitetssegl'],
    ['Monogram, produktnavn og opprinnelse er satt i et rolig system som gjør flasken lett å kjenne igjen – på bordet, i hyllen og i presentasjonen til kunden.', 'Hver variant skal være lett å kjenne igjen, men enda viktigere: lett å velge riktig for rett rett, rett kjøkken og rett kunde.'],
  ];

  const txt = (el) => (el?.innerText || el?.textContent || '').trim();

  const setFavicon = () => {
    document.querySelectorAll("link[rel='icon'],link[rel='shortcut icon'],link[rel='apple-touch-icon']").forEach((el) => el.remove());
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.href = '/favicon.svg';
    document.head.appendChild(icon);
    const apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    apple.href = '/favicon.svg';
    document.head.appendChild(apple);
  };

  const addStyle = () => {
    if (document.getElementById('donaanna-fixes-style')) return;
    const style = document.createElement('style');
    style.id = 'donaanna-fixes-style';
    style.textContent = `
      #donaanna-professional-menu,#donaanna-desktop-links,#donaanna-sales-bridge,.da-product-replacement-grid{font-family:Inter,Montserrat,Arial,sans-serif;}
      #donaanna-desktop-links{position:relative;z-index:20;width:100%;background:rgba(11,12,9,.94);border-top:1px solid rgba(201,169,110,.10);border-bottom:1px solid rgba(201,169,110,.18)}
      #donaanna-desktop-links .da-desktop-inner{max-width:1280px;margin:0 auto;padding:8px 22px;display:flex;align-items:center;gap:18px;overflow-x:auto;white-space:nowrap;scrollbar-width:thin}
      #donaanna-desktop-links a{color:#d7c89e;text-decoration:none;font-size:11px;text-transform:uppercase;letter-spacing:1.25px;font-weight:800;padding:6px 0}#donaanna-desktop-links a:hover{color:#f1d889}
      #donaanna-professional-menu{position:fixed;right:18px;top:18px;z-index:10000;display:none}#donaanna-professional-menu .da-menu-toggle{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(201,169,110,.42);background:rgba(8,9,7,.92);color:#f6f0df;padding:10px 13px;border-radius:999px;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;font-weight:800;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      #donaanna-professional-menu .da-menu-lines{width:16px;display:grid;gap:3px}#donaanna-professional-menu .da-menu-lines span{display:block;height:2px;background:#c9a96e;border-radius:2px}#donaanna-professional-menu .da-menu-panel{position:absolute;right:0;top:calc(100% + 10px);width:min(86vw,340px);max-height:calc(100vh - 92px);overflow-y:auto;background:rgba(8,9,7,.98);border:1px solid rgba(201,169,110,.28);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.45);padding:18px}#donaanna-professional-menu .da-menu-section+.da-menu-section{margin-top:18px;padding-top:16px;border-top:1px solid rgba(201,169,110,.16)}#donaanna-professional-menu .da-menu-section p{color:#c9a96e;margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:900}#donaanna-professional-menu .da-menu-section a{display:block;color:#f6f0df;text-decoration:none;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:15px}
      .da-hero-fallback{background-image:linear-gradient(90deg,rgba(0,0,0,.76),rgba(0,0,0,.38)),url('/donaanna/product-design/verde-vivo-estate-arches.jpg')!important;background-size:cover!important;background-position:center!important;min-height:620px!important}
      .da-product-replacement-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;width:100%!important}.da-product-replacement-card{position:relative!important;display:block!important;min-height:250px!important;border:1px solid rgba(201,169,110,.22)!important;overflow:hidden!important;background:#0b0d09!important;text-decoration:none!important;color:#f6f0df!important}.da-product-replacement-card img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;filter:brightness(.72) saturate(.92)!important;transition:transform .35s ease!important}.da-product-replacement-card:hover img{transform:scale(1.06)!important}.da-product-replacement-card:after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(8,9,7,.92),rgba(8,9,7,.24) 58%,rgba(8,9,7,.05))}.da-product-replacement-content{position:absolute!important;left:18px!important;right:18px!important;bottom:18px!important;z-index:2!important}.da-product-replacement-content strong{display:block!important;font-family:'Playfair Display',Georgia,serif!important;font-size:27px!important;line-height:1.12!important;color:#fff!important;margin-bottom:7px!important}.da-product-replacement-content span{display:block!important;color:#d7c89e!important;font-size:13px!important;line-height:1.45!important}
      #donaanna-sales-bridge{background:#0b0d09;border-top:1px solid rgba(201,169,110,.18);border-bottom:1px solid rgba(201,169,110,.18);color:#f6f0df;padding:48px 22px}#donaanna-sales-bridge .da-sales-inner{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:34px;align-items:center}#donaanna-sales-bridge .da-kicker{margin:0 0 12px;color:#c9a96e;text-transform:uppercase;letter-spacing:2px;font-size:11px;font-weight:900}#donaanna-sales-bridge h2{margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;font-size:clamp(30px,4vw,54px);line-height:1.12}#donaanna-sales-bridge p{color:#cfc4a6;max-width:760px;font-size:17px;line-height:1.7}#donaanna-sales-bridge .da-sales-actions{display:grid;gap:12px}#donaanna-sales-bridge .da-sales-actions a{display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(201,169,110,.28);color:#f6f0df;text-decoration:none;padding:15px 18px;border-radius:10px;text-transform:uppercase;letter-spacing:1.2px;font-size:12px;font-weight:900;background:rgba(255,255,255,.03)}#donaanna-sales-bridge .da-sales-actions a:after{content:'→';color:#c9a96e}
      @media(max-width:920px){#donaanna-desktop-links{display:none}#donaanna-professional-menu{display:block}.da-product-replacement-grid{grid-template-columns:1fr!important}.da-product-replacement-card{min-height:230px!important}#donaanna-sales-bridge .da-sales-inner{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  };

  const replaceCopy = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,noscript')) return;
      let value = node.nodeValue || '';
      let changed = false;
      textReplacements.forEach(([from, to]) => {
        if (value.includes(from)) {
          value = value.split(from).join(to);
          changed = true;
        }
      });
      if (changed) node.nodeValue = value;
    });
  };

  const createMenu = () => {
    if (document.getElementById('donaanna-professional-menu')) return;
    const desktop = document.createElement('nav');
    desktop.id = 'donaanna-desktop-links';
    desktop.innerHTML = `<div class="da-desktop-inner">${[...mainLinks, ...productLinks].map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div>`;
    const menu = document.createElement('div');
    menu.id = 'donaanna-professional-menu';
    menu.innerHTML = `<button class="da-menu-toggle" type="button" aria-expanded="false"><span class="da-menu-lines"><span></span><span></span><span></span></span><span>Meny</span></button><div class="da-menu-panel" hidden><div class="da-menu-section"><p>Doña Anna</p>${mainLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div><div class="da-menu-section"><p>Produkter</p>${productLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div></div>`;
    const header = Array.from(document.querySelectorAll('header,nav')).find((el) => !el.id?.startsWith('donaanna'));
    if (header?.parentElement) header.insertAdjacentElement('afterend', desktop);
    else document.body.prepend(desktop);
    document.body.appendChild(menu);
    const button = menu.querySelector('button');
    const panel = menu.querySelector('.da-menu-panel');
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target)) {
        button.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
      }
    });
  };

  const restoreHero = () => {
    const hero = Array.from(document.querySelectorAll('section,div')).find((el) => {
      const t = txt(el);
      const r = el.getBoundingClientRect();
      return r.height > 360 && t.includes('Doña Anna') && (t.includes('oliven') || t.includes('olje') || t.includes('Biar'));
    });
    if (!hero) return;
    const hasVisibleImg = Array.from(hero.querySelectorAll('img')).some((img) => img.getBoundingClientRect().width > 120 && img.getBoundingClientRect().height > 120);
    if (!hasVisibleImg) hero.classList.add('da-hero-fallback');
  };

  const replaceLogoGrid = () => {
    if (document.querySelector('.da-product-replacement-grid')) return;
    const section = Array.from(document.querySelectorAll('section,div')).find((el) => {
      const t = txt(el);
      return (t.includes('DA-signatur') || t.includes('DA monogram')) && (t.includes('Doña Anna') || t.includes('wordmark')) && (t.includes('Olivengren') || t.includes('Branch label')) && (t.includes('Kvalitetssegl') || t.includes('Market seal'));
    });
    if (!section) return;
    const target = Array.from(section.querySelectorAll('div')).filter((el) => el.querySelectorAll('img,svg,picture').length >= 2).sort((a, b) => b.querySelectorAll('img,svg,picture').length - a.querySelectorAll('img,svg,picture').length)[0];
    if (!target) return;
    target.className = `${target.className || ''} da-product-replacement-grid`.trim();
    target.innerHTML = productCards.map(([name, role, href, image]) => `<a class="da-product-replacement-card" href="${href}"><img src="${image}" alt="Doña Anna ${name}"><span class="da-product-replacement-content"><strong>${name}</strong><span>${role}</span></span></a>`).join('');
  };

  const addSalesBridge = () => {
    if (document.getElementById('donaanna-sales-bridge')) return;
    const target = Array.from(document.querySelectorAll('section,div')).find((el) => {
      const t = txt(el);
      return t.includes('Flasken skal skape lyst til å smake') || t.includes('Et førsteinntrykk som bærer kvaliteten');
    });
    if (!target?.parentElement) return;
    const bridge = document.createElement('section');
    bridge.id = 'donaanna-sales-bridge';
    bridge.innerHTML = `<div class="da-sales-inner"><div><p class="da-kicker">For kokker og profesjonelle kjøpere</p><h2>Fra førsteinntrykk til innkjøpsbeslutning.</h2><p>Produktet skal se premium ut, men det må også være enkelt å velge. Se produktsidene for bruksområde, kjøkkenrolle, B2B-argumenter og sporbarhet.</p></div><div class="da-sales-actions"><a href="/organic-extra-virgin-olive-oil.html">Se kolleksjonen</a><a href="/olive-oil-for-restaurants.html">For restauranter</a><a href="/tasting-kit.html">Request tasting kit</a></div></div>`;
    target.insertAdjacentElement('afterend', bridge);
  };

  const run = () => {
    setFavicon();
    addStyle();
    createMenu();
    replaceCopy();
    restoreHero();
    replaceLogoGrid();
    addSalesBridge();
  };

  const init = () => {
    [300, 900, 1600, 3000, 5200, 8000].forEach((ms) => setTimeout(run, ms));
    setTimeout(() => new MutationObserver(() => run()).observe(document.body, { childList: true, subtree: true, characterData: true }), 1400);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
