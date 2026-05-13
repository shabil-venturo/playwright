# @venturo/playwright

Fork dari [Playwright](https://github.com/microsoft/playwright) dengan tambahan fitur **filter Positive & Negative case** di Playwright UI — memudahkan tim QA untuk memilah test berdasarkan kategori skenario pengujian.

---

## Fitur Tambahan

### Filter Positive & Negative Case di UI

Saat membuka Playwright UI (`--ui`), tersedia dua checkbox baru di panel filter:

- **positive case** — hanya tampilkan test yang ditandai `@positive`
- **negative case** — hanya tampilkan test yang ditandai `@negative`

Filter ini bekerja bersamaan dengan filter Status (passed/failed/skipped) dan filter Project yang sudah ada.

---

## Instalasi

```bash
npm install -D venturo-playwright
npx playwright install
```

---

## Cara Menandai Test

Tambahkan tag `@positive` atau `@negative` pada setiap test menggunakan opsi `tag`:

```typescript
import { test, expect } from 'venturo-playwright';

test.describe('Alur Login', () => {

  // Skenario berhasil → positive case
  test('Berhasil masuk dengan email dan password yang benar', { tag: '@positive' }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('user@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/dashboard');
  });

  // Skenario gagal → negative case
  test('Gagal masuk ketika password salah', { tag: '@negative' }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('user@example.com');
    await page.locator('input[name="password"]').fill('password-salah');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  // Skenario gagal → negative case
  test('Gagal masuk ketika form dikosongkan', { tag: '@negative' }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/wajib diisi/i)).toBeVisible();
  });

});
```

---

## Menjalankan UI

```bash
# Buka Playwright UI (lokal)
npx playwright test --ui

# Buka Playwright UI dan bisa diakses dari perangkat lain via IP
npx playwright test --ui --ui-host=0.0.0.0 --ui-port=8932
```

Setelah UI terbuka, klik bagian filter di pojok kiri atas untuk melihat opsi **positive case** dan **negative case**.

---

## Menjalankan Test Berdasarkan Tag

Tanpa UI, kamu juga bisa filter test via CLI:

```bash
# Hanya jalankan positive case
npx playwright test --grep @positive

# Hanya jalankan negative case
npx playwright test --grep @negative
```

---

## Panduan Klasifikasi Skenario

| Kategori | Tag | Kapan digunakan |
|---|---|---|
| **Positive case** | `@positive` | Skenario berhasil / happy path — input benar, sistem merespons sesuai harapan |
| **Negative case** | `@negative` | Skenario gagal / error — input salah, validasi form, penanganan error |

---

## Kompatibilitas

Package ini berbasis Playwright versi `1.61.0`. Semua fitur Playwright asli tetap tersedia dan tidak ada yang dihapus.

## npm

[https://www.npmjs.com/package/venturo-playwright](https://www.npmjs.com/package/venturo-playwright)

---

## Lisensi

[Apache 2.0](LICENSE) — fork dari [microsoft/playwright](https://github.com/microsoft/playwright).
