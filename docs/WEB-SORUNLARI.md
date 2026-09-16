# Website Sorunları (WEB)

> **Toplam:** 2 sorun | **Yüksek:** 1 | **Orta:** 1

---

## WEB-001: Responsive Breakpoint Eksik

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `website/css/style.css` |
| **Kategori** | Responsive Tasarım |

### Sorun
Website CSS'inde tablet boyutu (768px-1024px) için responsive breakpoint eksik. Mevcut breakpoint'ler muhtemelen sadece mobil (< 768px) ve desktop (> 1024px) için tanımlı.

### Etki
- Tablet kullanıcıları için bozuk görünüm
- Ortalama boyutlarda navigasyon sorunları
- SEO skorunu düşürür (Google mobile-first indeksleme)

### Çözüm
```css
/* Tablet breakpoint ekle */
@media (min-width: 768px) and (max-width: 1024px) {
  .hero h1 {
    font-size: 2.5rem;
  }
  
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }
  
  .navbar {
    padding: 0 2rem;
  }
  
  .download-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Large tablet / small desktop */
@media (min-width: 1024px) and (max-width: 1200px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## WEB-002: FAQ Accordion Memory Leak

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `website/js/main.js` |
| **Kategori** | Memory Leak |

### Sorun
FAQ accordion için event listener'lar ekleniyor ama sayfa navigasyonlarında temizlenmiyor. SPA (Single Page Application) değil ama JavaScript ile dinamik içerik varsa memory leak oluşabilir.

### Etki
- Uzun süreli ziyaretlerde bellek kullanımı artar
- Performans düşüklüğü

### Çözüm
```javascript
// main.js - Event delegation kullan
document.addEventListener('DOMContentLoaded', () => {
  // FAQ accordion - event delegation
  const faqContainer = document.querySelector('.faq-container');
  if (faqContainer) {
    faqContainer.addEventListener('click', (e) => {
      const question = e.target.closest('.faq-question');
      if (!question) return;
      
      const answer = question.nextElementSibling;
      const isOpen = question.classList.contains('active');
      
      // Tümünü kapat
      document.querySelectorAll('.faq-question.active').forEach(q => {
        q.classList.remove('active');
        q.nextElementSibling.style.maxHeight = null;
      });
      
      // Aç (eğer kapalıysa)
      if (!isOpen) {
        question.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  }
});
```

---

## Çözüm Özeti

| ID | Çözüm Zorluğu | Süre | Öncelik |
|----|:---:|:---:|:---:|
| WEB-001 | Orta | 2saat | Yüksek |
| WEB-002 | Kolay | 30dk | Orta |
