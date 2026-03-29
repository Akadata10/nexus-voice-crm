#!/usr/bin/env node

/**
 * Script para hacer push del código a GitHub
 * Versión mejorada que maneja el árbol correctamente
 */

const fs = require('fs');
const path = require('path');

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  return response.json();
}

async function pushToGithub() {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Akadata10/nexus-crm-ai';
  const branch = 'main';
  
  if (!token) {
    console.error('❌ ERROR: GITHUB_TOKEN no está configurado');
    process.exit(1);
  }

  console.log('📦 Preparando push a GitHub...');
  console.log(`📍 ${repo} | 🌿 ${branch}\n`);

  try {
    // Obtener info de la rama
    console.log('1️⃣  Obteniendo información de la rama...');
    const ref = await makeRequest(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`);
    const currentCommitSha = ref.object.sha;
    const currentCommit = await makeRequest(`https://api.github.com/repos/${repo}/git/commits/${currentCommitSha}`);
    const baseTreeSha = currentCommit.tree.sha;
    
    console.log(`✅ Commit actual: ${currentCommitSha.substring(0, 7)}`);

    // Escanear archivos
    console.log('\n2️⃣  Escaneando archivos...');
    const files = [];
    
    function scanDir(dir, prefix = '') {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
        
        if (['node_modules', '.git', 'dist', 'build', '.next', 'out', 'bun_modules', '.turbo'].includes(item.name)) {
          continue;
        }
        
        if (item.isDirectory()) {
          scanDir(fullPath, relativePath);
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            files.push({
              path: relativePath.replace(/\\/g, '/'),
              content: content
            });
          } catch (e) {
            // Omitir archivos binarios
          }
        }
      }
    }

    scanDir(process.cwd());
    console.log(`✅ ${files.length} archivos encontrados`);

    // Crear blobs
    console.log('\n3️⃣  Creando blobs...');
    const blobShas = {};
    let success = 0;
    
    for (let i = 0; i < files.length; i++) {
      try {
        const blob = await makeRequest(`https://api.github.com/repos/${repo}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({
            content: files[i].content,
            encoding: 'utf-8'
          })
        });
        blobShas[files[i].path] = blob.sha;
        success++;
      } catch (e) {
        console.log(`⚠️  ${files[i].path}: ${e.message.split(':')[0]}`);
      }
      
      if ((i + 1) % 25 === 0) {
        console.log(`  ⏳ ${i + 1}/${files.length}`);
      }
    }
    
    console.log(`✅ ${success} blobs creados`);

    if (success === 0) {
      throw new Error('No se crearon blobs. Verifica los permisos del token.');
    }

    // Construir árbol
    console.log('\n4️⃣  Creando árbol...');
    const treeData = Object.entries(blobShas).map(([path, sha]) => ({
      path,
      mode: '100644',
      type: 'blob',
      sha
    }));

    const tree = await makeRequest(`https://api.github.com/repos/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        tree: treeData
      })
    });
    
    console.log(`✅ Árbol creado: ${tree.sha.substring(0, 7)}`);

    // Crear commit
    console.log('\n5️⃣  Creando commit...');
    const commit = await makeRequest(`https://api.github.com/repos/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Deploy: Nexus Voice CRM - Actualizado desde ambiente local',
        tree: tree.sha,
        parents: [currentCommitSha],
        author: {
          name: 'Deploy Bot',
          email: 'deploy@nexus-crm.local',
          date: new Date().toISOString()
        }
      })
    });
    
    console.log(`✅ Commit: ${commit.sha.substring(0, 7)}`);

    // Actualizar ref
    console.log('\n6️⃣  Actualizando rama...');
    await makeRequest(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: commit.sha,
        force: false
      })
    });

    console.log(`✅ Rama actualizada\n`);
    console.log(`🎉 ¡Push completado!`);
    console.log(`📍 https://github.com/${repo}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

pushToGithub();
