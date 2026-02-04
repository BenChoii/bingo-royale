import { useState, useEffect, createContext, useContext } from "react";
import "./Notifications.css";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);

    const showNotification = (message, type = "info") => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4000);
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="notifications-container">
                {notifications.map((n) => (
                    <div key={n.id} className={`notification ${n.type}`}>
                        <div className="notification-content">
                            {n.type === "success" && "✅ "}
                            {n.type === "error" && "❌ "}
                            {n.type === "info" && "ℹ️ "}
                            {n.message}
                        </div>
                        <button
                            className="notification-close"
                            onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export const useNotification = () => useContext(NotificationContext);
