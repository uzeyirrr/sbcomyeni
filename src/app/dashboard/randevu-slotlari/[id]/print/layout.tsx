"use client";

import React from "react";

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="print-layout">
      {children}
      <style jsx global>{`
        @media print {
          /* Temel yazdırma ayarları */
          @page {
            size: full;
            margin: 10mm;
          }
          
          html, body {
            width: 100%;
            height: auto !important;
            overflow: visible !important;
            margin: 0;
            padding: 0;
          }
          
          /* Yazdırma sırasında görünmesi gereken içerik */
          .print-layout {
            display: block;
            width: 100%;
            height: auto;
            overflow: visible;
            position: relative;
          }
          
          /* Yazdırma sırasında gizlenecek öğeler */
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
} 