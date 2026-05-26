"use client";

const orderOpenApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "A5 Order Real-time Integration API",
    version: "1.0.0",
    description: "External company systems can read A5 order details and return shipment updates.",
  },
  servers: [{ url: "https://api.a5-closed-mall.com", description: "Production API gateway" }],
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/api/v1/orders": {
      get: {
        summary: "List orders",
        description: "Read orders for the authenticated company scope.",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", maximum: 100, default: 50 } },
        ],
        responses: {
          "200": {
            description: "Paged order list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/OrderSummary" } },
                    nextCursor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/v1/orders/{orderId}": {
      get: {
        summary: "Get order detail",
        description: "Read one order with items, receiver, payment, shipment, and source QR context.",
        parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Order detail",
            content: { "application/json": { schema: { $ref: "#/components/schemas/OrderDetail" } } },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/v1/orders/{orderId}/confirm": {
      post: {
        summary: "Confirm order",
        description: "Mark an order as confirmed before shipment work starts.",
        parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Confirmed" },
          "409": { description: "Order cannot be confirmed in the current status" },
        },
      },
    },
    "/api/v1/orders/{orderId}/shipments": {
      post: {
        summary: "Create shipment",
        description: "Return carrier and invoice number to A5.",
        parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["carrierCode", "invoiceNumber"],
                properties: {
                  carrierCode: { type: "string", example: "CJ대한통운" },
                  invoiceNumber: { type: "string", example: "123456789012" },
                  shippedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Shipment saved" },
          "409": { description: "Duplicate invoice or invalid order status" },
        },
      },
    },
    "/api/v1/webhooks/test": {
      post: {
        summary: "Send webhook test event",
        description: "Send a test payload to the registered company webhook endpoint.",
        responses: { "200": { description: "Test event queued" } },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-A5-API-Key",
      },
    },
    schemas: {
      OrderSummary: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          orderNo: { type: "string", example: "A5-20260519-001" },
          status: { type: "string", example: "PAYMENT_COMPLETED" },
          totalAmount: { type: "integer", example: 127000 },
          orderedAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      OrderDetail: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          orderNo: { type: "string" },
          companyId: { type: "string" },
          nurseryId: { type: "string" },
          roomId: { type: "string" },
          tabletId: { type: "string" },
          status: { type: "string" },
          paymentStatus: { type: "string" },
          deliveryMethod: { type: "string", enum: ["delivery", "pickup"] },
          guestOrderUrl: { type: "string" },
          shareMessage: { type: "string" },
          tabletSafeSummary: { $ref: "#/components/schemas/TabletSafeSummary" },
          receiver: { $ref: "#/components/schemas/Receiver" },
          items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
          shipment: { $ref: "#/components/schemas/Shipment" },
          totalAmount: { type: "integer" },
        },
      },
      Receiver: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          postalCode: { type: "string" },
          address: { type: "string" },
          addressDetail: { type: "string" },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          orderItemId: { type: "string" },
          productId: { type: "string" },
          sku: { type: "string" },
          productName: { type: "string" },
          optionName: { type: "string" },
          quantity: { type: "integer" },
          unitPrice: { type: "integer" },
          externalProductCode: { type: "string" },
        },
      },
      TabletSafeSummary: {
        type: "object",
        description: "태블릿 날짜별 주문 완료 내역에 표시할 개인정보 제외 요약입니다.",
        properties: {
          orderNo: { type: "string" },
          status: { type: "string", example: "paid" },
          completedAt: { type: "string", format: "date-time" },
          completedDate: { type: "string", example: "2026-05-27" },
          totalAmount: { type: "integer" },
          itemCount: { type: "integer" },
        },
      },
      Shipment: {
        type: "object",
        nullable: true,
        properties: {
          carrierCode: { type: "string" },
          invoiceNumber: { type: "string" },
          shippedAt: { type: "string", format: "date-time" },
        },
      },
    },
    responses: {
      Unauthorized: { description: "Invalid API key or missing scope" },
      NotFound: { description: "Order not found in this company scope" },
      RateLimited: { description: "Too many requests" },
    },
  },
};

