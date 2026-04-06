# Architecture Overview

This document describes the system architecture for the **Payments Platform**.

---

## Components

The platform consists of three primary services: the API Gateway, the Payment Processor,
and the Notification Service.

| Component            | Language | Owner         |
| -------------------- | -------- | ------------- |
| API Gateway          | Node.js  | Platform team |
| Payment Processor    | Go       | Payments team |
| Notification Service | Python   | Comms team    |

---

## Request Flow

The following diagram shows how a payment request moves through the system.

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Processor as Payment Processor
    participant DB as Database
    participant Notify as Notification Service

    Client->>Gateway: POST /payments
    Gateway->>Gateway: Validate auth token
    Gateway->>Processor: Forward request
    Processor->>DB: Write transaction record
    DB-->>Processor: Confirm write
    Processor->>Notify: Emit payment.created event
    Notify-->>Client: Send confirmation email
    Processor-->>Gateway: 200 OK
    Gateway-->>Client: Return payment ID
```

---

## Service Dependencies

```mermaid
graph TD
    A[API Gateway] --> B[Payment Processor]
    A --> C[Auth Service]
    B --> D[(Database)]
    B --> E[Notification Service]
    B --> F[Fraud Detection]
    F --> D
    E --> G[Email Provider]
    E --> H[SMS Provider]
```

---

## Deployment Pipeline

```mermaid
flowchart LR
    Dev[Developer Push] --> CI[CI Build & Test]
    CI -->|Pass| Staging[Deploy to Staging]
    CI -->|Fail| Notify[Notify Developer]
    Staging --> QA[QA Sign-off]
    QA -->|Approved| Prod[Deploy to Production]
    QA -->|Rejected| Dev
```

---

## Code Example

The Gateway forwards requests using a simple retry wrapper:

```
func forwardWithRetry(req *PaymentRequest, maxRetries int) (*PaymentResponse, error) {
    for i := 0; i < maxRetries; i++ {
        resp, err := processorClient.Send(req)
        if err == nil {
            return resp, nil
        }
        time.Sleep(backoff(i))
    }
    return nil, ErrMaxRetriesExceeded
}
```

## Notes

- All inter-service communication uses **mTLS**
- The database is write-ahead logged with a **30-day retention** window
- Fraud Detection runs asynchronously and does **not** block the payment response
