# Grill Me

A one-page web app that runs Matt Pocock's Grilling Me skill as a simple chat product.

Users describe a plan, then the app asks one sharp question at a time with a recommended answer. When the user ends the session, it produces a structured conclusion.

## Local Development

```bash
npm run dev
```

Required environment variables:

```bash
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.cloudalpha.top
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=low
```
