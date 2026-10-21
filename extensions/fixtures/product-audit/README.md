# Product Audit Log

A reference extension demonstrating the full extension contract. Not a
"hello world" — it deliberately exercises every part of the runtime.

## What it does

- Subscribes to `product.created` and `product.updated`
- Writes an audit row to its own `audit_log` table for every change
- Publishes `ext.product-audit.LOG_CHANGED` when a product's `sellingPrice`
  changes — but not to the user who made the change

## Contract surface exercised

| Surface | Usage |
|---|---|
| Hook subscriptions | `product.created`, `product.updated` |
| Context: user | `ctx.user.id` in the actor field of each audit row |
| Context: store | Implicitly via `ctx.store` (available, not read) |
| DB API | `ctx.extensions.db.insert` on a declared table |
| Notification API | `ctx.notifications.publish("LOG_CHANGED", ...)` |
| Notification excludeActor | Recipients: OWNER/MANAGER, excluding triggering actor |
| Capabilities | `db.read`, `db.write`, `notifications.publish`, `logs.write` |
| Logging | `ctx.log.info` for operational visibility |
| Translations | `en` + `ar` for the notification |

## Scope

`store` — installed by an OWNER or MANAGER of a store, affects that store.

## Why two hooks?

`product.created` has no `changes` field — the product didn't exist before.
`product.updated` carries `changes: { [field]: { previous, next } }`, only
for fields that actually changed. Handling both shapes verifies the payload
contract isn't broken in subtle ways.

## Why the notification is scoped to price changes

An audit row is written for *every* update. But the notification is only
sent when `sellingPrice` changed, because that's the operationally
interesting signal — a manager wants to know when a price changed, not
every time a description was edited. The extension author (you) decides
which changes are worth notifying; the platform provides the mechanism.

## Why `excludeActor: true`

The user who changed the price already knows they did it. Sending them a
notification about their own action is noise. `excludeActor: true` drops
them from the recipient list. The other OWNERs and MANAGERs still get the
alert.