import { authApi } from "../services/api";

export function loginUser(body) {
  return authApi.login(body);
}

export function registerUser(body) {
  return authApi.register(body);
}
