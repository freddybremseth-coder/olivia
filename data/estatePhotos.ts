/**
 * Approved placement plan for owner-supplied photos from Doña Anna's Biar estate.
 *
 * IMPORTANT: Do not set estatePhotosPublished to true until the 10 files are
 * available at the exact URL paths below and are confirmed for commercial use.
 * Until then, the site continues using already-deployed assets.
 *
 * These photos illustrate the estate. They are NOT verified pictures of any
 * specific cultivar, batch or finalized packaged product.
 */
export const estatePhotosPublished = false;

const basePath = '/donaanna/garden-2026';

export const estatePhotos = {
  heritageTree: {
    src: `${basePath}/biar-oliventre-kraftig-stamme.webp`,
    alt: 'Oliventre med kraftig, vridd stamme i olivenlunden i Biar',
    caption: 'Et oliventre fra gården i Biar.',
    original: 'IMG_8395(1).jpeg',
  },
  roots: {
    src: `${basePath}/biar-gammel-oliventre-rotstruktur.webp`,
    alt: 'Grov bark og kraftige røtter på et oliventre i Biar',
    caption: 'Røttene er en del av historien fra gården.',
    original: 'IMG_8396.jpeg',
  },
  grove: {
    src: `${basePath}/biar-olivenlund-blaa-himmel.webp`,
    alt: 'Olivenlund under blå himmel på gården i Biar',
    caption: 'Oliventrær i innlandet av Alicante.',
    original: 'IMG_8331.jpeg',
  },
  green: {
    src: `${basePath}/biar-gronne-oliven-naerbilde.webp`,
    alt: 'Grønne oliven på gren på gården i Biar',
    caption: 'Grønne oliven før full modning.',
    original: 'IMG_8320.jpeg',
  },
  mixed: {
    src: `${basePath}/biar-oliven-modning-gronn-lilla.webp`,
    alt: 'Oliven med grønne og fiolette nyanser på samme gren',
    caption: 'Oliven endrer farge gjennom modningen.',
    original: 'IMG_8332.jpeg',
  },
  dark: {
    src: `${basePath}/biar-morke-oliven-gren.webp`,
    alt: 'Mørke oliven på en gren i olivenlunden i Biar',
    caption: 'Mørkere oliven som eksempel på modningsvariasjon.',
    original: 'IMG_8338.jpeg',
  },
  hollow: {
    src: `${basePath}/biar-oliventre-hul-stamme.webp`,
    alt: 'Oliventre med hulrom i den kraftige stammen',
    caption: 'Detalj fra et karakterfullt tre på gården.',
    original: 'IMG_8334.jpeg',
  },
  wholeTree: {
    src: `${basePath}/biar-oliventre-lund.webp`,
    alt: 'Oliventre i lunden med tørr jord og flere trær i bakgrunnen',
    caption: 'Landskap fra olivenlunden i Biar.',
    original: 'IMG_8391.jpeg',
  },
  branches: {
    src: `${basePath}/biar-gronne-oliven-grener.webp`,
    alt: 'Olivenblader og grønne oliven på grener',
    caption: 'Detalj fra gårdens oliventrær.',
    original: 'IMG_8383.jpeg',
  },
  color: {
    src: `${basePath}/biar-oliven-gronn-lilla-himmel.webp`,
    alt: 'Grønne og fiolette oliven mot blå himmel',
    caption: 'Frukt i ulike modningsstadier.',
    original: 'IMG_8343.jpeg',
  },
} as const;
