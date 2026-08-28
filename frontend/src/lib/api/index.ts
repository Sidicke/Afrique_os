/**
 * Couche API — point d'entrée unique
 * --------------------------------------------------------------------------
 * Toute la communication frontend ↔ backend passe par ce dossier.
 * Les composants/hooks/services n'importent JAMAIS `fetch` directement :
 * ils utilisent les modules exportés ici (ou leurs imports ciblés).
 *
 * Séparation stricte :
 *   composants → hooks/services → lib/api (cette couche) → backend REST/WS
 */

export * from "./config";
export * from "./types";
export * from "./session";
export { apiFetch, ApiError } from "./http";
export { authApi } from "./auth";
export {
  usersApi,
  type ApiProfile,
  type ApiAffiliationDetails,
  type ApiReferee,
  type ApiPointTransaction,
} from "./users";
export { adminApi } from "./admin";
export { shopsApi } from "./shops";
export { catalogueApi } from "./catalogue";
export { ordersApi } from "./orders";
export { dashboardApi } from "./dashboard";
export { productsApi } from "./products";
export { categoriesApi } from "./categories";
export { brandsApi } from "./brands";
export { searchApi } from "./search";
export {
  messagingApi,
  createMessagingSocket,
  ApiMessagingError,
} from "./messaging";
export { notificationsApi, type ApiNotification } from "./notifications";
export {
  toPublicProduct,
  toShopConfig,
  toShopConfigPatch,
  toDashboardProduct,
  toOrder,
  toCustomer,
  toOverview,
  toStats,
  toOrderRecord,
  toApiOrderStatus,
  toApiPaymentMethod,
  initialsOf,
  shortDate,
  publicProductImage,
  orderStatusLabel,
  paymentMethodLabel,
} from "./mappers";
