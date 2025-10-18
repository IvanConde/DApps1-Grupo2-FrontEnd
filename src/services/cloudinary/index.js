const CLOUD_NAME = 'dljhwofyr';
const UPLOAD_PRESET = 'ritmofit_profiles';

export const uploadProfileImage = async (imageUri) => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `profile-${Date.now()}.jpg`,
    });
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const result = await response.json();
    
    if (result.secure_url) {
      return result.secure_url;
    } else {
      throw new Error('Error al subir la imagen a Cloudinary');
    }
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('No se pudo subir la imagen. Verifica tu conexión.');
  }
};