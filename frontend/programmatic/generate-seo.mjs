#!/usr/bin/env node
/**
 * Programmatic SEO Page Generator
 * Generates landing pages for long-tail keywords
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(readFileSync(join(__dirname, 'dimensions.json'), 'utf-8'));
const outputDir = join(__dirname, '../public/p');
const sitemapPath = join(__dirname, '../public/sitemap-programmatic.xml');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Helper to create URL-safe slug
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Helper to title case
function titleCase(text) {
  return text.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Generate page content (customize per tool)
function generatePage(toolName, dim1, val1, dim2, val2) {
  const title = `${toolName} for ${titleCase(val1)} ${titleCase(val2)}`;
  const description = `${toolName} for ${titleCase(val1).toLowerCase()} situations with a ${titleCase(val2).toLowerCase()} approach. Free and instant!`;
  const slug = `${slugify(val1)}-${slugify(val2)}`;
  const url = `${config.tool_url}/p/${slug}/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | ${config.tool}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "${title}",
    "description": "${description}",
    "url": "${url}",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
  }
  </script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1 { color: #1a1a2e; }
    .cta { background: #4361ee; color: white; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; display: inline-block; margin: 2rem 0; }
    .cta:hover { background: #3730a3; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Use our ${config.tool} for ${titleCase(val1).toLowerCase()} situations with a ${titleCase(val2).toLowerCase()} style.</p>
  <a href="${config.tool_url}?ref=p&${dim1}=${val1}&${dim2}=${val2}" class="cta">Try Now →</a>
</body>
</html>`;
}

// Generate all pages
const pages = [];

for (const [dim1Name, dim2Name] of config.combinations) {
  const dim1 = config.dimensions.find(d => d.name === dim1Name);
  const dim2 = config.dimensions.find(d => d.name === dim2Name);
  
  if (!dim1 || !dim2) continue;
  
  for (const val1 of dim1.values_en) {
    for (const val2 of dim2.values_en) {
      const slug = `${slugify(val1)}-${slugify(val2)}`;
      const pageDir = join(outputDir, slug);
      
      if (!existsSync(pageDir)) {
        mkdirSync(pageDir, { recursive: true });
      }
      
      const html = generatePage(config.tool, dim1Name, val1, dim2Name, val2);
      writeFileSync(join(pageDir, 'index.html'), html);
      
      pages.push({
        slug,
        url: `${config.tool_url}/p/${slug}/`
      });
    }
  }
}

// Generate sitemap
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

writeFileSync(sitemapPath, sitemapContent);

console.log(`✅ Generated ${pages.length} programmatic SEO pages`);
console.log(`✅ Sitemap written to ${sitemapPath}`);
