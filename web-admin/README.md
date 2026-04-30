# web-admin

Vue 3 + Vite version of the Mail Code admin UI.

## Development

Create a local env file when the backend API is not running on `127.0.0.1:3002`:

```sh
cp .env.example .env.local
```

Then update `VITE_API_PROXY_TARGET`.

```sh
npm install
npm run dev -- --host 0.0.0.0
```

The dev server proxies `/api` and `/socket.io` to the backend target.
