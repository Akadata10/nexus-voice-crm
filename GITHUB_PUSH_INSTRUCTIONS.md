# 📚 Guía para Hacer Push del Proyecto Nexus CRM a GitHub

## Paso 1: Obtener tu Token de GitHub

1. Ve a https://github.com/settings/tokens
2. Haz clic en "Generate new token" → "Generate new token (classic)"
3. Nombre: `nexus-crm-deploy`
4. Permisos necesarios:
   - ✅ `repo` (acceso completo a repositorios privados y públicos)
   - ✅ `admin:repo_hook`
5. Copiar el token generado
6. **Guarda el token en un lugar seguro** (solo aparecerá una vez)

## Paso 2: Configurar el Token en tu Sistema

Abre PowerShell y ejecuta:

```powershell
$env:GITHUB_TOKEN = "tu_token_aqui"
```

O para hacerlo permanente (usar en cualquier sesión):

```powershell
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "tu_token_aqui", "User")
```

## Paso 3: Ejecutar el Script de Push

Desde la carpeta del proyecto:

```powershell
cd "c:\Users\Usuario\.gemini\antigravity\scratch\nexus-voice-crm-unzipped\nexus-voice-crm-main"
node push-to-github.js
```

## Lo que Hace el Script

1. ✅ Limpia y reorganiza tu repositorio en GitHub
2. ✅ Sube TODOS los archivos locales (excepto node_modules, .git, dist)
3. ✅ Crea un nuevo commit con los cambios
4. ✅ Actualiza la rama `main`

## Resultado Final

Tu código estará en: https://github.com/Akadata10/nexus-crm-ai

---

📌 **Nota**: Si el repositorio no existe, créalo primero en GitHub.com

