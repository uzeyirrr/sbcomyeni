import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Home,
  Settings,
  Calendar,
  FileText,
  MessageSquare,
  LogOut,
  Clock,
  Trophy,
  UserCog,
  Building,
  BarChart,
  ClipboardCheck,
  ClipboardList,
  ShieldHalf,
  LayoutDashboard,
  UserRoundPen
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/pocketbase";

const navItems = [
  {
    title: "Startseite", // "Ana Sayfa" -> "Startseite"
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Team-Analyse", // "Takım Analiz" -> "Team-Analyse"
    href: "/dashboard/team-leader",
    icon: ShieldHalf,
  },
  {
    title: "Benutzerverwaltung", // "Kullanıcı Yönetimi" -> "Benutzerverwaltung"
    href: "/dashboard/kullanicilar", // Keeping original href as it might be a slug
    icon: UserRoundPen,
  },
  {
    title: "Teams", // "Takımlar" -> "Teams"
    href: "/dashboard/takimlar", // Keeping original href
    icon: Users,
  },
  {
    title: "Slot-Verwaltung", // "Slot Yönetimi" -> "Slot-Verwaltung"
    href: "/dashboard/randevu-slotlari", // Keeping original href
    icon: Clock,
  },
  {
    title: "Terminkategorien", // "Randevu Kategorileri" -> "Terminkategorien"
    href: "/dashboard/randevu-kategorileri", // Keeping original href
    icon: FileText,
  },
  {
    title: "Kunden", // "Müşteriler" -> "Kunden"
    href: "/dashboard/musteriler", // Keeping original href
    icon: Users,
  },
  {
    title: "Verkaufsprüfung", // "Satış Kontrol" -> "Verkaufsprüfung"
    href: "/dashboard/satis-kontrol", // Keeping original href
    icon: BarChart,
  },
  {
    title: "Vor-Qualitätskontrolle", // "Ön Kalite Kontrol" -> "Vor-Qualitätskontrolle"
    href: "/dashboard/on-kalite-kontrol", // Keeping original href
    icon: ClipboardCheck,
  },
  {
    title: "Endgültige Qualitätskontrolle", // "Kalite Kontrol Final" -> "Endgültige Qualitätskontrolle"
    href: "/dashboard/kalite-kontrol-final", // Keeping original href
    icon: ClipboardList,
  },
  {
    title: "Kalender", // "Takvim" -> "Kalender"
    href: "/dashboard/takvim", // Keeping original href
    icon: Calendar,
  },
  {
    title: "Rangliste", // "Lider Tablosu" -> "Rangliste"
    href: "/dashboard/lider-tablosu", // Keeping original href
    icon: Trophy,
  },
  {
    title: "Unternehmen", // "Şirketler" -> "Unternehmen"
    href: "/dashboard/sirketler", // Keeping original href
    icon: Building,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
          CRM-System {/* "CRM Sistemi" -> "CRM-System" */}
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  pathname === item.href
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "transparent"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
        >
          <LogOut className="h-4 w-4" />
          Abmelden {/* "Çıkış Yap" -> "Abmelden" */}
        </Button>
      </div>
    </div>
  );
}