#!/usr/bin/env node

/**
 * Script alternativo usando GitHub API /repos/{owner}/{repo}/contents
 * Más directo para escribir archivos
 */

const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function uploadToGithub() {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Akadata10/nexus-crm-ai';
  const branch = 'main';
  
  if (!token) {
    console.error('❌ GITHUB_TOKEN no configurado');
    process.exit(1);
  }

  console.log('📦 Upload alternativo a GitHub...\n');

  try {
    // Obtener lista de archivos del repo
    console.log('1️⃣  Obteniendo estado actual del repositorio...');
    const repoFiles = new Map();
    
    async function getRemoteFiles(path = '', page = 1) {
      const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}&per_page=100&page=${page}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status === 404) return;
      if (!response.ok) return;

      const data = await response.json();
      if (!Array.isArray(data)) return;

      for (const item of data) {
        if (item.type === 'file') {
          repoFiles.set(item.path, item.sha);
        } else if (item.type === 'dir') {
          await getRemoteFiles(item.path, 1);
        }
      }
    }

    await getRemoteFiles();
    console.log(`✅ ${repoFiles.size} archivos encontrados en repositorio`);

    // Escanear archivos locales
    console.log('\n2️⃣  Escaneando archivos locales...');
    const localFiles = [];
    
    function scanDir(dir, prefix = '') {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
        
        if (['node_modules', '.git', 'dist', 'build', '.next', 'out', 'bun_modules'].includes(item.name)) {
          continue;
        }
        
        if (item.isDirectory()) {
          scanDir(fullPath, relativePath);
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            localFiles.push({
              path: relativePath.replace(/\\/g, '/'),
              content: content,
              sha: null
            });
          } catch (e) {
            // Omitir binarios
          }
        }
      }
    }

    scanDir(process.cwd());
    console.log(`✅ ${localFiles.length} archivos locales`);

    // Subir/actualizar archivos
    console.log('\n3️⃣  Sincronizando archivos...');
    let uploaded = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < localFiles.length; i++) {
      const file = localFiles[i];
      const remoteHash = Array.from(repoFiles.keys()).find(k => k === file.path);
      
      // Crear commit para cada archivo
      const message = remoteHash ? `Update ${file.path}` : `Add ${file.path}`;
      const body = {
        message: message,
        content: Buffer.from(file.content).toString('base64'),
        branch: branch,
        committer: {
          name: 'Deploy Bot',
          email: 'deploy@nexus-crm.local'
        }
      };

      if (remoteHash) {
        body.sha = repoFiles.get(file.path);
      }

      const url = `https://api.github.com/repos/${repo}/contents/${file.path}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        remoteHash ? updated++ : uploaded++;
        if ((i + 1) % 10 === 0) {
          console.log(`  ⏳ ${i + 1}/${localFiles.length}`);
        }
      } else {
        const err = await response.text();
        console.log(`❌ ${file.path}: ${response.status}`);
        skipped++;
      }

      // Rate limit
      await sleep(200);
    }

    console.log(`\n✅ Nuevos: ${uploaded}`);
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`⚠️  Omitidos: ${skipped}`);
    console.log(`\n🎉 ¡Sincronización completada!`);
    console.log(`📍 https://github.com/${repo}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

uploadToGithub();