const orderApiGuide = `# A5 주문내역 상세 실시간 연동 API

## 목적
기업 ERP, WMS, 사방넷, 물류사 시스템이 A5 주문내역 상세를 가져가고 송장번호를 A5로 회신하기 위한 공개 API 연동 문서입니다.

## 인증
- Header: X-A5-API-Key
- 기업별 API Key는 최고관리자에서 발급합니다.
- 권한 범위는 order:read, order:confirm, shipment:write, webhook:test 로 분리합니다.
- 운영 적용 시 IP 화이트리스트와 호출량 제한을 함께 설정합니다.

## 핵심 API
| Method | Path | 용도 |
| --- | --- | --- |
| GET | /api/v1/orders | 기업 범위 주문 목록 조회 |
| GET | /api/v1/orders/{orderId} | 주문 상세, 상품, 수령자, QR 출처 조회 |
| POST | /api/v1/orders/{orderId}/confirm | 기업 시스템 주문 확인 회신 |
| POST | /api/v1/orders/{orderId}/shipments | 송장번호 회신 |
| POST | /api/v1/webhooks/test | Webhook 수신 테스트 |

## 주문 상태
- PAYMENT_COMPLETED
- ORDER_CONFIRMED
- READY_TO_SHIP
- SHIPPED
- DELIVERED
- CANCEL_REQUESTED
- CANCELED
- RETURN_REQUESTED
- RETURNED
- EXCHANGE_REQUESTED

## 주문 상세 응답 예시
\`\`\`json
{
  "orderId": "order-001",
  "orderNo": "A5-20260519-001",
  "companyId": "company-test-1004",
  "nurseryId": "nursery-test-1004",
  "roomId": "room-701",
  "tabletId": "tablet-701-a",
  "status": "PAYMENT_COMPLETED",
  "paymentStatus": "APPROVED",
  "deliveryMethod": "pickup",
  "guestOrderUrl": "https://a5-closed-mall.pages.dev/orders/guest/live?orderNo=A5-20260519-001",
  "shareMessage": "주문내역 확인: A5-20260519-001",
  "tabletSafeSummary": {
    "orderNo": "A5-20260519-001",
    "status": "paid",
    "completedAt": "2026-05-19T05:10:00.000Z",
    "completedDate": "2026-05-19",
    "totalAmount": 127000,
    "itemCount": 1
  },
  "receiver": {
    "name": "김*영",
    "phone": "010-****-2388",
    "postalCode": "",
    "address": "조리원 현장수령",
    "addressDetail": "701호"
  },
  "items": [
    {
      "orderItemId": "order-item-001",
      "productId": "product-care-kit",
      "sku": "CARE-KIT-BASIC",
      "productName": "산모 회복 케어 키트",
      "optionName": "기본 구성",
      "quantity": 1,
      "unitPrice": 69000,
      "externalProductCode": "TEST-CARE-001"
    }
  ],
  "totalAmount": 127000
}
\`\`\`

## Webhook
A5가 주문 생성, 결제 완료, 주문 취소, 송장 등록 이벤트를 기업 webhook URL로 전송할 수 있습니다.

Header:
- X-A5-Event: order.payment_completed
- X-A5-Signature: HMAC-SHA256 signature
- X-A5-Timestamp: Unix timestamp

## 고객/태블릿 공유 데이터
- guestOrderUrl: 고객이 카카오톡 등으로 주문내역을 다시 열 수 있는 주문 확인 URL입니다.
- shareMessage: 고객 공유 메시지 기본 문구입니다.
- tabletSafeSummary: 객실 태블릿에는 주문 완료 여부, 주문번호, 완료 시간, 금액, 수량만 표시합니다.
- 태블릿 화면에는 고객 성명, 연락처, 주소, 상품명, 옵션명을 제공하지 않습니다.

## 운영 전 필수 확인
1. 기업 API Key 발급
2. IP 화이트리스트 등록
3. 권한 범위 설정
4. Webhook Secret 발급
5. 주문 중복 방지 키 확인: companyId + orderId + orderItemId
6. 송장 중복 등록 방지
`;

const documents = [
  {
    title: "OpenAPI JSON",
    description: "기업 개발자가 Postman, Swagger, ERP/WMS 연동 프로그램에 바로 넣을 수 있는 표준 스펙입니다.",
    filename: "a5-order-real-time-api-openapi-v1.json",
    mimeType: "application/json",
    content: JSON.stringify(orderOpenApiSpec, null, 2),
  },
  {
    title: "연동 가이드 Markdown",
    description: "API 인증, 주문 상세 조회, 송장 회신, Webhook, 운영 체크리스트를 설명한 공유 문서입니다.",
    filename: "a5-order-real-time-api-guide-v1.md",
    mimeType: "text/markdown",
    content: orderApiGuide,
  },
];

function downloadFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function A5PublicApiDocsPanel() {
  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">A5 Public API</p>
        <h2 className="mt-1 text-xl font-black">주문내역 상세 실시간 연동 API 공유 문서</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6">
          기업이 본인 ERP, WMS, 사방넷, 물류 연동 프로그램에서 A5 주문 상세를 가져가고 송장번호를 회신할 수 있도록 제공하는 개발자 공유 문서입니다.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {documents.map((document) => (
          <article key={document.filename} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{document.filename}</p>
            <h3 className="mt-2 text-lg font-black text-slate-950">{document.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{document.description}</p>
            <button
              type="button"
              onClick={() => downloadFile(document.filename, document.mimeType, document.content)}
              className="mt-4 rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white"
            >
              문서 내려받기
            </button>
          </article>
        ))}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">기업 전달 전 확인 항목</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["API Key", "기업별 접근키 발급 후 전달"],
            ["권한 범위", "order:read, shipment:write 분리"],
            ["IP 제한", "기업 서버 IP 화이트리스트 등록"],
            ["Webhook Secret", "위변조 방지용 서명키 발급"],
            ["중복 방지", "companyId + orderId + orderItemId 기준"],
            ["송장 회신", "택배사 코드와 송장번호 검증"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-black text-blue-700">{label}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
