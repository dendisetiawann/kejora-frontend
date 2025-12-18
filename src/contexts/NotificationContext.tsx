import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/router';
import { adminGet } from '@/lib/api';
import { Pesanan } from '@/types/entities';

interface NotificationContextType {
    unreadCount: number;
    showBanner: boolean;
    latestOrder: Pesanan | null;
    dismissBanner: () => void;
    clearUnread: () => void;
    refreshOrders: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [showBanner, setShowBanner] = useState(false);
    const [latestOrder, setLatestOrder] = useState<Pesanan | null>(null);

    const previousOrdersRef = useRef<Pesanan[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const router = useRouter();

    useEffect(() => {
        audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    }, []);

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch((e) => console.error('Error playing sound:', e));
        }
    };

    const fetchOrders = useCallback(async () => {
        try {
            const data = await adminGet<Pesanan[]>('/admin/kelolapesanan');

            // Initial load
            if (previousOrdersRef.current.length === 0) {
                previousOrdersRef.current = data;
                return;
            }

            // Check for new orders (id not in previous list) - includes QRIS orders that just got paid
            const newOrders = data.filter(
                (o) => !previousOrdersRef.current.find((prev) => prev.id_pesanan === o.id_pesanan)
            );

            // Also check for QRIS orders that just got paid (not cash - cash notif only on new order)
            const justPaidOrders = data.filter(
                (o) => {
                    const prevOrder = previousOrdersRef.current.find((prev) => prev.id_pesanan === o.id_pesanan);
                    return prevOrder && 
                           prevOrder.status_pembayaran !== 'dibayar' && 
                           o.status_pembayaran === 'dibayar' &&
                           o.metode_pembayaran === 'qris';
                }
            );

            const allNewOrders = [...newOrders, ...justPaidOrders];

            if (allNewOrders.length > 0) {
                setUnreadCount((prev) => prev + allNewOrders.length);
                setLatestOrder(allNewOrders[0]);
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
    }, []);

    useEffect(() => {
        // Only poll on admin pages and not on login
        if (!router.pathname.startsWith('/admin') || router.pathname === '/admin/HalamanLogin') {
            return;
        }

        // Poll every 5 seconds for faster real-time updates
        const interval = setInterval(fetchOrders, 5000);
        fetchOrders();
        return () => clearInterval(interval);
    }, [router.pathname, fetchOrders]);

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
