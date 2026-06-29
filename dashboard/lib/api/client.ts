import { ApiResponse, ApiErrorResponse } from './types';
import { ApiError } from './errors';

// Helper to attach tokens, parse response, handle errors
export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            const errResponse = data as ApiErrorResponse;
            throw new ApiError(
                errResponse.error?.code || 'FETCH_ERROR', 
                errResponse.error?.message || 'Failed to fetch', 
                response.status
            );
        }

        return data as ApiResponse<T>;
    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('NETWORK_ERROR', error.message || 'Network error occurred', 0);
    }
}
