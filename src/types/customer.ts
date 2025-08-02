import * as z from 'zod';

// Customer type definition based on PocketBase schema
export type Customer = {
  id: string;
  name: string;
  surname: string;
  tel: string;
  home_tel: string | null;
  email: string | null;
  home_people_number: number | null;
  age: number | null;
  location: string;
  street: string | null;
  postal_code: string | null;
  who_is_customer: string | null;
  roof_type: string | null;
  what_talked: string | null;
  roof: string | null;
  roof_image?: string | null;
  qc_on: "Yeni" | "Aranacak" | "Rausgefallen" | "Rausgefallen WP" | null;
  qc_final: "Yeni" | "Okey" | "Rausgefallen" | "Rausgefallen WP" | "Neuleger" | "Neuleger WP" | null;
  agent: string | null;
  sale: "red" | "green" | "blue" | "yellow" | "none" | null;
  note: string | null;
  qc_note: string | null;
  created: string;
  updated: string;
  expand?: {
    agent?: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };
};

// Form data type for adding/editing customers
export type CustomerFormData = {
  name: string;
  surname: string;
  tel: string;
  home_tel?: string | null;
  email?: string | null;
  home_people_number?: number | null;
  age?: number | null;
  location: string;
  street?: string | null;
  postal_code?: string | null;
  who_is_customer?: string | null;
  roof_type?: string | null;
  what_talked?: string | null;
  roof?: string | null;
  roof_image?: string | null;
  qc_on?: "Yeni" | "Aranacak" | "Rausgefallen" | "Rausgefallen WP" | null;
  qc_final?: "Yeni" | "Okey" | "Rausgefallen" | "Rausgefallen WP" | "Neuleger" | "Neuleger WP" | null;
  agent?: string | null;
  sale?: "red" | "green" | "blue" | "yellow" | "none" | null;
  note?: string | null;
  qc_note?: string | null;
};

// Options for dropdown selects
export const QC_ON_OPTIONS = ["Yeni", "Aranacak", "Rausgefallen", "Rausgefallen WP"] as const;
export const QC_FINAL_OPTIONS = ["Yeni", "Okey", "Rausgefallen", "Rausgefallen WP", "Neuleger", "Neuleger WP"] as const;
export const SALE_OPTIONS = ["red", "green", "blue", "yellow", "none"] as const;

// Form validation schema
export const customerFormSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  surname: z.string().min(2, "Soyad en az 2 karakter olmalıdır"),
  tel: z.string().min(10, "Telefon numarası en az 10 karakter olmalıdır"),
  home_tel: z.string().nullable().optional(),
  email: z.string().email("Geçerli bir e-posta adresi giriniz").nullable().optional(),
  home_people_number: z.number().nullable().optional(),
  age: z.number().nullable().optional(),
  location: z.string().min(2, "Konum en az 2 karakter olmalıdır"),
  street: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  who_is_customer: z.string().nullable().optional(),
  roof_type: z.string().nullable().optional(),
  what_talked: z.string().nullable().optional(),
  roof: z.string().nullable().optional(),
  roof_image: z.string().nullable().optional(),
  qc_on: z.enum(["Yeni", "Aranacak", "Rausgefallen", "Rausgefallen WP"]).nullable().optional(),
  qc_final: z.enum(["Yeni", "Okey", "Rausgefallen", "Rausgefallen WP", "Neuleger", "Neuleger WP"]).nullable().optional(),
  agent: z.string().nullable().optional(),
  sale: z.enum(["red", "green", "blue", "yellow", "none"]).nullable().optional(),
  note: z.string().nullable().optional(),
  qc_note: z.string().nullable().optional(),
});
