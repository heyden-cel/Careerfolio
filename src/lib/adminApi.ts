import axios from 'axios'

const API_BASE = '/api/admin'

function getAuthHeaders() {
  const token = localStorage.getItem('folio_admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface AdminUserSession {
  id: string
  name: string
  email: string
  role: 'admin'
}

export interface OverviewStats {
  totalUsers: number
  newThisWeek: number
  resumes: number
  portfolios: number
  livePortfolios: number
  aiRequestsToday: number
}

export interface OverviewData {
  stats: OverviewStats
  signupsOverTime: { date: string; label: string; count: number }[]
  recentActivity: {
    id: string
    type: string
    description: string
    timestamp: string
    user: string
  }[]
}

export interface ManagedUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  status: 'active' | 'suspended'
  joined: string
  documentsCount: number
  lastLogin?: string
}

export interface ManagedDocument {
  id: string
  userId: string
  ownerName: string
  ownerEmail: string
  type: 'resume' | 'portfolio'
  title: string
  live: boolean
  slug?: string
  flagged?: boolean
  flagReason?: string
  lastEdited: string
  template?: string
}

export interface AiAnalyticsData {
  usageByDay: { date: string; label: string; count: number }[]
  usageByAction: { action: string; count: number; percentage: number }[]
  perUserCounts: {
    userId: string
    userEmail: string
    count: number
    lastAction: string
    lastUsed: string
  }[]
  dailyLimit: number
}

export interface AdminSettingsData {
  siteName: string
  allowSignups: boolean
  maintenanceMode: boolean
  defaultPalette: string
  dailyAiLimit: number
}

export interface AuditLogEntry {
  id: string
  adminId: string
  adminName: string
  action: string
  details: string
  timestamp: string
  ip: string
}

export const adminApi = {
  async login(id: string, password: string) {
    const res = await axios.post(`${API_BASE}/login`, { id, password }, { withCredentials: true })
    if (res.data?.token) {
      localStorage.setItem('folio_admin_token', res.data.token)
    }
    return res.data as { user: AdminUserSession; token: string; isDefaultPassword: boolean }
  },

  async logout() {
    try {
      await axios.post(`${API_BASE}/logout`, {}, { headers: getAuthHeaders(), withCredentials: true })
    } finally {
      localStorage.removeItem('folio_admin_token')
    }
  },

  async getMe() {
    const res = await axios.get(`${API_BASE}/me`, { headers: getAuthHeaders(), withCredentials: true })
    return res.data as { user: AdminUserSession; isDefaultPassword: boolean }
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await axios.post(
      `${API_BASE}/change-password`,
      { currentPassword, newPassword },
      { headers: getAuthHeaders(), withCredentials: true }
    )
    return res.data as { ok: boolean; message: string; isDefaultPassword: boolean }
  },

  async getOverview() {
    const res = await axios.get(`${API_BASE}/overview`, { headers: getAuthHeaders(), withCredentials: true })
    return res.data as OverviewData
  },

  async getUsers(params: {
    search?: string
    role?: string
    status?: string
    sort?: string
    order?: 'asc' | 'desc'
    page?: number
    limit?: number
  }) {
    const res = await axios.get(`${API_BASE}/users`, {
      params,
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { users: ManagedUser[]; total: number; page: number; totalPages: number }
  },

  async getUserDetails(id: string) {
    const res = await axios.get(`${API_BASE}/users/${id}`, {
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { user: ManagedUser; documents: ManagedDocument[]; aiRequestsCount: number }
  },

  async suspendUser(id: string) {
    const res = await axios.post(`${API_BASE}/users/${id}/suspend`, {}, {
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { user: ManagedUser; success: boolean }
  },

  async resetUserPassword(id: string) {
    const res = await axios.post(`${API_BASE}/users/${id}/reset-password`, {}, {
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { temporaryPassword: string; message: string; success: boolean }
  },

  async deleteUser(id: string) {
    const res = await axios.delete(`${API_BASE}/users/${id}`, {
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { ok: boolean; success: boolean }
  },

  async getDocuments(params: {
    search?: string
    type?: string
    status?: string
    page?: number
    limit?: number
  }) {
    const res = await axios.get(`${API_BASE}/documents`, {
      params,
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { documents: ManagedDocument[]; total: number; page: number; totalPages: number }
  },

  async unpublishDocument(id: string) {
    const res = await axios.post(`${API_BASE}/documents/${id}/unpublish`, {}, {
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { document: ManagedDocument; success: boolean }
  },

  async deleteDocument(id: string) {
    const res = await axios.delete(`${API_BASE}/documents/${id}`, {
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { ok: boolean; success: boolean }
  },

  async getPortfolios(params: { search?: string; filter?: string }) {
    const res = await axios.get(`${API_BASE}/portfolios`, {
      params,
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { portfolios: ManagedDocument[]; total: number }
  },

  async flagPortfolio(id: string, flagged: boolean, reason?: string) {
    const res = await axios.post(
      `${API_BASE}/portfolios/${id}/flag`,
      { flagged, reason },
      { headers: getAuthHeaders(), withCredentials: true }
    )
    return res.data as { portfolio: ManagedDocument; success: boolean }
  },

  async unpublishPortfolio(id: string) {
    const res = await axios.post(`${API_BASE}/portfolios/${id}/unpublish`, {}, {
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { portfolio: ManagedDocument; success: boolean }
  },

  async getAiAnalytics() {
    const res = await axios.get(`${API_BASE}/ai`, { headers: getAuthHeaders(), withCredentials: true })
    return res.data as AiAnalyticsData
  },

  async updateAiDailyLimit(dailyLimit: number) {
    const res = await axios.post(
      `${API_BASE}/ai/settings`,
      { dailyLimit },
      { headers: getAuthHeaders(), withCredentials: true }
    )
    return res.data as { dailyLimit: number; success: boolean }
  },

  async getSettings() {
    const res = await axios.get(`${API_BASE}/settings`, { headers: getAuthHeaders(), withCredentials: true })
    return res.data as { settings: AdminSettingsData; isDefaultPassword: boolean }
  },

  async updateSettings(settings: Partial<AdminSettingsData>) {
    const res = await axios.post(`${API_BASE}/settings`, settings, {
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { settings: AdminSettingsData; success: boolean }
  },

  async getAuditLogs(params: { search?: string; page?: number; limit?: number }) {
    const res = await axios.get(`${API_BASE}/audit-logs`, {
      params,
      headers: getAuthHeaders(),
      withCredentials: true,
    })
    return res.data as { logs: AuditLogEntry[]; total: number; page: number; totalPages: number }
  },
}

