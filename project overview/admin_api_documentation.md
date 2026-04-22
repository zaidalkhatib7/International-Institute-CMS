# Admin API Documentation

## Wallet

### Debit User Wallet

- Method: `POST`
- Endpoint: `/api/admin/users/{userId}/wallet/debit`
- Auth: `Authorization: Bearer {admin_token}`
- Purpose: Debit a user's wallet balance from the admin CMS.

### Path Parameters

- `userId`: target user ID

### Request Body

The admin CMS forwards the request payload as-is so it can match the backend contract.

Example:

```json
{
  "amount": 100,
  "reason": "Manual admin adjustment"
}
```

### Response

Returns the backend response payload for the debit action.
