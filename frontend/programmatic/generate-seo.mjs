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

function generateRelated(page) {
  const { business, platform, complaint, tone } = page;
  const d = config.dimensions;
  const links = [];
  for (const nextTone of d.tone.values.filter((item) => item.id !== tone?.id).slice(0, 2)) {
    links.push({
      slug: `${business?.id || d.business_type.values[0].id}-${platform?.id || d.platform.values[0].id}-${complaint?.id || d.complaint_type.values[0].id}-${nextTone.id}`,
      label: `${nextTone.en} ${complaint?.en || 'Review'} Response`
    });
  }
  for (const nextBusiness of d.business_type.values.filter((item) => item.id !== business?.id).slice(0, 2)) {
    links.push({
      slug: `${nextBusiness.id}-${platform?.id || d.platform.values[0].id}-${complaint?.id || d.complaint_type.values[0].id}-${tone?.id || d.tone.values[0].id}`,
      label: `${nextBusiness.en} ${complaint?.en || 'Review'} Response`
    });
  }
  for (const nextComplaint of d.complaint_type.values.filter((item) => item.id !== complaint?.id).slice(0, 2)) {
    links.push({
      slug: `${business?.id || d.business_type.values[0].id}-${platform?.id || d.platform.values[0].id}-${nextComplaint.id}-${tone?.id || d.tone.values[0].id}`,
      label: `${nextComplaint.en} Response Template`
    });
  }
  return links;
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
  const toneLower = tone?.en?.toLowerCase() || 'professional';
  const complaintLower = complaint?.en?.toLowerCase() || 'negative';
  const businessLower = business?.en?.toLowerCase() || 'local business';
  const platformText = platform?.en || 'review sites';
  const desc = `Generate a ${toneLower} response to a ${complaintLower} review${platform ? ` on ${platform.en}` : ''}${business ? ` for a ${business.en}` : ''}. Includes examples, response structure, and AI writing help.`;
  const relatedHtml = generateRelated(page).map((item) =>
    `<a href="${TOOL_URL}/p/${item.slug}/">${item.label}</a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"${h1}","description":"${desc}","url":"${url}","applicationCategory":"BusinessApplication","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"publisher":{"@type":"Organization","name":"DenseMatrix","url":"https://densematrix.ai"}}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-P4ZLGKH1E1"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-P4ZLGKH1E1',{'custom_map':{'dimension1':'tool_name'}});gtag('event','page_view',{'tool_name':'bad-review-translator'});</script>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#172033;line-height:1.7;padding:28px;max-width:860px;margin:0 auto}h1{font-size:2rem;line-height:1.2;margin-bottom:1rem;color:#b91c1c}h2{font-size:1.25rem;margin:1.6rem 0 .6rem;color:#1f2937}p,li{margin-bottom:.75rem}.panel{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:22px;margin:18px 0}.sample{border-left:4px solid #b91c1c;background:#fff7f7}.cta{background:#b91c1c;color:#fff;padding:14px 24px;text-decoration:none;display:inline-block;margin:20px 0;border-radius:6px;font-weight:700}.cta:hover{background:#991b1b}.related a{display:inline-block;margin:4px 8px 4px 0;color:#b91c1c;text-decoration:none}.related a:hover{text-decoration:underline}footer{margin-top:2rem;font-size:.85rem;color:#64748b}</style>
</head>
<body>
  <h1>${h1}</h1>
  <p>Use this page when you need a ${toneLower} reply to a ${complaintLower} review for a ${businessLower}${platform ? ` on ${platformText}` : ''}. The goal is not to sound defensive; it is to acknowledge the issue, protect your reputation, and move the conversation toward a fix.</p>
  <section class="panel sample">
    <h2>Example response structure</h2>
    <p><strong>Opening:</strong> Thank the reviewer and acknowledge the specific ${complaintLower} concern without arguing with their experience.</p>
    <p><strong>Middle:</strong> Explain what your team is checking or changing. Keep it specific enough to sound real, but avoid private customer details.</p>
    <p><strong>Close:</strong> Invite the customer to continue privately and give a clear next action, such as contacting the manager or support desk.</p>
  </section>
  <section class="panel">
    <h2>What to include</h2>
    <ul>
      <li>Mention the business context: ${business?.en || 'your business'} customers expect a response that feels human and accountable.</li>
      <li>Match the platform: ${platformText} responses should be short enough for scanning but detailed enough to show you care.</li>
      <li>Address the complaint: ${complaint?.en || 'negative feedback'} needs a direct answer, not generic reputation-management language.</li>
      <li>Use the selected tone: a ${toneLower} response should still sound calm, factual, and easy to trust.</li>
    </ul>
  </section>
  <a href="${TOOL_URL}?utm_source=seo&business=${business?.id || ''}&platform=${platform?.id || ''}&complaint=${complaint?.id || ''}&tone=${tone?.id || ''}" class="cta">Generate Response Now</a>
  <section class="panel">
    <h2>FAQ</h2>
    <p><strong>Should I apologize in every reply?</strong> Apologize for the experience, not necessarily for facts you have not verified. That keeps the response empathetic without admitting details prematurely.</p>
    <p><strong>How long should the reply be?</strong> Most public replies work best at 80-140 words. Longer explanations usually belong in private follow-up.</p>
    <p><strong>Can AI write the final response?</strong> AI is best for first drafts and tone control. Review the details before posting so the reply matches what actually happened.</p>
  </section>
  <section class="related"><h2>Related response templates</h2>${relatedHtml}</section>
  <footer>© 2026 <a href="https://densematrix.ai">DenseMatrix</a> | <a href="${TOOL_URL}">Bad Review Translator</a></footer>
</body>
</html>`;
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
