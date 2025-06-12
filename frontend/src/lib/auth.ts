// lib/auth.ts

export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

// export const getToken = () => {
//   return localStorage.getItem("token");
// };

export const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

export const removeToken = () => {
  localStorage.removeItem("token");
};

export const isLoggedIn = () => {
  return !!getToken();
};
