#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, 'dimensions.json'), 'utf-8'));

const outputDir = join(__dirname, '../public/p');
const TOOL_URL = config.tool_url;

if (existsSync(outputDir)) rmSync(outputDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

function generatePages() {
  const pages = [];
  const seen = new Set();
  const d = config.dimensions;
  const add = (slug, data) => { if (!seen.has(slug)) { seen.add(slug); pages.push({ slug, ...data }); } };

  // business × platform × tone (1,600)
  for (const biz of d.business_type.values) {
    for (const plat of d.platform.values) {
      for (const t of d.tone.values) {
        add(`${biz.id}-${plat.id}-${t.id}`, { business: biz, platform: plat, tone: t });
      }
    }
  }
  // business × complaint × tone (1,600)
  for (const biz of d.business_type.values) {
    for (const comp of d.complaint_type.values) {
      for (const t of d.tone.values) {
        add(`${biz.id}-${comp.id}-${t.id}`, { business: biz, complaint: comp, tone: t });
      }
    }
  }
  // business × platform × complaint (2,000)
  for (const biz of d.business_type.values) {
    for (const plat of d.platform.values) {
      for (const comp of d.complaint_type.values) {
        add(`${biz.id}-${plat.id}-${comp.id}`, { business: biz, platform: plat, complaint: comp });
      }
    }
  }
  // platform × complaint × tone (800)
  for (const plat of d.platform.values) {
    for (const comp of d.complaint_type.values) {
      for (const t of d.tone.values) {
        add(`${plat.id}-${comp.id}-${t.id}`, { platform: plat, complaint: comp, tone: t });
      }
    }
  }
  // business × platform × complaint × tone (16,000)
  for (const biz of d.business_type.values) {
    for (const plat of d.platform.values) {
      for (const comp of d.complaint_type.values) {
        for (const t of d.tone.values) {
          add(`${biz.id}-${plat.id}-${comp.id}-${t.id}`, { business: biz, platform: plat, complaint: comp, tone: t });
        }
      }
    }
  }
  return pages;
}

function generateHTML(page) {
  const { slug, business, platform, complaint, tone } = page;
  const url = `${TOOL_URL}/p/${slug}/`;
  const parts = [];
  if (tone) parts.push(tone.en);
  parts.push('Response to');
  if (complaint) parts.push(complaint.en);
  parts.push('Review');
  if (business) parts.push(`for ${business.en}`);
  if (platform) parts.push(`on ${platform.en}`);
  
  const h1 = parts.join(' ');
  const title = `${h1} | Bad Review Translator`;
  const desc = `Generate ${tone?.en?.toLowerCase() || 'professional'} responses to ${complaint?.en?.toLowerCase() || 'negative'} reviews${platform ? ` on ${platform.en}` : ''}${business ? ` for ${business.en}` : ''}. AI-powered. Free!`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${desc}"><link rel="canonical" href="${url}"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${url}"><meta property="og:type" content="website"><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"${h1}","url":"${url}","applicationCategory":"BusinessApplication"}</script><script async src="https://www.googletagmanager.com/gtag/js?id=G-P4ZLGKH1E1"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-P4ZLGKH1E1');</script><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#f8f9fa;color:#212529;line-height:1.6;padding:24px;max-width:720px;margin:0 auto}h1{font-size:1.75rem;margin-bottom:1rem;color:#dc3545}p{margin-bottom:1rem}.cta{background:#dc3545;color:#fff;padding:14px 28px;text-decoration:none;display:inline-block;margin:20px 0;border-radius:6px;font-weight:700}.cta:hover{background:#c82333}footer{margin-top:2rem;font-size:.85rem;color:#6c757d}</style></head><body><h1>🔥 ${h1}</h1><p>Need to respond to a ${complaint?.en?.toLowerCase() || 'negative'} review? Our AI helps you craft ${tone?.en?.toLowerCase() || 'professional'} responses that turn critics into fans.</p><a href="${TOOL_URL}?utm_source=seo" class="cta">Generate Response Now →</a><footer>© 2024 <a href="https://densematrix.ai">DenseMatrix</a></footer></body></html>`;
}

function generateSitemaps(pages) {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const p of pages) xml += `<url><loc>${TOOL_URL}/p/${p.slug}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
  xml += '</urlset>';
  writeFileSync(join(__dirname, '../public/sitemap-programmatic.xml'), xml);
  writeFileSync(join(__dirname, '../public/sitemap-main.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${TOOL_URL}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>`);
  writeFileSync(join(__dirname, '../public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>${TOOL_URL}/sitemap-main.xml</loc></sitemap>\n<sitemap><loc>${TOOL_URL}/sitemap-programmatic.xml</loc></sitemap>\n</sitemapindex>`);
}

console.log('🚀 Generating programmatic SEO pages...');
const pages = generatePages();
console.log(`📊 Total: ${pages.length}`);
let c = 0;
for (const p of pages) {
  const d = join(outputDir, p.slug);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'index.html'), generateHTML(p));
  if (++c % 2000 === 0) console.log(`  ${c}/${pages.length}...`);
}
generateSitemaps(pages);
console.log(`✅ Done! ${c} pages`);
