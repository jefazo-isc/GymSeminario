import { HttpInterceptorFn } from "@angular/common/http";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem("gym_jwt");
  // Solo enviar el token a nuestro propio backend para evitar disparar preflight OPTIONS en APIs externas
  const isInternalBackend =
    req.url.includes("gymseminario.onrender.com") ||
    req.url.includes("localhost:3000") ||
    req.url.startsWith("/api");

  if (token && isInternalBackend) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned);
  }
  return next(req);
};
