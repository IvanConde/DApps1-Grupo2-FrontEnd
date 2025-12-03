# RitmoFit - Frontend

Aplicación móvil de RitmoFit desarrollada con React Native y Expo.

## Configuración inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiá el archivo `.env.example` como `.env`:

```bash
cp .env.example .env
```

Editá el archivo `.env` y cambiá `TU_IP_LOCAL` por la IP de tu computadora en la red local:

```env
API_BASE_URL=http://TU_IP_LOCAL:4000/api
```

**¿Cómo obtener tu IP local?**

- **Windows**: Ejecutá `ipconfig` en cmd y buscá "Dirección IPv4"
- **Mac/Linux**: Ejecutá `ifconfig` o `ip addr` y buscá tu IP en la red WiFi

**Ejemplo:**
```env
API_BASE_URL=http://192.168.1.100:4000/api
```

### 3. Iniciar la aplicación

**Modo desarrollo:**
```bash
npm start
```

**Compilar para Android:**
```bash
npm run android
```

## Notas importantes

- El archivo `.env` NO se sube al repositorio (está en `.gitignore`)
- Cada desarrollador debe crear su propio `.env` con su IP local
- Si cambiás de red WiFi, debés actualizar la IP en `.env`
