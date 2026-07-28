import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { a4HandoffConsentHandler, a4HandoffConsumeHandler, a4HandoffCreateHandler } from "./a4/handoff";
import { a4NurseryBulkSignupHandler } from "./a4/bulkSignupNurseries";
import { a4NurseryAutoSignupHandler } from "./a4/autoSignupNursery";
import { a4LocalRoomUpsertHandler, a4RoomsListHandler, a4RoomsSyncHandler } from "./a4/syncRooms";
import { adminCancelRequestReviewHandler } from "./admin/cancelRequestReview";
import { adminA5sCustomerMonitorHandler } from "./admin/a5sCustomerMonitor";
import { a5LinkageDiagnosticsHandler } from "./admin/linkageDiagnostics";
import { adminProductModerationHandler } from "./admin/productModeration";
import { adminProductReviewHandler } from "./admin/productReview";
import { analyticsRecordVisitHandler, analyticsSummaryHandler } from "./analytics/visits";
import { authBootstrapHandler } from "./auth/bootstrap";
import { companyBetaAuthTokenHandler } from "./auth/companyBetaAuthToken";
import { cmsUploadFileHandler } from "./cms/uploadFile";
import { commerceLiveReadHandler } from "./commerce/liveRead";
import { adminStorefrontSnapshotPublishHandler } from "./commerce/publishSnapshot";
import { storefrontCompanySummariesHandler } from "./commerce/storefrontCompanySummaries";
import { storefrontProductDetailHandler } from "./commerce/storefrontProductDetail";
import { storefrontProductsHandler } from "./commerce/storefrontProducts";
import { companyAccountSecurityHandler } from "./company/accountSecurity";
import { companyDocumentInboxCreatedHandler } from "./company/documentDelivery";
import { companyOrderDeliveryUpdateHandler } from "./company/orderDeliveryUpdate";
import { companyProductUpsertHandler } from "./company/productUpsert";
import { companyProductLifecycleHandler } from "./company/productLifecycle";
import { companySignupSubmitHandler } from "./company/signupSubmit";
import { companySignupReviewHandler } from "./company/signupReview";
import { inventoryReleaseHandler } from "./inventory/releaseInventory";
import { inventoryReserveHandler } from "./inventory/reserveInventory";
import {
  guestOrderLookupHandler,
  guestShopCartLookupHandler,
  guestShopCartSaveHandler,
  guestShopClaimHandler,
  guestShopProductDetailHandler,
  guestShopProductsHandler,
  guestShopLookupHandler,
} from "./guestShop/session";
import {
  sabangnetGoodsViewAPIHandler,
  sabangnetOrderListAPIHandler,
  sabangnetOrderStatusInfoAPIHandler,
  sabangnetSheetNoInfoAPIHandler,
} from "./integrations/sabangnet/handlers";
import {
  standardEventStatusUpdateHandler,
  standardEventsListHandler,
  standardOrderStatusUpdateHandler,
  standardOrdersListHandler,
  standardProductsListHandler,
  standardShipmentCreateHandler,
} from "./integrations/standard/handlers";
import { companyIntegrationEventRetryHandler } from "./integrations/companyAdmin/handlers";
import { integrationEventCreatedHandler } from "./integrations/core/webhookDelivery";
import { ordersCreateHandler } from "./orders/createOrderSnapshot";
import { tabletDeviceResolveHandler } from "./nursery/tabletDeviceResolve";
import { tabletNurseryLoginHandler } from "./nursery/tabletNurseryLogin";
import { paymentsCancelHandler } from "./payments/cancel";
import { paymentsConfirmHandler } from "./payments/confirm";
import { adminA5sPgCredentialSaveHandler, adminPgActivationHandler, adminPgConnectionTestHandler, adminPgCredentialListHandler, adminPgCredentialSaveHandler } from "./payments/adminPg";
import { adminProgramPartnerSaveHandler, adminProgramPgConnectionTestHandler, adminProgramPgReadHandler, adminProgramPgSaveHandler } from "./payments/programPg";
import { paymentsDiagnosticsHandler } from "./payments/diagnostics";
import { paymentsLogMonitorHandler } from "./payments/logMonitor";
import { paymentsReadyHandler } from "./payments/ready";
import { paymentsReturnTraceHandler } from "./payments/returnTrace";
import { paymentsPayupReturnHandler } from "./payments/payupReturn";
import { paymentsStartInnopaySmsHandler } from "./payments/startInnopaySms";
import { paymentsStatusHandler } from "./payments/status";
import { paymentsSyncInnopaySmsHandler } from "./payments/syncInnopaySms";
import { paymentsInnopayVbankNotiHandler, paymentsStartInnopayVbankHandler } from "./payments/innopayVbank";
import {
  paymentsListInnopayTransactionsHandler,
  paymentsLookupInnopayTransactionHandler,
  paymentsQueryInnopayVbankHandler,
} from "./payments/innopayTransactions";
import { paymentsWebhookHandler } from "./payments/webhook";
import {
  qrCreateHandler,
  qrExpireHandler,
  qrLookupHandler,
  tabletPaymentCompletionReadHandler,
} from "./qr/validateQrSession";
import { A5WS_A5MALL_BRIDGE_SECRET, a5wsCatalogImportHandler } from "./a5ws/catalogImport";

