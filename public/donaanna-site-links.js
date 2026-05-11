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

  const setFavicon = () => {
    document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']").forEach((el) => el.remove());
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

  const replacements = [
    ['Et førsteinntrykk som bærer kvaliteten.', 'Flasken skal skape lyst til å smake.'],
    ['Flasken er utviklet som et tydelig premiumsignal: mørkt glass, kremhvit etikett, kontrollert typografi og metalliske detaljer som skiller hvert nivå. Uttrykket gjør Doña Anna naturlig på hvit duk, i vinbar, i gourmetbutikk og på kokkens pass.', 'Mørkt glass, kremhvit etikett, kontrollert typografi og metalliske detaljer gir Doña Anna et uttrykk som passer på hvit duk, i vinbar, i gourmetbutikk og på kokkens pass. Men flasken er bare starten — smak, opprinnelse og dokumentasjon er det som gjør produktet verdt å ta inn.'],
    ['DA monogram', 'DA-signatur'],
    ['Doña Anna wordmark', 'Doña Anna'],
    ['Branch label mark', 'Olivengren'],
    ['Market seal', 'Kvalitetssegl'],
    ['Monogram, produktnavn og opprinnelse er satt i et rolig system som gjør flasken lett å kjenne igjen – på bordet, i hyllen og i presentasjonen til kunden.', 'Signatur, produktnavn og opprinnelse er satt i et rolig system som gjør flasken lett å kjenne igjen — men hver variant må også vise tydelig hvilken rolle den har for kokk, restaurant og butikk.'],
    ['The bottle communicates quality before it is opened: dark glass, cream label, disciplined typography and metallic accents that distinguish each tier. Doña Anna belongs on white tablecloths, wine bars, gourmet shelves and the chef’s pass.', 'Dark glass, a cream label, disciplined typography and metallic accents give Doña Anna a premium expression for white tablecloths, wine bars, gourmet shelves and the chef’s pass. The bottle is the first impression — flavor, origin and documentation close the decision.'],
    ['A first impression worthy of the oil inside.', 'A bottle that makes people want to taste.'],
    ['The monogram, product name and origin create a calm visual system that is instantly recognizable on the table, on shelf and in professional presentations.', 'Signature, product name and origin create a calm visual system — but each variant must also make its role clear for chefs, restaurants and specialty retail.'],
  ];

  const replaceCopy = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, noscript')) return;
      let text = node.nodeValue || '';
      let changed = false;
      replacements.forEach(([from, to]) => {
        if (text.includes(from)) {
          text = text.split(from).join(to);
          changed = true;
        }
      });
      if (changed) node.nodeValue = text;
    });
  };

  const enhanceMonogramAssets = () => {
    Array.from(document.querySelectorAll('img, svg, picture')).forEach((el) => {
      const html = (el.outerHTML || '').toLowerCase();
      const rect = el.getBoundingClientRect();
      const isMonogram = html.includes('monogram') || html.includes('da-') || html.includes('da_') || html.includes('dona anna da') || html.includes('dona-anna-da');
      const nearbyText = (el.closest('div, article, section')?.innerText || '').toLowerCase();
      const inBrandMarkCard = nearbyText.includes('da monogram') || nearbyText.includes('da-signatur') || nearbyText.includes('doña anna wordmark') || nearbyText.includes('branch label mark') || nearbyText.includes('market seal');
      if (isMonogram || inBrandMarkCard || (rect.width <= 24 && rect.height <= 24 && nearbyText.includes('doña anna'))) {
        el.classList.add('da-monogram-enlarged');
        if (el.tagName.toLowerCase() === 'img') el.setAttribute('loading', 'eager');
      }
    });
  };

  const enhanceBrandHeader = () => {
    const headers = Array.from(document.querySelectorAll('header')).filter((el) => !el.id?.startsWith('donaanna'));
    const header = headers[0];
    if (!header) return;
    header.classList.add('da-brand-enhanced');

    const headerRect = header.getBoundingClientRect();
    const candidates = Array.from(header.querySelectorAll('img, svg, picture, a, div, span')).filter((el) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const txt = (el.textContent || '').toUpperCase();
      const html = (el.outerHTML || '').toLowerCase();
      const isNearLeft = rect.left < headerRect.left + Math.max(360, headerRect.width * 0.35);
      const isLogoText = txt.includes('DOÑA') || txt.includes('DONA') || txt.includes('ANNA') || txt.includes('BIAR') || txt.includes('ALICANTE');
      const isLogoAsset = html.includes('logo') || html.includes('dona') || html.includes('anna') || html.includes('brand') || html.includes('monogram');
      const isSmallMark = rect.width <= 180 && rect.height <= 140 && isNearLeft;
      return isNearLeft && (isLogoText || isLogoAsset || isSmallMark);
    });

    candidates.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const txt = (el.textContent || '').trim().toUpperCase().replace(/\s+/g, ' ');
      if (tag === 'img' || tag === 'svg' || tag === 'picture') {
        el.classList.add('da-logo-icon-large');
        if (tag === 'img') el.setAttribute('loading', 'eager');
      }
      if ((txt.includes('BIAR') && txt.includes('ALICANTE')) || txt === 'BIAR' || txt === 'ALICANTE') el.classList.add('da-origin-small');
      if (txt.includes('DOÑA') || txt.includes('DONA') || txt.includes('ANNA')) el.classList.add('da-wordmark-refined');
    });

    Array.from(header.querySelectorAll('*')).forEach((el) => {
      const txt = (el.textContent || '').trim().toUpperCase().replace(/\s+/g, ' ');
      if (txt.includes('BIAR') || txt.includes('ALICANTE')) el.classList.add('da-origin-small');
    });
  };

  const addSalesBridge = () => {
    if (document.getElementById('donaanna-sales-bridge')) return;
    const bridge = document.createElement('section');
    bridge.id = 'donaanna-sales-bridge';
    bridge.innerHTML = `
      <div class="da-sales-inner">
        <div>
          <p class="da-kicker">For kokker og profesjonelle kjøpere</p>
          <h2>Flasken er førsteinntrykket. Smaken og dokumentasjonen avgjør kjøpet.</h2>
          <p>Se de konkrete produktsidene for bruksområde, kjøkkenrolle, B2B-argumenter og sporbarhet. Doña Anna skal gjøre det enkelt å velge riktig olje til riktig øyeblikk.</p>
        </div>
        <div class="da-sales-actions">
          <a href="/organic-extra-virgin-olive-oil.html">Se kolleksjonen</a>
          <a href="/olive-oil-for-restaurants.html">For restauranter</a>
          <a href="/tasting-kit.html">Request tasting kit</a>
        </div>
      </div>
    `;
    const target = Array.from(document.querySelectorAll('section, div')).find((el) => {
      const txt = (el.innerText || '').trim();
      return txt.includes('Flasken skal skape lyst til å smake') || txt.includes('Et førsteinntrykk som bærer kvaliteten') || txt.includes('Flasken er utviklet som et tydelig premiumsignal');
    });
    if (target && target.parentElement) target.insertAdjacentElement('afterend', bridge);
  };

  const createMenu = () => {
    if (document.getElementById('donaanna-professional-menu')) return;
    setFavicon();
    const menu = document.createElement('div');
    menu.id = 'donaanna-professional-menu';
    menu.setAttribute('aria-label', 'Doña Anna meny');
    menu.innerHTML = `<button class="da-menu-toggle" type="button" aria-expanded="false" aria-controls="da-menu-panel"><span class="da-menu-lines" aria-hidden="true"><span></span><span></span><span></span></span><span class="da-menu-label">Meny</span></button><div id="da-menu-panel" class="da-menu-panel" hidden><div class="da-menu-section"><p>Doña Anna</p>${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div><div class="da-menu-section"><p>Produkter</p>${products.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div></div>`;
    const desktop = document.createElement('nav');
    desktop.id = 'donaanna-desktop-links';
    desktop.setAttribute('aria-label', 'Doña Anna hurtiglenker');
    desktop.innerHTML = `<div class="da-desktop-inner">${allLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div>`;
    const style = document.createElement('style');
    style.id = 'donaanna-professional-menu-style';
    style.textContent = `
      #donaanna-professional-menu,#donaanna-desktop-links,#donaanna-sales-bridge{font-family:Inter,Montserrat,Arial,sans-serif;}
      header.da-brand-enhanced .da-logo-icon-large{width:96px!important;height:96px!important;max-width:96px!important;max-height:96px!important;min-width:96px!important;object-fit:contain!important;flex-shrink:0!important;transform:scale(1.25)!important;transform-origin:center!important;}
      header.da-brand-enhanced .da-origin-small{font-size:.56rem!important;letter-spacing:.18em!important;line-height:1.1!important;opacity:.78!important;font-weight:500!important;}
      header.da-brand-enhanced .da-wordmark-refined{letter-spacing:.28em!important;}
      .da-monogram-enlarged{width:86px!important;height:86px!important;max-width:86px!important;max-height:86px!important;min-width:86px!important;object-fit:contain!important;transform:scale(1.35)!important;transform-origin:center!important;display:inline-block!important;}
      #donaanna-desktop-links{position:relative;z-index:20;width:100%;background:rgba(11,12,9,.94);border-top:1px solid rgba(201,169,110,.10);border-bottom:1px solid rgba(201,169,110,.18);}
      #donaanna-desktop-links .da-desktop-inner{max-width:1280px;margin:0 auto;padding:8px 22px;display:flex;align-items:center;gap:18px;overflow-x:auto;white-space:nowrap;scrollbar-width:thin;}
      #donaanna-desktop-links a{color:#d7c89e;text-decoration:none;font-size:11px;text-transform:uppercase;letter-spacing:1.25px;font-weight:800;padding:6px 0;}
      #donaanna-desktop-links a:hover{color:#f1d889;}
      #donaanna-professional-menu{position:fixed;right:18px;top:18px;z-index:10000;display:none;}
      #donaanna-professional-menu .da-menu-toggle{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(201,169,110,.42);background:rgba(8,9,7,.92);color:#f6f0df;padding:10px 13px;border-radius:999px;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;font-weight:800;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
      #donaanna-professional-menu .da-menu-lines{width:16px;display:grid;gap:3px;}#donaanna-professional-menu .da-menu-lines span{display:block;height:2px;background:#c9a96e;border-radius:2px;}
      #donaanna-professional-menu .da-menu-panel{position:absolute;right:0;top:calc(100% + 10px);width:min(86vw,340px);max-height:calc(100vh - 92px);overflow-y:auto;background:rgba(8,9,7,.98);border:1px solid rgba(201,169,110,.28);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.45);padding:18px;}
      #donaanna-professional-menu .da-menu-section+.da-menu-section{margin-top:18px;padding-top:16px;border-top:1px solid rgba(201,169,110,.16);}#donaanna-professional-menu .da-menu-section p{color:#c9a96e;margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:900;}#donaanna-professional-menu .da-menu-section a{display:block;color:#f6f0df;text-decoration:none;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:15px;}#donaanna-professional-menu .da-menu-section a:hover{color:#f1d889;}
      #donaanna-sales-bridge{background:#0b0d09;border-top:1px solid rgba(201,169,110,.18);border-bottom:1px solid rgba(201,169,110,.18);color:#f6f0df;padding:48px 22px;}#donaanna-sales-bridge .da-sales-inner{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:34px;align-items:center;}#donaanna-sales-bridge .da-kicker{margin:0 0 12px;color:#c9a96e;text-transform:uppercase;letter-spacing:2px;font-size:11px;font-weight:900;}#donaanna-sales-bridge h2{margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;font-size:clamp(30px,4vw,54px);line-height:1.12;}#donaanna-sales-bridge p{color:#cfc4a6;max-width:760px;font-size:17px;line-height:1.7;}#donaanna-sales-bridge .da-sales-actions{display:grid;gap:12px;}#donaanna-sales-bridge .da-sales-actions a{display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(201,169,110,.28);color:#f6f0df;text-decoration:none;padding:15px 18px;border-radius:10px;text-transform:uppercase;letter-spacing:1.2px;font-size:12px;font-weight:900;background:rgba(255,255,255,.03);}#donaanna-sales-bridge .da-sales-actions a:after{content:'→';color:#c9a96e;}#donaanna-sales-bridge .da-sales-actions a:hover{border-color:#c9a96e;color:#f1d889;}
      @media(max-width:920px){header.da-brand-enhanced .da-logo-icon-large{width:68px!important;height:68px!important;max-width:68px!important;max-height:68px!important;min-width:68px!important;transform:scale(1.15)!important;}header.da-brand-enhanced .da-origin-small{font-size:.48rem!important;letter-spacing:.13em!important;}.da-monogram-enlarged{width:64px!important;height:64px!important;max-width:64px!important;max-height:64px!important;min-width:64px!important;}#donaanna-desktop-links{display:none;}#donaanna-professional-menu{display:block;}#donaanna-sales-bridge .da-sales-inner{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
    const root = document.getElementById('root');
    const insertDesktop = () => {
      const candidates = Array.from(document.querySelectorAll('header, nav'));
      const existingHeader = candidates.find((el) => !el.id || !el.id.startsWith('donaanna'));
      if (existingHeader && existingHeader.parentElement) existingHeader.insertAdjacentElement('afterend', desktop);
      else if (root) root.insertAdjacentElement('beforebegin', desktop);
      else document.body.prepend(desktop);
    };
    document.body.appendChild(menu);
    insertDesktop();
    const button = menu.querySelector('.da-menu-toggle');
    const panel = menu.querySelector('#da-menu-panel');
    button.addEventListener('click', () => { const isOpen = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!isOpen)); panel.hidden = isOpen; });
    document.addEventListener('click', (event) => { if (!menu.contains(event.target)) { button.setAttribute('aria-expanded', 'false'); panel.hidden = true; } });
  };

  const runEnhancements = () => {
    replaceCopy();
    enhanceBrandHeader();
    enhanceMonogramAssets();
    addSalesBridge();
  };

  const init = () => {
    setTimeout(() => { createMenu(); runEnhancements(); }, 600);
    [1000, 1800, 3000, 5000, 8000].forEach((ms) => setTimeout(runEnhancements, ms));
    const observer = new MutationObserver(() => runEnhancements());
    setTimeout(() => observer.observe(document.body, { childList: true, subtree: true, characterData: true }), 1200);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
