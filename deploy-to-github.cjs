#!/usr/bin/env node
const simpleGit = require('simple-git').default;
const fs = require('fs');
const path = require('path');
const os = require('os');

async function main() {
  const repoUrl = 'https://github.com/Akadata10/nexus-voice-crm.git';
  const branch = 'main';
  const workDir = process.cwd();
  const tempDir = path.join(os.tmpdir(), 'nexus-push-' + Date.now());

  console.log('🚀 Deploy a GitHub\n');
  console.log(`📦 Repo: ${repoUrl}`);
  console.log(`🌿 Branch: ${branch}\n`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    
    const git = simpleGit(tempDir);
    
    // Clonar
    console.log('1️⃣  Clonando...');
    await git.clone(repoUrl);
    const clonedPath = path.join(tempDir, 'nexus-voice-crm');
    const gitCloned = simpleGit(clonedPath);

    // Configurar  
    console.log('2️⃣  Configurando git...');
    await gitCloned.addConfig('user.name', 'Deploy Bot');
    await gitCloned.addConfig('user.email', 'bot@nexus.local');

    // Copiar archivos
    console.log('3️⃣  Copiando archivos...');
    let fileCount = 0;

    function copyRec(src, dest, ignore = []) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      
      for (const file of fs.readdirSync(src, { withFileTypes: true })) {
        if (['node_modules', '.git', '.next', 'dist', 'build', 'out'].includes(file.name)) continue;
        
        const s = path.join(src, file.name);
        const d = path.join(dest, file.name);
        
        if (file.isDirectory()) {
          copyRec(s, d, ignore);
        } else {
          try {
            fs.copyFileSync(s, d);
            fileCount++;
          } catch (e) {}
        }
      }
    }

    copyRec(workDir, clonedPath);
    console.log(`✅ ${fileCount} archivos copiados`);

    // Commit & Push
    console.log('4️⃣  Preparando cambios...');
    await gitCloned.add('.');
    
    const status = await gitCloned.status();
    if (status.files.length > 0) {
      console.log(`✅ ${status.files.length} archivos modificados`);
      
      console.log('5️⃣  Creando commit...');
      await gitCloned.commit(`Deploy: ${new Date().toISOString()}`);
      
      console.log('6️⃣  Haciendo push...');
      await gitCloned.push();
      console.log('✅ Push completado');
    } else {
      console.log('ℹ️  Sin cambios');
    }

    console.log('\n🎉 ¡Éxito! https://github.com/Akadata10/nexus-voice-crm');

    // Limpiar
    fs.rmSync(tempDir, { recursive: true, force: true });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    process.exit(1);
  }
}

main();