const pgCredentialEncryptionKey = defineSecret("PG_CREDENTIAL_ENCRYPTION_KEY");
const payupApiKey = defineSecret("PAYUP_API_KEY");
const gmailSendAs = defineSecret("GMAIL_SEND_AS");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const emailVerificationSecret = defineSecret("A5_EMAIL_VERIFICATION_SECRET");

const paymentFunctionOptions = {
  region: "asia-northeast3",
  invoker: "public",
  cors: [
    /^http:\/\/localhost:\d+$/,
    /^https:\/\/.*\.pages\.dev$/,
    /^https:\/\/.*\.signage-ai-ads\.co\.kr$/,
    /^https:\/\/.*\.signage-ai-a5\.co\.kr$/,
    "https://pms.signage-ai-ads.co.kr",
    "https://signage-ai-a5.co.kr",
    "https://with-commerce.pages.dev",
    "https://a5-closed-mall.pages.dev",
  ],
  maxInstances: 10,
  secrets: [pgCredentialEncryptionKey, payupApiKey],
};

const publicCompanyFunctionOptions = {
  ...paymentFunctionOptions,
  secrets: [],
};

const companyAccountSecurityOptions = {
  ...publicCompanyFunctionOptions,
  secrets: [gmailSendAs, gmailAppPassword, emailVerificationSecret],
};

const a5wsCatalogImportOptions = {
  region: "asia-northeast3",
  invoker: "public",
  cors: false,
  maxInstances: 10,
  secrets: [A5WS_A5MALL_BRIDGE_SECRET],
};

const integrationFunctionOptions = {
  region: "asia-northeast3",
  maxInstances: 10,
};

const companyDocumentFunctionOptions = {
  region: "asia-northeast3",
  maxInstances: 5,
};

