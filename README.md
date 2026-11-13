# OpenVR

Primeira base do aplicativo OpenVR: interface responsiva em português, navegação entre Início/Apps/Aprender/Party/Ajustes, PWA instalável e cliente para salas multiplayer.

## Estrutura
- `index.html` — telas e navegação.
- `styles.css` — identidade visual responsiva.
- `app.js` — preferências locais e integração de Party (REST + WebSocket).
- `manifest.webmanifest` e `sw.js` — instalação PWA e cache básico.
- `icons/icon.svg` — ícone vetorial.

## Visualizar
Abra o repositório e use GitHub Pages (Settings → Pages → Deploy from a branch → `main` → `/(root)`). Depois aguarde a publicação e abra o endereço HTTPS no Chrome Android; use “Adicionar à tela inicial”.

## Party
O cliente usa por padrão a URL do servidor de desenvolvimento configurado no código. O servidor ainda precisa ser verificado/publicado; se estiver indisponível, a interface abre normalmente, mas criar e entrar em salas não funcionará. O cliente espera:
- `GET /health`
- `POST /api/party`
- `POST /api/party/:code/join`
- `GET /api/party/:code`
- `WS /ws?code=...&name=...`

## Próximas etapas
1. Publicar e testar a PWA.
2. Validar e corrigir o servidor Party.
3. Criar o app Android nativo com ARCore/OpenXR, CameraX e MediaPipe para rastreamento de mãos.
4. Integrar renderização 3D, gestos, áudio espacial e sincronização multiplayer no mundo VR.

**Importante:** esta é a primeira versão web/PWA, não um APK VR completo. Recursos de câmera, tracking de mãos e VR nativo ainda não estão implementados.