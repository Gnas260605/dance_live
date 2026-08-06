// Shared contract definitions between Web frontend and API backend

export interface NormalizedTikTokEvent {
    source: 'TIKTOK';
    sourceEventId?: string;
    eventType: 'COMMENT' | 'GIFT' | 'LIKE' | 'FOLLOW';
    workspaceId: string;
    tiktokUsername: string;
    nickname?: string;
    timestamp: string;
    gift?: {
        giftId: string;
        giftName: string;
        repeatCount: number;
        singleCoinValue: number;
        totalCoins: number;
    };
}

export interface RobloxActionPayload {
    type: string;
    version: number;
    delayMs: number;
    durationMs: number;
    params: Record<string, any>;
}

export interface GameEventContract {
    eventId: string;
    userId: string;
    eventType: string;
    actions: RobloxActionPayload[];
    status: 'QUEUED' | 'DELIVERED' | 'ACKED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
    expiresAt: string;
    createdAt: string;
}