export const paymentsReady = onRequest(paymentFunctionOptions, paymentsReadyHandler);
export const a5wsCatalogImport = onRequest(a5wsCatalogImportOptions, a5wsCatalogImportHandler);
export const paymentsStartInnopaySms = onRequest(paymentFunctionOptions, paymentsStartInnopaySmsHandler);
export const paymentsSyncInnopaySms = onRequest(paymentFunctionOptions, paymentsSyncInnopaySmsHandler);
export const paymentsStartInnopayVbank = onRequest(paymentFunctionOptions, paymentsStartInnopayVbankHandler);
export const paymentsInnopayVbankNoti = onRequest(paymentFunctionOptions, paymentsInnopayVbankNotiHandler);
export const paymentsQueryInnopayVbank = onRequest(paymentFunctionOptions, paymentsQueryInnopayVbankHandler);
export const paymentsCancelInnopayVbank = onRequest(paymentFunctionOptions, paymentsCancelHandler);
export const paymentsListInnopayTransactions = onRequest(paymentFunctionOptions, paymentsListInnopayTransactionsHandler);
export const paymentsLookupInnopayTransaction = onRequest(paymentFunctionOptions, paymentsLookupInnopayTransactionHandler);
export const paymentsConfirm = onRequest(paymentFunctionOptions, paymentsConfirmHandler);
export const paymentsReturnTrace = onRequest(paymentFunctionOptions, paymentsReturnTraceHandler);
export const paymentsPayupReturn = onRequest({ ...paymentFunctionOptions, cors: false }, paymentsPayupReturnHandler);
export const paymentsDiagnostics = onRequest(paymentFunctionOptions, paymentsDiagnosticsHandler);
export const a5LinkageDiagnostics = onRequest(paymentFunctionOptions, a5LinkageDiagnosticsHandler);
export const paymentsLogMonitor = onRequest(paymentFunctionOptions, paymentsLogMonitorHandler);
export const paymentsWebhook = onRequest(paymentFunctionOptions, paymentsWebhookHandler);
export const paymentsCancel = onRequest(paymentFunctionOptions, paymentsCancelHandler);
export const paymentsStatus = onRequest(paymentFunctionOptions, paymentsStatusHandler);
export const adminPgCredentialSave = onRequest(paymentFunctionOptions, adminPgCredentialSaveHandler);
export const adminPgCredentialList = onRequest(paymentFunctionOptions, adminPgCredentialListHandler);
export const adminA5sPgCredentialSave = onRequest(paymentFunctionOptions, adminA5sPgCredentialSaveHandler);
export const adminProgramPgRead = onRequest(paymentFunctionOptions, adminProgramPgReadHandler);
export const adminProgramPgSave = onRequest(paymentFunctionOptions, adminProgramPgSaveHandler);
export const adminProgramPgConnectionTest = onRequest(paymentFunctionOptions, adminProgramPgConnectionTestHandler);
export const adminProgramPartnerSave = onRequest(paymentFunctionOptions, adminProgramPartnerSaveHandler);
export const adminPgConnectionTest = onRequest(paymentFunctionOptions, adminPgConnectionTestHandler);
export const adminPgActivation = onRequest(paymentFunctionOptions, adminPgActivationHandler);
export const authBootstrap = onRequest(paymentFunctionOptions, authBootstrapHandler);
export const companyBetaAuthToken = onRequest(paymentFunctionOptions, companyBetaAuthTokenHandler);
export const cmsUploadFile = onRequest(publicCompanyFunctionOptions, cmsUploadFileHandler);
export const adminCmsAssetUpload = onRequest(publicCompanyFunctionOptions, cmsUploadFileHandler);
export const commerceLiveRead = onRequest(paymentFunctionOptions, commerceLiveReadHandler);
export const companyAccountSecurity = onRequest(companyAccountSecurityOptions, companyAccountSecurityHandler);
export const companyProductUpsert = onRequest(paymentFunctionOptions, companyProductUpsertHandler);
export const companyProductLifecycle = onRequest(paymentFunctionOptions, companyProductLifecycleHandler);
export const companySignupSubmit = onRequest(publicCompanyFunctionOptions, companySignupSubmitHandler);
export const companySignupReview = onRequest(paymentFunctionOptions, companySignupReviewHandler);
export const adminProductReview = onRequest(paymentFunctionOptions, adminProductReviewHandler);
export const adminProductModeration = onRequest(paymentFunctionOptions, adminProductModerationHandler);
export const adminStorefrontSnapshotPublish = onRequest(paymentFunctionOptions, adminStorefrontSnapshotPublishHandler);
export const publishStorefrontSnapshot = onRequest(paymentFunctionOptions, adminStorefrontSnapshotPublishHandler);
export const storefrontCompanySummaries = onRequest(publicCompanyFunctionOptions, storefrontCompanySummariesHandler);
export const storefrontProductDetail = onRequest(publicCompanyFunctionOptions, storefrontProductDetailHandler);
export const storefrontProducts = onRequest(publicCompanyFunctionOptions, storefrontProductsHandler);
export const adminCancelRequestReview = onRequest(paymentFunctionOptions, adminCancelRequestReviewHandler);
export const adminA5sCustomerMonitor = onRequest(publicCompanyFunctionOptions, adminA5sCustomerMonitorHandler);
export const analyticsRecordVisit = onRequest(publicCompanyFunctionOptions, analyticsRecordVisitHandler);
export const analyticsSummary = onRequest(paymentFunctionOptions, analyticsSummaryHandler);
export const companyOrderDeliveryUpdate = onRequest(publicCompanyFunctionOptions, companyOrderDeliveryUpdateHandler);
export const ordersCreate = onRequest(paymentFunctionOptions, ordersCreateHandler);
export const tabletDeviceResolve = onRequest(paymentFunctionOptions, tabletDeviceResolveHandler);
export const tabletNurseryLogin = onRequest(paymentFunctionOptions, tabletNurseryLoginHandler);
export const qrCreate = onRequest(paymentFunctionOptions, qrCreateHandler);
export const qrLookup = onRequest(paymentFunctionOptions, qrLookupHandler);
export const qrExpire = onRequest(paymentFunctionOptions, qrExpireHandler);
export const tabletPaymentCompletionRead = onRequest(paymentFunctionOptions, tabletPaymentCompletionReadHandler);
export const guestShopClaim = onRequest(paymentFunctionOptions, guestShopClaimHandler);
export const guestShopLookup = onRequest(paymentFunctionOptions, guestShopLookupHandler);
export const guestShopCartSave = onRequest(paymentFunctionOptions, guestShopCartSaveHandler);
export const guestShopCartLookup = onRequest(paymentFunctionOptions, guestShopCartLookupHandler);
export const guestShopProducts = onRequest(paymentFunctionOptions, guestShopProductsHandler);
export const guestShopProductDetail = onRequest(paymentFunctionOptions, guestShopProductDetailHandler);
export const guestOrderLookup = onRequest(paymentFunctionOptions, guestOrderLookupHandler);
export const guestOrdersLookup = onRequest(paymentFunctionOptions, guestOrderLookupHandler);
export const inventoryReserve = onRequest(paymentFunctionOptions, inventoryReserveHandler);
export const inventoryRelease = onRequest(paymentFunctionOptions, inventoryReleaseHandler);
export const integrationStandardOrders = onRequest(integrationFunctionOptions, standardOrdersListHandler);
export const integrationStandardProducts = onRequest(integrationFunctionOptions, standardProductsListHandler);
export const integrationStandardShipments = onRequest(integrationFunctionOptions, standardShipmentCreateHandler);
export const integrationStandardOrderStatus = onRequest(integrationFunctionOptions, standardOrderStatusUpdateHandler);
export const integrationStandardEvents = onRequest(integrationFunctionOptions, standardEventsListHandler);
export const integrationStandardEventStatus = onRequest(integrationFunctionOptions, standardEventStatusUpdateHandler);
export const companyIntegrationEventRetry = onRequest(paymentFunctionOptions, companyIntegrationEventRetryHandler);
export const integrationEventDelivery = onDocumentCreated(
  {
    document: "integration_events/{eventId}",
    region: "asia-northeast3",
    maxInstances: 10,
  },
  integrationEventCreatedHandler,
);
export const sabangnetOrderListAPI = onRequest(integrationFunctionOptions, sabangnetOrderListAPIHandler);
export const sabangnetOrderStatusInfoAPI = onRequest(integrationFunctionOptions, sabangnetOrderStatusInfoAPIHandler);
export const sabangnetSheetNoInfoAPI = onRequest(integrationFunctionOptions, sabangnetSheetNoInfoAPIHandler);
export const sabangnetGoodsViewAPI = onRequest(integrationFunctionOptions, sabangnetGoodsViewAPIHandler);
export const a4RoomsSync = onRequest(paymentFunctionOptions, a4RoomsSyncHandler);
export const a4RoomsList = onRequest(paymentFunctionOptions, a4RoomsListHandler);
export const a4LocalRoomUpsert = onRequest(paymentFunctionOptions, a4LocalRoomUpsertHandler);
export const a4HandoffCreate = onRequest(paymentFunctionOptions, a4HandoffCreateHandler);
export const a4HandoffConsent = onRequest(paymentFunctionOptions, a4HandoffConsentHandler);
export const a4HandoffConsume = onRequest(paymentFunctionOptions, a4HandoffConsumeHandler);
export const a4NurseryAutoSignup = onRequest(paymentFunctionOptions, a4NurseryAutoSignupHandler);
export const a4NurseryBulkSignup = onRequest(paymentFunctionOptions, a4NurseryBulkSignupHandler);
export const companyDocumentInboxDelivery = onDocumentCreated(
  {
    document: "a1_company_document_inbox/{uploadId}",
    ...companyDocumentFunctionOptions,
  },
  companyDocumentInboxCreatedHandler,
);
