import { pb } from './pocketbase';

export interface Company {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  deaktif: boolean;
  password?: string;
  created: string;
  updated: string;
}

// Get all companies
export async function getCompanies(): Promise<Company[]> {
  try {
    const records = await pb.collection('companies').getList(1, 100, {
      sort: 'name',
    });
    
    return records.items as unknown as Company[];
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
}

// Get a single company by ID
export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const record = await pb.collection('companies').getOne(id);
    
    return record as unknown as Company;
  } catch (error) {
    console.error(`Error fetching company with ID ${id}:`, error);
    return null;
  }
}

// Create a new company
export async function createCompany(data: Partial<Company>) {
  try {
    // Zorunlu alanları kontrol et
    if (!data.name) {
      throw new Error("Şirket adı zorunludur.");
    }

    // FormData oluştur
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("password", "123456789"); // Varsayılan şifre
    formData.append("passwordConfirm", "123456789"); // PocketBase için şifre doğrulama
    
    // Opsiyonel alanları ekle
    if (data.description) formData.append("description", data.description);
    if (data.address) formData.append("address", data.address);
    if (data.phone) formData.append("phone", data.phone);
    if (data.email) formData.append("email", data.email);
    if (data.website) formData.append("website", data.website);
    formData.append("deaktif", data.deaktif ? "true" : "false");

    // Şirketi oluştur
    const record = await pb.collection('companies').create(formData);
    return { success: true, data: record };
  } catch (error) {
    console.error('Error creating company:', error);
    return { success: false, error };
  }
}

// Update a company
export async function updateCompany(id: string, data: Partial<Company>) {
  try {
    console.log("Gelen veri:", data);
    
    // Veriyi temizle ve hazırla
    const updateData: Record<string, any> = {};
    
    // Sadece tanımlı alanları ekle
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.deaktif !== undefined) updateData.deaktif = data.deaktif;
    
    // Boş string'leri null'a çevir
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    console.log("Gönderilecek veri:", updateData);
    const record = await pb.collection('companies').update(id, updateData);
    return { success: true, data: record };
  } catch (error) {
    console.error(`Error updating company with ID ${id}:`, error);
    return { success: false, error };
  }
}

// Delete a company
export async function deleteCompany(id: string): Promise<boolean> {
  try {
    await pb.collection('companies').delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting company with ID ${id}:`, error);
    return false;
  }
}
