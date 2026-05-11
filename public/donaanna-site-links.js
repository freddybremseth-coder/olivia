(() => {
  const links = [
    ['Oljen', '/organic-extra-virgin-olive-oil.html'],
    ['For restauranter', '/olive-oil-for-restaurants.html'],
    ['B2B', '/b2b-olive-oil.html'],
    ['Sporbarhet', '/olive-oil-traceability.html'],
    ['Tasting kit', '/tasting-kit.html'],
    ['Portal', '/app'],
  ];

  const createBar = () => {
    if (document.getElementById('donaanna-professional-links')) return;

    const bar = document.createElement('nav');
    bar.id = 'donaanna-professional-links';
    bar.setAttribute('aria-label', 'Doña Anna profesjonell meny');
    bar.innerHTML = `
      <div class="da-link-inner">
        <a class="da-brand" href="/" aria-label="Doña Anna">Doña <span>Anna</span></a>
        <div class="da-links">
          ${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.id = 'donaanna-professional-links-style';
    style.textContent = `
      #donaanna-professional-links {
        position: sticky;
        top: 0;
        z-index: 9999;
        width: 100%;
        background: rgba(8, 9, 7, 0.94);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border-bottom: 1px solid rgba(201, 169, 110, 0.24);
        color: #f6f0df;
        font-family: Inter, Montserrat, Arial, sans-serif;
      }
      #donaanna-professional-links .da-link-inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 10px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 22px;
      }
      #donaanna-professional-links .da-brand {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 18px;
        color: #f6f0df;
        text-decoration: none;
        white-space: nowrap;
      }
      #donaanna-professional-links .da-brand span { color: #c9a96e; }
      #donaanna-professional-links .da-links {
        display: flex;
        align-items: center;
        gap: 16px;
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: thin;
      }
      #donaanna-professional-links .da-links a {
        color: #d7c89e;
        text-decoration: none;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        font-weight: 700;
        padding: 7px 0;
      }
      #donaanna-professional-links .da-links a:hover { color: #f1d889; }
      @media (max-width: 720px) {
        #donaanna-professional-links .da-link-inner {
          align-items: flex-start;
          flex-direction: column;
          gap: 6px;
        }
        #donaanna-professional-links .da-links { width: 100%; }
      }
    `;

    document.head.appendChild(style);
    document.body.prepend(bar);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createBar);
  } else {
    createBar();
  }
})();
