import PocketBase from 'pocketbase';

// PocketBase sunucu bağlantısı
export const pb = new PocketBase('http://dental-price-pocketbase-defee1-37-148-207-162.traefik.me/');

// Otomatik istek iptalini devre dışı bırak
pb.autoCancellation(false);

// PocketBase dosya URL'si oluşturmak için yardımcı fonksiyon
export const getFileUrl = (collectionId: string, recordId: string, fileName: string) => {
  if (!collectionId || !recordId || !fileName) {
    console.warn('getFileUrl: Eksik parametreler:', { collectionId, recordId, fileName });
    return '';
  }
  
  const url = `${pb.baseUrl}/api/files/${collectionId}/${recordId}/${fileName}`;
  console.log('getFileUrl oluşturulan URL:', url);
  return url;
};

// Helper function to check if user is authenticated
export const isUserAuthenticated = () => {
  return pb.authStore.isValid;
};

// Helper function to get the current user
export const getCurrentUser = () => {
  return pb.authStore.model;
};

// Helper function to logout
export const logout = () => {
  pb.authStore.clear();
  // For development, we'll redirect to login page
  window.location.href = '/';
};

// Helper function to register a new user
export const registerUser = async (userData: {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
}) => {
  try {
    const record = await pb.collection('users').create(userData);
    return { success: true, data: record };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error };
  }
};
