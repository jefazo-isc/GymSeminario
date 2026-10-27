export function authErrorMessage(error: unknown): string {
  const message = (error as { message?: string })?.message;
  if (
    message &&
    [
      "Demasiados intentos fallidos. Cambia tu clave para poder ingresar.",
      "Correo o contraseña incorrectos.",
      "Demasiados intentos. Por favor espera unos momentos o cambia tu clave.",
    ].includes(message)
  )
    return message;
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "El correo o la contraseña no son correctos.",
    "auth/wrong-password": "La contraseña no es correcta.",
    "auth/user-not-found": "No se pudo acceder con esas credenciales.",
    "auth/email-already-in-use":
      "Ese correo ya tiene una cuenta. Intenta iniciar sesión.",
    "auth/network-request-failed":
      "No hay conexión con Firebase. Revisa tu red y vuelve a intentarlo.",
    "auth/too-many-requests":
      "Hay demasiados intentos. Espera unos minutos antes de volver a intentar.",
    "auth/unauthorized-domain":
      "El acceso de Firebase no está habilitado para esta dirección del sitio.",
    "auth/popup-blocked":
      "Tu navegador bloqueó la ventana de acceso. Permite la ventana e inténtalo de nuevo.",
    "auth/popup-closed-by-user":
      "Cerraste la ventana de acceso. Puedes volver a abrirla.",
    "auth/invalid-phone-number":
      "Escribe un número válido con prefijo internacional, por ejemplo +52.",
    "auth/invalid-verification-code":
      "El código no es correcto. Revisa los seis dígitos e inténtalo de nuevo.",
    "auth/code-expired": "El código expiró. Solicita uno nuevo.",
    "auth/captcha-check-failed":
      "La verificación expiró o no se pudo validar. Vuelve a cargar el CAPTCHA.",
    "auth/operation-not-allowed":
      "Este método de acceso no está habilitado en Firebase.",
    "auth/weak-password":
      "La contraseña no cumple los requisitos del proveedor.",
  };
  return (
    messages[code || ""] ||
    "No pudimos completar la operación. Revisa tus datos o inténtalo de nuevo más tarde."
  );
}
