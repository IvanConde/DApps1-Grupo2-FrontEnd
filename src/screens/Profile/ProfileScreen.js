import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getProfile, updateProfile } from '../../services/user';
import { uploadProfileImage } from '../../services/cloudinary';

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userData = await getProfile();
      setUser(userData);
      setName(userData.name || '');
      setPhoto(userData.photo || null);
    } catch (error) {
      setErrorMessage('No se pudo cargar el perfil');
      setShowErrorModal(true);
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMessage('El nombre es requerido');
      setShowErrorModal(true);
      return;
    }

    try {
      setSaving(true);
      
      let photoUrl = user?.photo;
      
      // Si hay una nueva imagen, subirla a Cloudinary
      if (photo && photo !== user?.photo) {
        setUploading(true);
        try {
          photoUrl = await uploadProfileImage(photo);
        } catch (uploadError) {
          setUploading(false);
          setErrorMessage('No se pudo subir la imagen. Intenta nuevamente.');
          setShowErrorModal(true);
          return;
        }
        setUploading(false);
      }

      // Guardar perfil actualizado
      await updateProfile({
        name: name.trim(),
        photo: photoUrl
      });
      
      setShowSuccessModal(true);
      
    } catch (error) {
      setErrorMessage('No se pudo actualizar el perfil');
      setShowErrorModal(true);
      console.error('Error actualizando perfil:', error);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleImagePicker = async () => {
    if (uploading) return;
    
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMessage('Se necesitan permisos para acceder a la galería');
        setShowErrorModal(true);
        return;
      }

      // Mostrar opciones
      setShowImagePickerModal(true);
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      setShowImagePickerModal(false);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      setErrorMessage('No se pudo seleccionar la imagen');
      setShowErrorModal(true);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      setShowImagePickerModal(false);
      // Solicitar permisos de cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMessage('Se necesitan permisos para acceder a la cámara');
        setShowErrorModal(true);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      setErrorMessage('No se pudo tomar la foto');
      setShowErrorModal(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* Header verde consistente */}
        <View style={styles.greenHeader}>
          <Text style={styles.greenHeaderTitle}>Mi Perfil</Text>
        </View>
        
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.content}>
            {/* Subtitle */}
            <View style={styles.header}>
              <Text style={styles.subtitle}>Edita tu información personal</Text>
            </View>

        {/* Foto de perfil */}
        <View style={styles.photoSection}>
          <TouchableOpacity 
            style={styles.photoContainer} 
            onPress={handleImagePicker}
            disabled={uploading}
          >
            <View style={styles.photoWrapper}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.changePhotoButton, uploading && styles.changePhotoButtonDisabled]} 
            onPress={handleImagePicker}
            disabled={uploading}
          >
            <Text style={styles.changePhotoText}>
              {uploading ? 'Subiendo...' : 'Cambiar foto'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ingresa tu nombre"
              autoCapitalize="words"
              editable={!saving && !uploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
              placeholder="Email"
            />
            <Text style={styles.helpText}>El email no se puede modificar</Text>
          </View>

          {/* Botón guardar */}
          <TouchableOpacity
            style={[styles.saveButton, (saving || uploading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || uploading}
          >
            {saving || uploading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.saveButtonText}>
                  {uploading ? 'Subiendo imagen...' : 'Guardando...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Botón volver */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de selección de imagen */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 25,
            width: '85%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>
              📸
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
              Seleccionar imagen
            </Text>
            <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
              Elige de dónde quieres obtener la imagen
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                padding: 12,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center',
                marginBottom: 10
              }}
              onPress={pickImageFromGallery}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                📁 Galería
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#2196F3',
                padding: 12,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center',
                marginBottom: 10
              }}
              onPress={pickImageFromCamera}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                📷 Cámara
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#ccc',
                padding: 12,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 25,
            width: '85%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>
              ✅
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#4CAF50' }}>
              Perfil actualizado
            </Text>
            <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
              Tus cambios fueron guardados correctamente
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                padding: 12,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de error */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 25,
            width: '85%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>
              ❌
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#FF5252' }}>
              Error
            </Text>
            <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
              {errorMessage}
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FF5252',
                padding: 12,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  greenHeader: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  greenHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photoContainer: {
    marginBottom: 15,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#007bff',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#007bff',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  changePhotoButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  changePhotoText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;