/**
 * Generates the PWA icon set from the brand SVG.
 * Run: npm run icons   (requires the devDependency `sharp`)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'public', 'icons')

const bellSvg = (bg, fg, dot, dotStroke, dotCx, dotCy, dotR) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <path d="M32 13.5c-8.2 0-13.2 6-13.2 14v7.3c0 1.1-.3 2.1-.9 3l-3.3 5c-1.1 1.8.1 4.2 2.3 4.2h30.2c2.2 0 3.4-2.4 2.3-4.2l-3.3-5c-.6-.9-.9-1.9-.9-3v-7.3c0-8-5-14-13.2-14z" fill="${fg}"/>
  <path d="M26.4 51.2a5.7 5.7 0 0 0 11.2 0z" fill="${fg}"/>
  <circle cx="${dotCx}" cy="${dotCy}" r="${dotR}" fill="${dot}" ${dotStroke ? `stroke="${dotStroke}" stroke-width="2.5"` : ''}/>
</svg>`

const icon = bellSvg('#24355e', '#faf7f1', '#f5c6af', null, 45, 16.5, 6)
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#24355e"/>
  <g transform="translate(6.4 7) scale(0.8)">
    <path d="M32 13.5c-8.2 0-13.2 6-13.2 14v7.3c0 1.1-.3 2.1-.9 3l-3.3 5c-1.1 1.8.1 4.2 2.3 4.2h30.2c2.2 0 3.4-2.4 2.3-4.2l-3.3-5c-.6-.9-.9-1.9-.9-3v-7.3c0-8-5-14-13.2-14z" fill="#faf7f1"/>
    <path d="M26.4 51.2a5.7 5.7 0 0 0 11.2 0z" fill="#faf7f1"/>
    <circle cx="45" cy="16.5" r="6" fill="#f5c6af"/>
  </g>
</svg>`

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const jobs = [
    { svg: icon, size: 192, file: 'icon-192.png' },
    { svg: icon, size: 512, file: 'icon-512.png' },
    { svg: maskable, size: 192, file: 'maskable-192.png' },
    { svg: maskable, size: 512, file: 'maskable-512.png' },
    // apple touch icon: full-bleed, no transparency
    { svg: bellSvg('#24355e', '#faf7f1', '#f5c6af', null, 45, 16.5, 6), size: 180, file: 'apple-touch-icon.png', flatten: true },
    // small monochrome-ish badge for notification tray
    { svg: bellSvg('#24355e', '#faf7f1', '#f5c6af', null, 45, 16.5, 6), size: 72, file: 'badge-72.png' },
  ]

  for (const job of jobs) {
    let pipeline = sharp(Buffer.from(job.svg), { density: 300 }).resize(job.size, job.size)
    if (job.flatten) {
      pipeline = pipeline.flatten({ background: '#24355e' })
    }
    const buffer = await pipeline.png().toBuffer()
    await writeFile(path.join(OUT_DIR, job.file), buffer)
    console.log(`✓ ${job.file} (${job.size}×${job.size})`)
  }

  // og image for social sharing
  const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#faf7f1"/>
  <circle cx="1020" cy="120" r="220" fill="#e9e1f7" opacity="0.8"/>
  <circle cx="150" cy="540" r="180" fill="#fbe3d6" opacity="0.8"/>
  <g transform="translate(120 190) scale(4.2)">
    <rect width="64" height="64" rx="14" fill="#24355e"/>
    <path d="M32 13.5c-8.2 0-13.2 6-13.2 14v7.3c0 1.1-.3 2.1-.9 3l-3.3 5c-1.1 1.8.1 4.2 2.3 4.2h30.2c2.2 0 3.4-2.4 2.3-4.2l-3.3-5c-.6-.9-.9-1.9-.9-3v-7.3c0-8-5-14-13.2-14z" fill="#faf7f1"/>
    <path d="M26.4 51.2a5.7 5.7 0 0 0 11.2 0z" fill="#faf7f1"/>
    <circle cx="45" cy="16.5" r="6" fill="#f5c6af"/>
  </g>
  <text x="120" y="400" font-family="Georgia, serif" font-size="72" font-weight="600" fill="#16233f">Your life, remembered.</text>
  <text x="120" y="460" font-family="system-ui, -apple-system, sans-serif" font-size="34" fill="#5a6a8f">Remember the little things. Focus on the big things.</text>
  <rect x="120" y="512" width="270" height="56" rx="14" fill="#24355e"/>
  <text x="150" y="548" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" fill="#faf7f1">Start remembering</text>
</svg>`
  const ogBuffer = await sharp(Buffer.from(ogSvg)).png().toBuffer()
  await writeFile(path.join(ROOT, 'public', 'og.png'), ogBuffer)
  console.log('✓ og.png (1200×630)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
