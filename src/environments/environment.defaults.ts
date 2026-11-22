// Public browser configuration. Never put private credentials here.
export const environment = {
  production: false,
  services: {
    notifications: "https://gymseminario.onrender.com",
    qr: "https://api-j6b4.onrender.com/api/user-qr",
    statistics: "https://gymseminario.onrender.com/api/sessions/stats",
    coach: "http://localhost:3000/api",
  },
  stripe: {
    publishableKey:
      "pk_live_51TJbqSAXikJUnNBirg3ahcqYKpdObC3zDNfPcRLB85CWT0fVzm9WLIgwUywsqy8CbcyVYBdzMRvv1fRjWcnHQho100V5kYgtUa",
    currency: "MXN",
  },
} as const;
