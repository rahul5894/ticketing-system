# User Search API Testing

## Endpoint
`GET /api/users/search`

## Query Parameters
- `q` (string): Search query for email, first_name, or last_name
- `role` (string, optional): Filter by specific role ('user', 'agent', 'admin', 'super_admin')
- `limit` (number, optional): Maximum number of results (default: 10, max: 50)

## Example Requests

### Search all users
```
GET /api/users/search?q=john
```

### Search only agents
```
GET /api/users/search?q=john&role=agent
```

### Search with limit
```
GET /api/users/search?q=john&limit=5
```

## Response Format
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "role": "agent",
      "status": "active"
    }
  ],
  "total": 1,
  "query": "john",
  "role": "agent"
}
```

## Security Features
- Requires authentication (Clerk JWT)
- Tenant isolation (only returns users from current tenant)
- Only returns active users
- Rate limiting through query limit parameter

## Testing Steps
1. Ensure you're authenticated and on a tenant subdomain
2. Make requests to the endpoint with different parameters
3. Verify tenant isolation by checking that only users from your tenant are returned
4. Test role filtering functionality
5. Verify search functionality across email, first_name, and last_name fields
