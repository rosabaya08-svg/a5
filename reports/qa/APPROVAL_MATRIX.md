# Human Approval Matrix

## Purpose

This matrix classifies human approval needs by priority for batch 48.

| Priority | Approval Item | Why It Matters | Suggested Owner |
| --- | --- | --- | --- |
| High | Firebase project/dev-prod split | Determines real backend boundary and data safety. | Tech lead |
| High | Firestore schema and Rules | Prevents tenant/customer data leakage. | Tech lead + security |
| High | Auth custom claims model | Controls admin/company/nursery/tablet access. | Tech lead |
| High | PG provider and refund policy | Affects real payment and refund liability. | Business + tech lead |
| High | Secret Manager and credential handling | Prevents credential leakage. | Tech lead |
| High | Production deployment approval | Prevents accidental operation launch. | Business owner |
| Medium | Storage Blaze decision | Enables media upload but changes billing/security scope. | Business + tech lead |
| Medium | AlimTalk provider/templates | Affects customer communication policy. | Business |
| Medium | Delivery lookup provider | Affects external API dependency. | Operations |
| Medium | External inventory provider | Affects stock accuracy and conflict handling. | Operations + company owner |
| Low | UI copy polish | Improves review quality but does not block mock beta. | Product |
| Low | Additional responsive breakpoints | Improves device coverage. | QA |

