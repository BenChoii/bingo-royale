import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useState, useEffect } from "react";
import { NotificationProvider } from "./components/Notifications";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export default function ConvexApp() {
    return (
        <ConvexProvider client={convex}>
            <NotificationProvider>
                <App />
            </NotificationProvider>
        </ConvexProvider>
    );
}
