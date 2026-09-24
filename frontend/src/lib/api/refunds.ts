import { apiFetch } from "./http";


export type ApiRefundRequest = {
  id: string;
  orderId: string;
  clientId: string;
  boutiqueId: string;
  reason: string;
  description: string;
  evidenceUrl: string | null;
  vendorComment: string | null;
  vendorRepliedAt: string | null;
  resolutionText: string | null;
  status: 'PENDING' | 'VENDOR_REPLIED' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
  order: { id: string };
  client: { name: string; email: string };
  boutique?: { name: string };
};

export const refundsApi = {
  // Vendor
  getVendorRequests: () => {
    return apiFetch<ApiRefundRequest[]>('/refunds/vendor');
  },
  getVendorRequest: (id: string) => {
    return apiFetch<ApiRefundRequest>(`/refunds/vendor/${id}`);
  },
  vendorReply: (id: string, comment: string) => {
    return apiFetch(`/refunds/vendor/${id}/reply`, {
      method: 'PATCH',
      body: JSON.stringify({ comment }),
    });
  },

  // Admin
  getAdminRequests: () => {
    return apiFetch<ApiRefundRequest[]>('/refunds/admin');
  },
  getAdminRequest: (id: string) => {
    return apiFetch<ApiRefundRequest>(`/refunds/admin/${id}`);
  },
  adminDecide: (id: string, action: 'APPROVE' | 'REJECT', resolutionText: string) => {
    return apiFetch(`/refunds/admin/${id}/decide`, {
      method: 'PATCH',
      body: JSON.stringify({ action, resolutionText }),
    });
  },
};
