// src/services/auth/index.js
import api from "../../api/client";

export async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  return res.data; // { token, user, message }
}

export async function requestOtp(email) {
  const res = await api.post("/auth/request-otp", { email });
  return res.data; // { message }
}

export async function verifyOtp(email, code) {
  const res = await api.post("/auth/verify-otp", { email, code });
  return res.data; // { token, user, message }
}

export async function setPassword(newPassword) {
  const res = await api.post("/auth/set-password", { newPassword });
  return res.data; // { message: "Password actualizado" }
}

export async function register({ name, email, password, photo }) {
  const res = await api.post("/auth/register", { name, email, password, photo });
  return res.data; // { token, user }
}

export async function me() {
  const res = await api.get("/auth/me"); // Authorization: Bearer lo agrega el interceptor
  return res.data; // { user: {...} }
}

