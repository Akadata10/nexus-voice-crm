#!/usr/bin/env node

/**
 * Deploy a GitHub usando SOLO la API REST
 * Sin necesidad de Git binario
 */

const fs = require('fs');
const path = require('path');

async function deploy() {
  const token = process.env.GITHUB_TOKEN;
  const owner = 'Akadata10';
  const repo = 'nexus-voice-crm';
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;

  if (!token) {
    console.error('❌ GITHUB_TOKEN no está configurado\n');
    console.error('Configura: $env:GITHUB_TOKEN = "tu_token"');
    process.exit(1);
  }

  console.log('🚀 Deploy a GitHub (API REST)\n');
  console.log(`📦 ${owner}/${repo}`);
  console.log(`🔐 Token: ${token.substring(0, 20)}...\n`);

  try {
    // Obtener HEAD reference
    console.log('1️⃣  Obteniendo información del repositorio...');
    let headRes = await fetch(`${repoUrl}/git/refs/heads/main`, {
      headers: { 'Authorization': `token ${token}` }
    });

    let headRef;
    if (headRes.status === 404) {
      console.log('ℹ️  Rama main no existe, creando...');
      headRef = { object: { sha: null } };
    } else if (headRes.ok) {
      headRef = await headRes.json();
      console.log(`✅ Rama: main`);
    } else {
      throw new Error(`${headRes.status}: ${headRes.statusText}`);
    }

    const baseSha = headRef.object?.sha;
    const isNewRepo = !baseSha;

    // Escanear archivos
    console.log('\n2️⃣  Escaneando archivos...');
    const files = [];

    function scan(dir, prefix = '') {
      const ignore = ['node_modules', '.git', 'dist', 'build', '.next', 'out', 'bun_modules'];
      
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ignore.includes(item.name)) continue;

        const fullPath = path.join(dir, item.name);
        const relPath = prefix ? `${prefix}/${item.name}` : item.name;

        if (item.isDirectory()) {
          scan(fullPath, relPath);
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            files.push({ path: relPath.replace(/\\/g, '/'), content });
          } catch (e) {}
        }
      }
    }

    scan(process.cwd());
    console.log(`✅ ${files.length} archivos encontrados`);

    // Crear blobs
    console.log('\n3️⃣  Subiendo archivos a GitHub...');
    const blobs = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const blobRes = await fetch(`${repoUrl}/git/blobs`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: file.content,
          encoding: 'utf-8'
        })
      });

      if (blobRes.ok) {
        const blob = await blobRes.json();
        blobs[file.path] = blob.sha;
        if ((i + 1) % 20 === 0) console.log(`  ⏳ ${i + 1}/${files.length}`);
      } else {
        console.error(`  ❌ ${file.path}: ${blobRes.status}`);
      }
    }

    console.log(`✅ ${Object.keys(blobs).length} archivos subidos`);

    if (Object.keys(blobs).length === 0) {
      throw new Error('No se pudieron subir los archivos');
    }

    // Crear tree
    console.log('\n4️⃣  Creando árbol...');
    const tree = Object.entries(blobs).map(([path, sha]) => ({
      path,
      mode: '100644',
      type: 'blob',
      sha
    }));

    const treeRes = await fetch(`${repoUrl}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tree,
        base_tree: baseSha
      })
    });

    if (!treeRes.ok) {
      throw new Error(`Error creando tree: ${treeRes.status}`);
    }

    const treeObj = await treeRes.json();
    console.log(`✅ Tree creado`);

    // Crear commit
    console.log('\n5️⃣  Creando commit...');
    const commitRes = await fetch(`${repoUrl}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Deploy: Nexus Voice CRM actualizadodesde ambiente local - ${new Date().toISOString()}`,
        tree: treeObj.sha,
        parents: baseSha ? [baseSha] : [],
        author: {
          name: 'Deploy Bot',
          email: 'bot@nexus.local',
          date: new Date().toISOString()
        }
      })
    });

    if (!commitRes.ok) {
      throw new Error(`Error creando commit: ${commitRes.status}`);
    }

    const commit = await commitRes.json();
    console.log(`✅ Commit creado: ${commit.sha.substring(0, 8)}`);

    // Actualizar referencia
    console.log('\n6️⃣  Actualizando rama...');

    if (isNewRepo) {
      // Crear rama nueva
      const refRes = await fetch(`${repoUrl}/git/refs`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'refs/heads/main',
          sha: commit.sha
        })
      });

      if (!refRes.ok) {
        throw new Error(`Error creando rama: ${refRes.status}`);
      }
    } else {
      // Actualizar rama existente
      const updateRes = await fetch(`${repoUrl}/git/refs/heads/main`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: commit.sha
        })
      });

      if (!updateRes.ok) {
        throw new Error(`Error actualizando rama: ${updateRes.status}`);
      }
    }

    console.log(`✅ Rama actualizada`);

    console.log(`\n🎉 ¡Deploy completado exitosamente!\n`);
    console.log(`📍 https://github.com/${owner}/${repo}`);
    console.log(`📦 ${files.length} archivos`);
    console.log(`💾 Commit: ${commit.sha.substring(0, 8)}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

deploy();
