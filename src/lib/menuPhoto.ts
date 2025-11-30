import { Menu } from '@/types/entities';

const RAW_IMAGE_BASE_URL = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim();

const normalizeBaseUrl = (value: string): string => {
    if (!value) {
        return '';
    }

    try {
        const url = new URL(value);
        let pathname = url.pathname.replace(/\/+$/, '');
        if (pathname.endsWith('/api')) {
            pathname = pathname.slice(0, -4);
        }
        const suffix = pathname ? pathname : '';
        return `${url.origin}${suffix}`.replace(/\/$/, '');
    } catch {
        // Fallback for relative bases; strip trailing /api if present
        return value.replace(/\/+$/, '').replace(/\/api$/, '');
    }
};

const IMAGE_BASE_URL = normalizeBaseUrl(RAW_IMAGE_BASE_URL);

const buildStorageUrl = (path: string): string => {
    const trimmed = path.replace(/^\/+/, '');
    const normalized = trimmed.startsWith('storage/') ? trimmed : `storage/${trimmed}`;
    return IMAGE_BASE_URL ? `${IMAGE_BASE_URL}/${normalized}` : `/${normalized}`;
};

export const resolveMenuPhoto = (menu: Menu): string => {
    // Use uploaded photo if available
    if (menu.foto_menu && menu.foto_menu.trim()) {
        const sanitized = menu.foto_menu.trim();
        // If it's already a full URL, return it as-is
        if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
            return sanitized;
        }
        // Otherwise, assume it's a relative path in storage
        return buildStorageUrl(sanitized);
    }

    // Placeholder image (base64 encoded transparent placeholder with a coffee cup icon)
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuKYlTwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5UaWRhayBBZGEgRm90bzwvdGV4dD48L3N2Zz4=';
};
