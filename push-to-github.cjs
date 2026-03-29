#!/usr/bin/env node

/**
 * Script para hacer push del código a GitHub usando la API REST
 * Requiere: GITHUB_TOKEN en variables de entorno
 */

const fs = require('fs');
const path = require('path');

async function pushToGithub() {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Akadata10/nexus-crm-ai';
  const branch = 'main';
  
  if (!token) {
    console.error('ERROR: GITHUB_TOKEN no está configurado');
    console.error('Configura: $env:GITHUB_TOKEN = "tu_token_aqui"');
    process.exit(1);
  }

  console.log('📦 Preparando archivos para enviar a GitHub...');
  console.log(`📍 Repositorio: ${repo}`);
  console.log(`🌿 Rama: ${branch}\n`);

  try {
    // Obtener el SHA del último commit
    console.log('1️⃣  Obteniendo información de la rama...');
    const refResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/refs/heads/${branch}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!refResponse.ok) {
      throw new Error(`Error obteniendo ref: ${refResponse.statusText}`);
    }

    const refData = await refResponse.json();
    const baseTreeSha = refData.object.sha;
    console.log(`✅ SHA del commit base: ${baseTreeSha.substring(0, 7)}`);

    // Construir árbol de archivos
    console.log('\n2️⃣  Escaneando archivos del proyecto...');
    const treeItems = [];
    const projectRoot = process.cwd();
    
    function scanDirectory(dir, baseDir = '') {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.join(baseDir, file.name);
        
        // Ignorar directorios y archivos comunes
        if (['node_modules', '.git', 'dist', 'build', '.next', 'out', 'bun_modules', '.turbo'].includes(file.name)) {
          continue;
        }
        
        if (file.isDirectory()) {
          scanDirectory(fullPath, relativePath);
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            treeItems.push({
              path: relativePath.replace(/\\/g, '/'),
              mode: '100644',
              type: 'blob',
              content: content
            });
          } catch (e) {
            console.log(`⚠️  Omitiendo archivo binario: ${relativePath}`);
          }
        }
      }
    }

    scanDirectory(projectRoot);
    console.log(`✅ Archivos encontrados: ${treeItems.length}`);

    // Crear blobs para cada archivo
    console.log('\n3️⃣  Creando blobs en GitHub...');
    const blobShas = {};
    
    for (let i = 0; i < treeItems.length; i++) {
      const item = treeItems[i];
      const blobResponse = await fetch(
        `https://api.github.com/repos/${repo}/git/blobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: item.content,
            encoding: 'utf-8'
          })
        }
      );

      if (!blobResponse.ok) {
        console.warn(`⚠️  Error creando blob para ${item.path}: ${blobResponse.statusText}`);
        continue;
      }

      const blobData = await blobResponse.json();
      blobShas[item.path] = blobData.sha;
      
      if ((i + 1) % 10 === 0) {
        console.log(`  ⏳ Procesados: ${i + 1}/${treeItems.length}`);
      }
    }
    console.log(`✅ Blobs creados: ${Object.keys(blobShas).length}`);

    // Crear tree
    console.log('\n4️⃣  Creando árbol en GitHub...');
    const treeData = treeItems
      .filter(item => blobShas[item.path])
      .map(item => ({
        path: item.path,
        mode: item.mode,
        type: item.type,
        sha: blobShas[item.path]
      }));

    const treeResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tree: treeData,
          base_tree: baseTreeSha
        })
      }
    );

    if (!treeResponse.ok) {
      throw new Error(`Error creando tree: ${treeResponse.statusText}`);
    }

    const tree = await treeResponse.json();
    console.log(`✅ Tree creado: ${tree.sha.substring(0, 7)}`);

    // Crear commit
    console.log('\n5️⃣  Creando commit...');
    const commitResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Deploy: Actualizar código del proyecto Nexus Voice CRM desde ambiente local',
          tree: tree.sha,
          parents: [baseTreeSha],
          author: {
            name: 'Nexus Deploy Bot',
            email: 'deploy@nexus-crm.local',
            date: new Date().toISOString()
          }
        })
      }
    );

    if (!commitResponse.ok) {
      throw new Error(`Error creando commit: ${commitResponse.statusText}`);
    }

    const commit = await commitResponse.json();
    console.log(`✅ Commit creado: ${commit.sha.substring(0, 7)}`);

    // Actualizar referencia
    console.log('\n6️⃣  Actualizando rama...');
    const updateResponse = await fetch(
      `https://api.github.com/repos/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: commit.sha,
          force: false
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Error actualizando rama: ${updateResponse.statusText}`);
    }

    console.log(`✅ Rama actualizada\n`);
    console.log('🎉 ¡Push completado exitosamente!');
    console.log(`📍 Repositorio: https://github.com/${repo}`);
    console.log(`🌿 Rama: ${branch}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
pushToGithub();
