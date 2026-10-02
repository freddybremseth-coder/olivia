# Doña Anna product media rules

This file locks the public product-media contract for donaanna.com.

## Product identities

| Product | Canonical route | Product type | Public availability | Label status |
| --- | --- | --- | --- | --- |
| Verde Vivo | /verde-vivo | Olive oil | Current product line | Current stylized Doña Anna label reference verified |
| Verde Alto | /verde-alto | Olive oil | Current product line | Exact current label asset still required |
| Raíz Antigua | /raiz-antigua | Olive oil | Current product line | Exact current label asset still required |
| Cocina Viva | /cocina-viva | Olive oil / professional kitchen | Current product line | Exact current label asset still required |
| Mesa · Gordal Noble | /mesa-gordal-noble | Table olives | Planned, not available yet | Exact packaging/label asset still required |

## Non-negotiable rules

1. A product image may represent only the product named on its exact approved label.
2. Never reuse a Verde Vivo bottle image for Verde Alto, Raíz Antigua, Cocina Viva or Mesa.
3. Never use the legacy files under `/donaanna/product-design/` on public product surfaces.
4. A RealtyFlow/Supabase image is eligible only when:
   - the product row is `public_site_approved=true`;
   - media metadata says `product_image_approved=true`;
   - media metadata `product_slug` exactly equals the canonical product slug.
5. If any condition is missing, use a product-safe context image plus the canonical Doña Anna figure, not an approximate bottle.
6. Mesa · Gordal Noble must remain visibly marked as planned until product, process, packaging, label, price and availability are confirmed.
7. Claims about quality class, sensorics, olive varieties in a batch, tree age, analyses, price or availability must be product- and batch-specific.
8. The stylized Doña Anna figure is a brand asset. Do not replace it with a crest, coat of arms or newly generated character.

## Product-photo approval workflow

For each product, approve media in this order:

1. Confirm exact current label artwork.
2. Confirm label orientation and perspective on the bottle/package.
3. Confirm product name matches the canonical product.
4. Confirm package size/format is current.
5. Approve the final image for that product only.
6. Mark the media record with the canonical `product_slug` and `product_image_approved=true`.
7. Only then may donaanna.com render the product image.

Until these checks are complete, the public site intentionally uses brand-safe placeholders.
