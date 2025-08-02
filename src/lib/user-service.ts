import { pb, getFileUrl } from './pocketbase';

// User type definition
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  password?: string;
  passwordConfirm?: string; // Only used for form validation, not stored
  created?: string;
  updated?: string;
}

// Get all users
export async function getUsers(): Promise<User[]> {
  try {
    const records = await pb.collection('users').getList(1, 50, {
      sort: 'created',
      expand: 'avatar',
    });
    
    // Avatar URL'lerini düzelt
    return records.items.map(record => {
      const user = { ...record } as unknown as User;
      
      // Avatar URL'sini oluştur
      if (record.avatar) {
        try {
          // Avatar bir string ise doğrudan dosya adı olarak kullan
          if (typeof record.avatar === 'string') {
            user.avatar = getFileUrl('users', user.id, record.avatar);
          } else if (record.avatar instanceof Object && 'filename' in record.avatar) {
            // Avatar bir obje ise ve filename özelliği varsa
            user.avatar = getFileUrl('users', user.id, (record.avatar as any).filename);
          }
        } catch (e) {
          console.error('Error getting avatar URL:', e);
          user.avatar = '';
        }
      }
      
      return user;
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Get top performing users
export async function getTopUsers(limit: number = 5): Promise<{user: User, customerCount: number}[]> {
  try {
    // Tüm kullanıcıları al
    const users = await getUsers();
    
    // Tüm müşterileri al
    const customersResult = await pb.collection('customers').getList(1, 200, {
      sort: '-created',
    });
    const customers = customersResult.items;
    
    // Her kullanıcı için müşteri sayısını hesapla
    const userPerformance = users.map(user => {
      const customerCount = customers.filter(customer => customer.agent === user.id).length;
      return { user, customerCount };
    });
    
    // Müşteri sayısına göre sırala ve ilk 'limit' kadarını döndür
    return userPerformance
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top users:', error);
    return [];
  }
}

// Get user performance statistics
export async function getUserPerformanceStats(): Promise<{ 
  totalUsers: number, 
  topUsers: {user: User, customerCount: number}[],
  averageCustomersPerUser: number
}> {
  try {
    const users = await getUsers();
    const topUsers = await getTopUsers(5);
    
    // Toplam müşteri sayısını hesapla
    const totalCustomers = topUsers.reduce((sum, item) => sum + item.customerCount, 0);
    
    // Kullanıcı başına ortalama müşteri sayısı
    const averageCustomersPerUser = users.length > 0 ? Math.round(totalCustomers / users.length) : 0;
    
    return {
      totalUsers: users.length,
      topUsers,
      averageCustomersPerUser
    };
  } catch (error) {
    console.error('Error calculating user performance stats:', error);
    return {
      totalUsers: 0,
      topUsers: [],
      averageCustomersPerUser: 0
    };
  }
}

// Get all agents (users with role "agent")
export async function getAgents(): Promise<User[]> {
  try {
    const users = await getUsers();
    return users.filter(user => user.role === "agent");
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
}

// Get a single user by ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const record = await pb.collection('users').getOne(id, {
      expand: 'avatar',
    });
    
    const user = { ...record } as unknown as User;
    
    // Avatar URL'sini oluştur
    if (record.avatar) {
      try {
        // Avatar bir string ise doğrudan dosya adı olarak kullan
        if (typeof record.avatar === 'string') {
          user.avatar = getFileUrl('users', user.id, record.avatar);
        } else if (record.avatar instanceof Object && 'filename' in record.avatar) {
          // Avatar bir obje ise ve filename özelliği varsa
          user.avatar = getFileUrl('users', user.id, (record.avatar as any).filename);
        }
      } catch (e) {
        console.error('Error getting avatar URL:', e);
        user.avatar = '';
      }
    }
    
    return user;
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    return null;
  }
}

// Register a new user
export async function registerUser(userData: Partial<User>) {
  try {
    // Zorunlu alanları kontrol et
    if (!userData.email || !userData.password || !userData.name || !userData.role) {
      throw new Error("Tüm zorunlu alanları doldurun (email, şifre, isim ve rol)");
    }

    // PocketBase için veri hazırla
    const formData = new FormData();
    formData.append("email", userData.email);
    formData.append("password", userData.password);
    formData.append("passwordConfirm", userData.password);
    formData.append("name", userData.name);
    formData.append("role", userData.role);
    formData.append("emailVisibility", "true");

    // Avatar varsa ekle
    if (userData.avatar && userData.avatar.startsWith('data:image')) {
      const base64Response = await fetch(userData.avatar);
      const blob = await base64Response.blob();
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      formData.append('avatar', file);
    }

    // Kullanıcıyı oluştur
    const record = await pb.collection('users').create(formData);
    return { success: true, data: record };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error };
  }
}

// Update a user
export async function updateUser(id: string, data: Partial<User>) {
  try {
    // Remove passwordConfirm as it's not needed for the API
    const { passwordConfirm, ...dataToSend } = data;
    
    // If there's a base64 image, convert it to a file
    if (dataToSend.avatar && dataToSend.avatar.startsWith('data:image')) {
      // Convert base64 to file
      const base64Response = await fetch(dataToSend.avatar);
      const blob = await base64Response.blob();
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      
      // Create FormData object for the API
      const apiFormData = new FormData();
      
      // Add all other fields
      Object.entries(dataToSend).forEach(([key, value]) => {
        if (key !== 'avatar' && value !== undefined && value !== '') {
          apiFormData.append(key, value.toString());
        }
      });
      
      // Add the file
      apiFormData.append('avatar', file);
      
      // Update record with FormData
      const record = await pb.collection('users').update(id, apiFormData);
      return { success: true, data: record };
    } else {
      // Remove avatar if it's not a base64 image
      if (dataToSend.avatar && !dataToSend.avatar.startsWith('data:image')) {
        delete dataToSend.avatar;
      }
      
      // Update record without image conversion
      const record = await pb.collection('users').update(id, dataToSend);
      return { success: true, data: record };
    }
  } catch (error) {
    console.error(`Error updating user with ID ${id}:`, error);
    return { success: false, error };
  }
}

// Delete a user
export async function deleteUser(id: string): Promise<boolean> {
  try {
    await pb.collection('users').delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting user with ID ${id}:`, error);
    return false;
  }
}

// Get a user by ID
export async function getUserByIdSimple(id: string): Promise<User | null> {
  try {
    const record = await pb.collection('users').getOne(id);
    return record as unknown as User;
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    return null;
  }
}

// Kullanıcı adını getir (cache ile)
const userCache = new Map<string, string>();

export async function getUserName(userId: string): Promise<string> {
  // Cache'de varsa oradan dön
  if (userCache.has(userId)) {
    return userCache.get(userId) || 'Bilinmeyen';
  }
  
  try {
    const user = await getUserById(userId);
    if (user) {
      const userName = user.name; // Sadece isim kullanıyoruz
      // Cache'e ekle
      userCache.set(userId, userName);
      return userName;
    }
    return 'Bilinmeyen';
  } catch (error) {
    console.error(`Error fetching user name for ID ${userId}:`, error);
    return 'Bilinmeyen';
  }
}
