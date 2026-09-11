# 📄 Dosya Denetimi: Kök Dizin Dosyaları (`package.json`, `tsconfig.json`, `.gitignore`)

> **Dosyalar**: `package.json`, `tsconfig.json`, `.gitignore`, `debug.log`, `debug-err.log`, `LICENSE`  
> **Rolü**: Monorepo Kök Yönetimi, Çalışma Alanları (Workspaces) ve Git İpuçları

---

## 🔍 1. Genel İnceleme

Kök dizin, npm workspaces (`desktop`, `website`, `mobile`) yapısını organize eder ve tüm alt projelerin ortak betiklerini (`npm run dev`, `npm run build`, `npm run build:installer`) koordine eder.

---

## ⚠️ 2. Tespit Edilen Sorunlar

### Sorun 1 (🟡 ORTA): Kök Dizinde 0 Baytlık Boş Log Dosyalarının Bulunması
- **Dosyalar**: `debug.log`, `debug-err.log`
- **Açıklama**: Kök dizinde 0 bayt boyutunda iki adet log dosyası unutulmuştur. `.gitignore` dosyasında `*.log` kuralı bulunmasına rağmen bu dosyalar daha önce takip edilmiş (tracked) veya boş bırakılmıştır.
- **Düzeltme**: Bu dosyalar silinmeli ve `git rm --cached` ile temizlenmelidir.

---

### Sorun 2 (🟡 ORTA): Kök `tsconfig.json`'ın Aşırı Boş Olması
- **Dosya**: `tsconfig.json`
- **Açıklama**: Kök `tsconfig.json` yalnızca 63 bayttır ve çalışma alanları arasındaki TypeScript referanslarını (`references: [...]`) tanımlamamaktadır. Bu durum VS Code ve IDE'lerin çapraz proje sembollerini çözerken yavaşlamasına sebep olur.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Boş log dosyaları temizlenmelidir.
2. Kök `tsconfig.json` proje referansları (Project References) ile zenginleştirilmelidir.
