#!/usr/bin/env npx ts-node
/**
 * Programmatic SEO Page Generator for Bad Review Translator
 */

import * as fs from 'fs';
import * as path from 'path';

interface Dimension {
  name: string;
  name_zh: string;
  values_en: string[];
  values_zh: string[];
}

interface DimensionsConfig {
  tool: string;
  tool_url: string;
  dimensions: Dimension[];
  combinations: string[][];
}

const config: DimensionsConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dimensions.json'), 'utf-8')
);

const outputDir = path.join(__dirname, '../public/p');
const sitemapPath = path.join(__dirname, '../public/sitemap-programmatic.xml');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function titleCase(text: string): string {
  return text.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function generatePage(dim1: string, val1: string, dim2: string, val2: string): string {
  const title = `${titleCase(val1)} ${titleCase(val2)} Review Translator`;
  const description = `Transform negative ${titleCase(val1).toLowerCase()} ${titleCase(val2).toLowerCase()} reviews into professional responses. Our AI helps you handle criticism constructively. Free to use!`;
  const slug = `${slugify(val1)}-${slugify(val2)}`;
  const url = `${config.tool_url}/p/${slug}/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | AI Tool</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="DenseMatrix">
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "${title}",
    "description": "${description}",
    "url": "${url}",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "author": { "@type": "Organization", "name": "DenseMatrix", "url": "https://densematrix.ai" }
  }
  </script>
  
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1 { color: #1a1a2e; }
    .cta { background: #6366f1; color: white; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; display: inline-block; margin: 2rem 0; }
    .cta:hover { background: #4f46e5; }
    .related { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #eee; }
    .related a { display: block; margin: 0.5rem 0; color: #6366f1; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  
  <p>Dealing with negative ${titleCase(val1).toLowerCase()} reviews about ${titleCase(val2).toLowerCase()}? Our AI Bad Review Translator helps you craft professional, constructive responses.</p>
  
  <h2>Why Use Our ${titleCase(val1)} Review Translator?</h2>
  <p>Negative reviews about ${titleCase(val2).toLowerCase()} can damage your ${titleCase(val1).toLowerCase()} business. Our tool helps you:</p>
  <ul>
    <li>Transform harsh criticism into actionable feedback</li>
    <li>Craft professional responses that build trust</li>
    <li>Identify common ${titleCase(val2).toLowerCase()} issues to improve</li>
    <li>Turn unhappy customers into loyal advocates</li>
  </ul>
  
  <a href="${config.tool_url}?ref=p&${dim1}=${val1}&${dim2}=${val2}" class="cta">Translate a Review Now →</a>
  
  <div class="related">
    <h3>Related Tools</h3>
  </div>
</body>
</html>`;
}

const pages: { slug: string; url: string }[] = [];

for (const [dim1Name, dim2Name] of config.combinations) {
  const dim1 = config.dimensions.find(d => d.name === dim1Name);
  const dim2 = config.dimensions.find(d => d.name === dim2Name);
  
  if (!dim1 || !dim2) continue;
  
  for (const val1 of dim1.values_en) {
    for (const val2 of dim2.values_en) {
      const slug = `${slugify(val1)}-${slugify(val2)}`;
      const pageDir = path.join(outputDir, slug);
      
      if (!fs.existsSync(pageDir)) {
        fs.mkdirSync(pageDir, { recursive: true });
      }
      
      const html = generatePage(dim1Name, val1, dim2Name, val2);
      fs.writeFileSync(path.join(pageDir, 'index.html'), html);
      
      pages.push({
        slug,
        url: `${config.tool_url}/p/${slug}/`
      });
    }
  }
}

const today = new Date().toISOString().split('T')[0];
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(sitemapPath, sitemapContent);

console.log(`✅ Generated ${pages.length} programmatic SEO pages`);
console.log(`✅ Sitemap written to ${sitemapPath}`);
