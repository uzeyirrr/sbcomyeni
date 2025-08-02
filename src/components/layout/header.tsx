"use client";

import { User } from "lucide-react"; // Bell icon removed
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, getFileUrl } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();
  const user = getCurrentUser();
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  // Avatar URL erstellen
  const avatarUrl = user?.avatar ? getFileUrl('users', user.id, user.avatar) : '';

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex flex-1 items-center gap-4 md:gap-6">
        {/* Search functionality removed */}
      </div>
      <div className="flex items-center gap-4">
        {/* Notification bell removed */}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={avatarUrl} alt={user?.name || "Benutzer"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.name || "Benutzer"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profil")}>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}