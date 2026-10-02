const { chromium } = require(process.env.PW_MODULE || 'playwright')
const S = process.argv[2] || require('os').tmpdir()
const URL = process.env.APP_URL || 'http://localhost:4173/expense-tracker-/'
const log = (m) => console.log('✓', m)
const noOverflow = async (page, where) => {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth])
  assert(w[0] <= w[1], `no horizontal overflow on ${where} (${w[0]} <= ${w[1]})`)
}
const assert = (c, m) => { if (!c) { console.log('✗ FAIL:', m); process.exitCode = 1 } else log(m) }

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text() + ' @ ' + m.location().url))
  page.on('dialog', (d) => d.accept())
  await page.goto(URL)
  await page.waitForSelector('.hero')

  // add expense
  const add = async (type, amount, cat, note) => {
    await page.click('.fab')
    await page.click(`.seg button:text("${type}")`)
    await page.fill('input[aria-label=Amount]', amount)
    await page.click(`.chip:has-text("${cat}")`)
    if (note) await page.fill('input[aria-label=Note]', note)
    await page.click('button[type=submit]')
    await page.waitForSelector('.sheet', { state: 'detached' })
  }
  await add('Income', '50000', 'Salary', 'October salary')
  await add('Expense', '1200.50', 'Food', 'Groceries')
  await add('Expense', '300', 'Transport', 'Rickshaw')
  let text = await page.innerText('.hero')
  assert(text.includes('৳48,499.50') || text.replace(/[, ]/g,'').includes('৳48499.50'), 'balance = 50000 - 1500.50 -> ' + text.replace(/\n/g, ' '))
  await page.screenshot({ path: `${S}/home.png` })

  // budget: Food 1000 -> over
  await page.click('.nav-item:has-text("Budgets")')
  await page.click('.chip:has-text("Food")')
  await page.fill('input[aria-label="Monthly limit"]', '1000')
  await page.click('button[type=submit]')
  await page.waitForSelector('.sheet', { state: 'detached' })
  text = await page.innerText('main')
  assert(/Over by/.test(text), 'budget shows over limit')
  await page.screenshot({ path: `${S}/budgets.png` })
  await page.click('.nav-item:has-text("Home")')
  await page.waitForSelector('text=Budget alerts', { timeout: 3000 }).catch(() => {})
  assert(/Budget alerts/.test(await page.innerText('main')), 'home shows budget alert')
  await noOverflow(page, 'home')

  // history search + filter
  await page.click('.nav-item:has-text("History")')
  await page.waitForSelector('.row-item')
  await page.fill('input[type=search]', 'rick')
  await page.waitForFunction(() => document.querySelectorAll('.row-item').length === 1)
  assert((await page.locator('.row-item').count()) === 1, 'search finds 1 entry')
  await page.fill('input[type=search]', '')
  await page.click('button[aria-label=Filters]')
  await page.click('.seg button:text("Income")')
  assert((await page.locator('.row-item').count()) === 1, 'income filter -> 1 entry')
  await noOverflow(page, 'history with filters open')
  await page.screenshot({ path: `${S}/history.png` })
  await page.click('button:text("Clear filters")')

  // recurring: monthly rent starting 2 months ago -> should backfill 3 entries
  await page.click('.nav-item:has-text("More")')
  await page.click('.row-item:has-text("Recurring")')
  await page.click('button:text("+ Add")')
  await page.fill('input[aria-label=Amount]', '8000')
  await page.click('.chip:has-text("Bills")')
  await page.fill('input[aria-label=Note]', 'Rent')
  const d = new Date(); d.setMonth(d.getMonth() - 2); d.setDate(1)
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  await page.fill('#rec-start', iso)
  await page.click('button[type=submit]')
  await page.waitForSelector('.sheet', { state: 'detached' })
  await page.waitForTimeout(300)
  await page.click('.nav-item:has-text("History")')
  await page.fill('input[type=search]', '')
  await page.waitForTimeout(700)
  const rent = await page.locator('.row-item:has-text("Rent")').count()
  assert(rent === 3, `recurring backfilled 3 rent entries (got ${rent})`)
  await page.reload(); await page.waitForSelector('.hero')
  await page.click('.nav-item:has-text("History")')
  await page.waitForTimeout(700)
  assert((await page.locator('.row-item:has-text("Rent")').count()) === 3, 'reload does not duplicate recurring entries')

  // categories: delete Food -> entries move to Other, budget gone
  await page.click('.nav-item:has-text("More")')
  await page.click('.row-item:has-text("Categories")')
  await page.click('.row-item:has-text("Food")')
  await page.click('button:text("Delete")')
  await page.waitForSelector('.sheet', { state: 'detached' })
  await page.click('button:text("‹ Back")')
  await page.click('.nav-item:has-text("History")')
  await page.fill('input[type=search]', 'Groceries')
  const row = await page.innerText('.row-item')
  assert(/Other/.test(row), 'deleted category entries moved to Other -> ' + row.replace(/\n/g, ' '))
  await page.click('.nav-item:has-text("Budgets")')
  assert(/No budgets yet/.test(await page.innerText('main')), 'budget removed with its category')

  // backup roundtrip
  await page.click('.nav-item:has-text("More")')
  await page.click('.row-item:has-text("Backup")')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:text("Export backup")')])
  const path = `${S}/backup.json`
  await dl.saveAs(path)
  const data = JSON.parse(require('fs').readFileSync(path, 'utf8'))
  assert(data.format === 'expense-tracker-backup' && data.transactions.length === 6, `backup has ${data.transactions.length} transactions`)
  await page.setInputFiles('input[type=file]', path)
  await page.waitForFunction(() => /restored|not/.test(document.querySelector('[role=status]')?.innerText || ''))
  assert(/restored/.test(await page.innerText('[role=status]')), 'backup restored')
  require('fs').writeFileSync(`${S}/bad.json`, '{"hello":1}')
  await page.setInputFiles('input[type=file]', `${S}/bad.json`)
  await page.waitForFunction(() => /not an Expense Tracker backup/.test(document.querySelector('[role=status]').innerText))
  log('bad backup rejected')

  // offline works (service worker)
  await page.reload(); await page.waitForTimeout(1500)
  await ctx.setOffline(true)
  await page.reload()
  assert(await page.locator('.nav').count() === 1, 'app loads offline')

  assert(errors.length === 0, 'no console/page errors ' + JSON.stringify(errors))
  await browser.close()
})().catch((e) => { console.log('✗ CRASH', e.message); process.exit(1) })
