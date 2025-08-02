import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";

export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  team?: string;
  role?: string;
  created: string;
  updated: string;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // PocketBase'den kullanıcı bilgisini al
    const authData = pb.authStore.model;
    
    if (authData) {
      // Kullanıcı oturum açmış
      setUser({
        id: authData.id,
        email: authData.email,
        name: authData.name,
        avatar: authData.avatar,
        team: authData.team,
        role: authData.role,
        created: authData.created,
        updated: authData.updated,
      });
    } else {
      // Kullanıcı oturum açmamış
      setUser(null);
      router.push("/"); // Giriş sayfasına yönlendir
    }
    
    setLoading(false);
    
    // Auth durumu değiştiğinde güncelleyelim
    pb.authStore.onChange((token, model) => {
      if (model) {
        setUser({
          id: model.id,
          email: model.email,
          name: model.name,
          avatar: model.avatar,
          team: model.team,
          role: model.role,
          created: model.created,
          updated: model.updated,
        });
      } else {
        setUser(null);
        router.push("/"); // Giriş sayfasına yönlendir
      }
      setLoading(false);
    });
  }, []);

  return { user, loading };
};
