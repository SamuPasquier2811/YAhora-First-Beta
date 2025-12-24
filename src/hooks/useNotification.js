// src/hooks/useNotification.js
import { useState, useCallback } from 'react';

export const useNotification = () => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((type, message) => {
        const id = Date.now();
        const newNotification = { id, type, message };
        
        setNotifications(prev => [...prev, newNotification]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 4000);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, []);

    const getNotifications = useCallback(() => {
        return notifications;
    }, [notifications]);

    return { 
        showNotification, 
        removeNotification, 
        getNotifications 
    };
};