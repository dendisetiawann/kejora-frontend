import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { adminGet } from '@/lib/api';
import { Order } from '@/types/entities';

interface NotificationContextType {
    unreadCount: number;
    showBanner: boolean;
    latestOrder: Order | null;
    dismissBanner: () => void;
    clearUnread: () => void;
    refreshOrders: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [showBanner, setShowBanner] = useState(false);
    const [latestOrder, setLatestOrder] = useState<Order | null>(null);

    const previousOrdersRef = useRef<Order[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const router = useRouter();

    // Simple beep sound (base64)
    const beepSound = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'; // Shortened placeholder, will use a real one

    useEffect(() => {
        audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    }, []);

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch((e) => console.error('Error playing sound:', e));
        }
    };

    const fetchOrders = async () => {
        try {
            const data = await adminGet<Order[]>('/admin/orders');

            // Initial load
            if (previousOrdersRef.current.length === 0) {
                previousOrdersRef.current = data;
                return;
            }

            // Check for new orders (id not in previous list)
            const newOrders = data.filter(
                (o) => !previousOrdersRef.current.find((prev) => prev.id === o.id) && o.order_status === 'baru'
            );

            if (newOrders.length > 0) {
                setUnreadCount((prev) => prev + newOrders.length);
                setLatestOrder(newOrders[0]);
                setShowBanner(true);
                playSound();

                // Auto-hide banner after 30 seconds
                setTimeout(() => {
                    setShowBanner(false);
                }, 30000);
            }

            previousOrdersRef.current = data;
        } catch (error) {
            console.error('Failed to poll orders:', error);
        }
    };

    useEffect(() => {
        // Only poll on admin pages and not on login
        if (!router.pathname.startsWith('/admin') || router.pathname === '/admin/login') {
            return;
        }

        // Poll every 10 seconds
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [router.pathname]);

    const dismissBanner = () => {
        setShowBanner(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const clearUnread = () => {
        setUnreadCount(0);
        dismissBanner();
    };

    const refreshOrders = async () => {
        await fetchOrders();
    };

    return (
        <NotificationContext.Provider
            value={{
                unreadCount,
                showBanner,
                latestOrder,
                dismissBanner,
                clearUnread,
                refreshOrders,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
