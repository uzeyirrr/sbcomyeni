# CRM-System

Bu proje, müşteri ilişkileri yönetimini kolaylaştırmak için geliştirilmiş modern bir CRM sistemidir. Takım bazlı analiz, kullanıcı performans ölçümü ve kalite kontrol süreçlerini entegre şekilde sunar.

## 🚀 Özellikler

### 📊 Dashboard (Genel Bakış)
- Toplam müşteri, kullanıcı ve takım sayıları
- Kullanıcı başına ortalama müşteri oranı
- Müşteri analizleri (ön kalite kontrol durumları: Aranacak, Rausgefallen WP, Yeni)
- Son eklenen müşterilerin durumu
- En iyi kullanıcılar ve takımlar listesi

### 👥 Kullanıcı ve Takım Yönetimi
- Yeni kullanıcılar ve takımlar oluşturulabilir
- Kullanıcı başına atanan müşterilerin takibi
- Takım liderliği ve performans takibi

### 📞 Müşteri Yönetimi
- Müşteri durumlarının (örneğin aranacak, yeni, elenen) takibi
- Randevu kategorileri ve slot yönetimi

### ✅ Kalite Kontrol Süreci
- Ön kalite kontrol (Vor-QC)
- Nihai kalite kontrol (Final-QC)
- Statü bazlı müşteri dağılımı ve analizler

  
 ![1752252916145](https://github.com/user-attachments/assets/9a7ab468-5271-44ec-abd3-f2e328728249)


### 📅 Takvim & Slot Yönetimi
- Müşteri görüşmeleri için zaman dilimlerinin tanımlanması
- Slot rezervasyon ve takibi

  
![1752252916229](https://github.com/user-attachments/assets/6da56c86-b047-4b70-bd00-545a81b6862c)

### 🏆 Sıralamalar
- Kullanıcı ve takım bazlı başarı sıralamaları
- Performans kıyaslaması
## 🛠️ Teknolojiler

| Katman     | Teknoloji                 |
|------------|---------------------------|
| Frontend   | [Next.js](https://nextjs.org), [shadcn/ui](https://ui.shadcn.com) |
| Backend    | [PocketBase](https://pocketbase.io) (veritabanı ve API) |
| UI Dili    | Almanca (varsayılan)      |

## 📂 Kurulum
```bash
git clone https://github.com/uzeyirrr/sbcomyeni.git
cd sbcomyeni
npm install # veya yarn
npm run dev # geliştirme ortamı
