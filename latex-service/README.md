# LaTeX PDF Compile Service

Docker backend for compiling resume LaTeX into PDFs. Use this with the Vercel
Next.js app by setting `LATEX_SERVICE_URL`.

## Local Run

```bash
docker build -t resume-latex-service -f latex-service/Dockerfile .
docker run --rm -p 8080:8080 -e LATEX_SERVICE_TOKEN=change-me resume-latex-service
```

Health check:

```bash
curl http://localhost:8080/health
```

Compile endpoint:

```bash
POST /compile
Authorization: Bearer change-me
Content-Type: application/json

{ "latex": "\\documentclass{article}\\begin{document}Hello\\end{document}" }
```

## Vercel Environment Variables

Set these in the Vercel project:

```env
LATEX_SERVICE_URL=https://your-docker-service.example.com/compile
LATEX_SERVICE_TOKEN=change-me
```

`LATEX_SERVICE_TOKEN` must match the token configured on the Docker service. If
you omit the token on the Docker service, the endpoint is public.

## Deploy Targets

Use any host that supports Docker containers, such as Render, Railway, Fly.io,
Google Cloud Run, AWS ECS, or a VPS. Expose port `8080` and route HTTPS traffic
to it.
