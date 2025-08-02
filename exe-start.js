#!/usr/bin/env node

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// Üretim modunda çalıştır
const dev = false;
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

// Uygulama dizinini belirle (pkg için önemli)
const appDir = path.resolve(process.pkg ? path.dirname(process.execPath) : __dirname);

console.log('CRM Uygulaması Başlatılıyor...');
console.log(`Uygulama Dizini: ${appDir}`);

// Next.js uygulamasını başlat
const app = next({ 
  dev,
  dir: appDir,
  conf: {
    distDir: '.next',
    basePath: '',
  }
});

const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    console.log('Next.js Uygulaması Hazırlandı');
    
    createServer(async (req, res) => {
      try {
        // URL'yi ayrıştır
        const parsedUrl = parse(req.url, true);
        
        // Next.js request handler'ı çağır
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Hata oluştu:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }).listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`> Uygulama şu adreste çalışıyor: http://localhost:${port}`);
      console.log('> Tarayıcınızı otomatik olarak açıyoruz...');
      
      // Tarayıcıyı aç
      const { exec } = require('child_process');
      exec(`start http://localhost:${port}`);
    });
  })
  .catch((ex) => {
    console.error('Uygulama başlatılırken hata oluştu:', ex);
    process.exit(1);
  });
