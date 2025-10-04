
export const notificationService = {
  showSuccess: (message: string) => {
    console.log("Success:", message);
    // Ici, on pourrait intégrer une bibliothèque de notifications (ex: react-toastify)
  },
  showError: (message: string, error?: any) => {
    console.error("Error:", message, error);
    // Ici, on pourrait intégrer une bibliothèque de notifications et un service de rapport d'erreurs
  },
  showInfo: (message: string) => {
    console.info("Info:", message);
    // Ici, on pourrait intégrer une bibliothèque de notifications
  },
};

